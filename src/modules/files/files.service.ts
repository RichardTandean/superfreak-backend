import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { R2Service } from '../../shared/r2.service'
import { TempFile, TempFileDocument } from './schemas/temp-file.schema'
import { UserFile, UserFileDocument } from './schemas/user-file.schema'
import { Order, OrderDocument } from '../orders/schemas/order.schema'

const TEMP_EXPIRY_HOURS = 24
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(TempFile.name) private readonly tempFileModel: Model<TempFileDocument>,
    @InjectModel(UserFile.name) private readonly userFileModel: Model<UserFileDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly r2: R2Service,
  ) {}

  async uploadTemp(userId: string, file: Express.Multer.File): Promise<{
    tempFileId: string
    fileName: string
    fileSize: number
    expiresAt: string
  }> {
    const buffer = file?.buffer ?? (file as any)?.buffer
    if (!file || !buffer) throw new BadRequestException('No file provided')
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    const ext = file.originalname?.split('.').pop()?.toLowerCase() || 'bin'
    const contentType = file.mimetype || 'application/octet-stream'
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + TEMP_EXPIRY_HOURS)

    const id = new Types.ObjectId()
    const key = `temp/${id.toString()}.${ext}`

    const doc = await this.tempFileModel.create({
      _id: id,
      userId,
      key,
      fileName: file.originalname || 'file',
      fileSize: file.size,
      expiresAt,
    })

    await this.r2.upload(key, Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer), contentType)

    return {
      tempFileId: doc._id.toString(),
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      expiresAt: doc.expiresAt.toISOString(),
    }
  }

  async getTemp(tempFileId: string, userId: string): Promise<{ buffer: Buffer; fileName: string }> {
    const doc = await this.tempFileModel.findById(tempFileId).exec()
    if (!doc) throw new NotFoundException('Temp file not found')
    if (String(doc.userId) !== userId) throw new ForbiddenException('Not your file')
    const buffer = await this.r2.getBuffer(doc.key)
    return { buffer, fileName: doc.fileName }
  }

  async deleteTemp(tempFileId: string, userId: string): Promise<void> {
    const doc = await this.tempFileModel.findById(tempFileId).exec()
    if (!doc) throw new NotFoundException('Temp file not found')
    if (String(doc.userId) !== userId) throw new ForbiddenException('Not your file')
    await this.r2.delete(doc.key)
    await this.tempFileModel.findByIdAndDelete(tempFileId).exec()
  }

  async finalize(
    userId: string,
    body: { orderId?: string; tempFileIds?: string[] },
  ): Promise<{ success: boolean; files: Array<{ tempId: string; permanentId: string; fileName: string }> }> {
    let tempFileIds: string[] = body.tempFileIds ?? []
    const orderId = body.orderId

    if (orderId) {
      const order = await this.orderModel.findById(orderId).lean().exec()
      if (!order) throw new NotFoundException('Order not found')
      if (String(order.user) !== userId) throw new ForbiddenException('Not your order')
      const items = (order.items as any[]) || []
      tempFileIds = items.map((i: any) => i.file).filter(Boolean)
    }

    if (tempFileIds.length === 0) {
      return { success: true, files: [] }
    }

    const permanentFiles: Array<{ tempId: string; permanentId: string; fileName: string }> = []

    for (const tempId of tempFileIds) {
      const tempDoc = await this.tempFileModel.findById(tempId).exec()
      if (!tempDoc || String(tempDoc.userId) !== userId) continue

      const buffer = await this.r2.getBuffer(tempDoc.key)
      const ext = tempDoc.fileName.split('.').pop()?.toLowerCase() || 'bin'

      const userFileDoc = await this.userFileModel.create({
        filename: tempDoc.fileName,
        fileType: 'stl',
        description: `Uploaded file`,
        url: '',
      })

      const key = `users/files/${userFileDoc._id}.${ext}`
      const url = await this.r2.upload(key, buffer, 'application/octet-stream')
      userFileDoc.url = url
      await userFileDoc.save()

      permanentFiles.push({
        tempId,
        permanentId: userFileDoc._id.toString(),
        fileName: tempDoc.fileName,
      })

      await this.r2.delete(tempDoc.key)
      await this.tempFileModel.findByIdAndDelete(tempId).exec()
    }

    if (orderId && permanentFiles.length > 0) {
      const order = await this.orderModel.findById(orderId).exec()
      if (order) {
        const items = (order.items as any[]) || []
        const tempToPermanent = new Map(permanentFiles.map((f) => [f.tempId, f.permanentId]))
        const updatedItems = items.map((item: any) => ({
          ...item,
          file: tempToPermanent.get(item.file) ?? item.file,
        }))
        order.items = updatedItems
        await order.save()
      }
    }

    return { success: true, files: permanentFiles }
  }

  async cleanup(): Promise<{ deletedCount: number }> {
    const now = new Date()
    const docs = await this.tempFileModel.find({ expiresAt: { $lt: now } }).exec()
    let deletedCount = 0
    for (const doc of docs) {
      try {
        await this.r2.delete(doc.key)
        await this.tempFileModel.findByIdAndDelete(doc._id).exec()
        deletedCount++
      } catch {
        // continue
      }
    }
    return { deletedCount }
  }
}
