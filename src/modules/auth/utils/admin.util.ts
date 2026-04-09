import { UserDocument } from '../schemas/user.schema'

export function isAdminUser(user: Pick<UserDocument, 'role'>): boolean {
  return typeof user.role === 'string' && user.role === 'admin'
}
