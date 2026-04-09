#!/usr/bin/env node
/**
 * Promote an existing user to role "admin" (MongoDB collection: app-users).
 *
 * Usage (from superfreak-backend root, loads .env from cwd or repo root if present):
 *   node scripts/bootstrap-admin.mjs user@example.com
 *
 * Or pass URI explicitly (any Node version):
 *   DATABASE_URL="mongodb://..." node scripts/bootstrap-admin.mjs user@example.com
 *
 * Node 20.6+ can also use: node --env-file=.env scripts/bootstrap-admin.mjs user@example.com
 */

import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Load .env without dotenv package (works on Node 18+). Does not override existing env. */
function loadEnvFile() {
  const candidates = [join(process.cwd(), '.env'), join(__dirname, '..', '.env')]
  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue
    const text = readFileSync(filePath, 'utf8')
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const exportPrefix = trimmed.startsWith('export ') ? 7 : 0
      const body = exportPrefix ? trimmed.slice(exportPrefix).trim() : trimmed
      const eq = body.indexOf('=')
      if (eq === -1) continue
      const key = body.slice(0, eq).trim()
      let val = body.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (process.env[key] === undefined) {
        process.env[key] = val
      }
    }
    break
  }
}

loadEnvFile()

const emailArg = process.argv[2]?.trim().toLowerCase()
const uri = process.env.DATABASE_URL

if (!emailArg) {
  console.error('Usage: node scripts/bootstrap-admin.mjs <email>')
  console.error('       DATABASE_URL=... node scripts/bootstrap-admin.mjs <email>')
  process.exit(1)
}
if (!uri) {
  console.error('Missing DATABASE_URL (set in environment or .env next to this repo).')
  process.exit(1)
}

await mongoose.connect(uri)
const col = mongoose.connection.collection('app-users')
const result = await col.updateOne(
  { email: emailArg },
  { $set: { role: 'admin', updatedAt: new Date() } },
)

if (result.matchedCount === 0) {
  console.error(`No user found with email: ${emailArg}`)
  await mongoose.disconnect()
  process.exit(1)
}

console.log(`Updated role to admin for: ${emailArg} (modified: ${result.modifiedCount})`)
await mongoose.disconnect()
