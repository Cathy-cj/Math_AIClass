import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const contentRoot = path.dirname(fileURLToPath(import.meta.url))
const profiles = new Set(['figure', 'text', 'calculation'])
const [command, ...args] = process.argv.slice(2)
const profileIndex = args.indexOf('--profile')
const profile = profileIndex >= 0 ? args[profileIndex + 1] : null

if (command !== 'check' || !profiles.has(profile)) {
  throw new Error(
    'Usage: npm run content:check -- --profile <figure|text|calculation>'
  )
}

const forwarded = [...args]
forwarded.splice(profileIndex, 2)
const result = spawnSync(
  process.execPath,
  [path.join(contentRoot, profile, 'plan-check.mjs'), ...forwarded],
  { stdio: 'inherit' }
)

process.exitCode = result.status ?? 1
