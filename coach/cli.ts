import { query, type PermissionResult } from '@anthropic-ai/claude-agent-sdk'
import fs from 'node:fs'
import path from 'node:path'
import { stdin, stdout } from 'node:process'
import readline from 'node:readline/promises'
import { TRAINER_TOOL_NAMES, trainerTools } from './coach-tools.ts'
import { ROOT } from './env.ts'
import { COACH_SYSTEM_PROMPT } from './prompt.ts'

const MODEL = process.env.COACH_MODEL ?? 'claude-sonnet-5'
// Conversation continuity across runs: the last Agent SDK session id is kept in
// a gitignored file, and `new` starts over.
const SESSION_FILE = path.join(ROOT, '.coach-session')

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`

// The coach may read anywhere in the project, but may only write to its memory
// and plan directories. Everything else (Bash, web, etc.) is denied outright.
const READ_TOOLS = new Set(['Read', 'Glob', 'Grep'])
const WRITE_TOOLS = new Set(['Write', 'Edit'])
const WRITABLE_DIRS = [path.join(ROOT, 'memory'), path.join(ROOT, 'plan')]

function within(child: string, parent: string): boolean {
  const rel = path.relative(parent, path.resolve(ROOT, child))
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}

async function canUseTool(
  toolName: string,
  input: Record<string, unknown>,
): Promise<PermissionResult> {
  if (TRAINER_TOOL_NAMES.includes(toolName)) return { behavior: 'allow', updatedInput: input }
  const filePath = typeof input.file_path === 'string' ? input.file_path : undefined
  if (READ_TOOLS.has(toolName)) {
    const target = filePath ?? (typeof input.path === 'string' ? input.path : ROOT)
    if (within(target, ROOT) || path.resolve(ROOT, target) === ROOT) {
      return { behavior: 'allow', updatedInput: input }
    }
    return { behavior: 'deny', message: 'Reads are limited to the trainer project directory.' }
  }
  if (WRITE_TOOLS.has(toolName) && filePath) {
    if (WRITABLE_DIRS.some((dir) => within(filePath, dir))) {
      return { behavior: 'allow', updatedInput: input }
    }
    return { behavior: 'deny', message: 'Writes are limited to memory/ and plan/.' }
  }
  return { behavior: 'deny', message: `The ${toolName} tool is not available to the coach.` }
}

function describeTool(name: string, input: Record<string, unknown>): string {
  const shortPath = (p: unknown) =>
    typeof p === 'string' ? path.relative(ROOT, p) || p : undefined
  switch (name) {
    case 'mcp__trainer__get_tracking_summary':
      return `checking tracking data (${input.days ?? '?'} days)`
    case 'mcp__trainer__query_tracking_db':
      return 'querying tracking data'
    case 'Read':
      return `reading ${shortPath(input.file_path) ?? 'a file'}`
    case 'Write':
    case 'Edit':
      return `updating ${shortPath(input.file_path) ?? 'a file'}`
    case 'Glob':
    case 'Grep':
      return 'searching files'
    default:
      return name
  }
}

async function runTurn(message: string): Promise<void> {
  const sessionId = fs.existsSync(SESSION_FILE)
    ? fs.readFileSync(SESSION_FILE, 'utf8').trim() || undefined
    : undefined

  const q = query({
    prompt: message,
    options: {
      cwd: ROOT,
      model: MODEL,
      systemPrompt: COACH_SYSTEM_PROMPT,
      mcpServers: { trainer: trainerTools },
      allowedTools: [...TRAINER_TOOL_NAMES, 'Read', 'Glob', 'Grep', 'Write', 'Edit'],
      disallowedTools: ['Bash', 'Task', 'WebFetch', 'WebSearch', 'NotebookEdit', 'TodoWrite'],
      canUseTool,
      includePartialMessages: true,
      settingSources: [],
      maxTurns: 40,
      ...(sessionId ? { resume: sessionId } : {}),
    },
  })

  let printedText = false
  for await (const msg of q) {
    if (msg.type === 'system' && msg.subtype === 'init') {
      fs.writeFileSync(SESSION_FILE, msg.session_id)
    } else if (msg.type === 'stream_event') {
      const ev = msg.event
      if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta' && ev.delta.text) {
        stdout.write(ev.delta.text)
        printedText = true
      }
    } else if (msg.type === 'assistant') {
      for (const block of msg.message.content) {
        if (block.type === 'tool_use') {
          if (printedText) stdout.write('\n')
          printedText = false
          console.log(
            dim(`  ⚙ ${describeTool(block.name, block.input as Record<string, unknown>)}`),
          )
        }
      }
    } else if (msg.type === 'result' && msg.subtype !== 'success') {
      console.error(`\ncoach error: ${msg.subtype}`)
    }
  }
  stdout.write('\n')
}

async function main(): Promise<void> {
  // One-shot mode for scripting/testing: npm run coach -- -p "message"
  const pIndex = process.argv.indexOf('-p')
  if (pIndex !== -1) {
    const message = process.argv
      .slice(pIndex + 1)
      .join(' ')
      .trim()
    if (!message) {
      console.error('usage: npm run coach -- -p "<message>"')
      process.exit(2)
    }
    await runTurn(message)
    return
  }

  console.log(bold('trainer coach') + dim(` (${MODEL})`))
  console.log(
    dim('tell me about workouts, PRs, DEXA scans, labs - "new" starts over, "exit" quits\n'),
  )
  const rl = readline.createInterface({ input: stdin, output: stdout })
  while (true) {
    const line = (await rl.question(cyan('you › '))).trim()
    if (!line) continue
    if (line === 'exit' || line === 'quit') break
    if (line === 'new') {
      fs.rmSync(SESSION_FILE, { force: true })
      console.log(dim('started a new conversation\n'))
      continue
    }
    stdout.write('\n')
    await runTurn(line)
    stdout.write('\n')
  }
  rl.close()
}

await main()
