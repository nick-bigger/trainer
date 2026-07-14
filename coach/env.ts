import { config } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

config({ path: path.join(ROOT, '.env.local'), quiet: true })

export function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    throw new Error(`Missing ${name} - copy .env.example to .env.local and fill it in.`)
  }
  return v
}
