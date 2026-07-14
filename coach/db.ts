import { createClient, type Client } from '@libsql/client'
import { requireEnv } from './env.ts'

let client: Client | null = null

/** Lazy so the server can boot (and the chat can explain itself) before Turso is configured. */
export function trackingDb(): Client {
  if (!client) {
    client = createClient({
      url: requireEnv('VITE_TURSO_DB_URL').replace(/^libsql:/, 'https:'),
      authToken: requireEnv('VITE_TURSO_AUTH_TOKEN'),
    })
  }
  return client
}
