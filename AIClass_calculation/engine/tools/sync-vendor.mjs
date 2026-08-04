import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(source, target)
}

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true })
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name)
    const to = path.join(target, entry.name)
    if (entry.isDirectory()) copyDirectory(from, to)
    else copyFile(from, to)
  }
}

const katexDist = path.join(root, 'node_modules', 'katex', 'dist')

if (!fs.existsSync(katexDist)) {
  throw new Error('Dependencies are missing. Run npm install before vendor:sync.')
}

const katexTarget = path.join(root, 'vendor', 'katex')
fs.rmSync(katexTarget, { recursive: true, force: true })
copyDirectory(katexDist, katexTarget)

const katexLicense = path.join(root, 'node_modules', 'katex', 'LICENSE')
if (fs.existsSync(katexLicense)) {
  copyFile(katexLicense, path.join(root, 'vendor', 'licenses', 'katex.txt'))
}

console.log('Vendor assets synchronized (katex).')
