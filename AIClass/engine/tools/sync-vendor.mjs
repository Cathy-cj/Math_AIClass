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
const jxgPkg = path.join(root, 'node_modules', 'jsxgraph')

if (!fs.existsSync(katexDist)) {
  throw new Error('Dependencies are missing. Run npm install before vendor:sync.')
}
if (!fs.existsSync(jxgPkg)) {
  throw new Error('jsxgraph is missing. Run npm install before vendor:sync.')
}

const katexTarget = path.join(root, 'vendor', 'katex')
fs.rmSync(katexTarget, { recursive: true, force: true })
copyDirectory(katexDist, katexTarget)

const jxgTarget = path.join(root, 'vendor', 'jsxgraph')
fs.rmSync(jxgTarget, { recursive: true, force: true })
fs.mkdirSync(jxgTarget, { recursive: true })

const jxgCandidates = [
  {
    core: path.join(jxgPkg, 'distrib', 'jsxgraphcore.js'),
    css: path.join(jxgPkg, 'distrib', 'jsxgraph.css')
  },
  {
    core: path.join(jxgPkg, 'build', 'jsxgraphcore.js'),
    css: path.join(jxgPkg, 'build', 'jsxgraph.css')
  },
  {
    core: path.join(jxgPkg, 'jsxgraphcore.js'),
    css: path.join(jxgPkg, 'jsxgraph.css')
  }
]

let jxgCore = null
let jxgCss = null
for (const c of jxgCandidates) {
  if (fs.existsSync(c.core) && fs.existsSync(c.css)) {
    jxgCore = c.core
    jxgCss = c.css
    break
  }
}
if (!jxgCore) {
  throw new Error('jsxgraph distrib files not found under node_modules/jsxgraph')
}
copyFile(jxgCore, path.join(jxgTarget, 'jsxgraphcore.js'))
copyFile(jxgCss, path.join(jxgTarget, 'jsxgraph.css'))

const licenses = [
  ['katex', 'LICENSE'],
  ['jsxgraph', 'LICENSE']
]
for (const [name, file] of licenses) {
  const source = path.join(root, 'node_modules', name, file)
  if (fs.existsSync(source)) {
    copyFile(source, path.join(root, 'vendor', 'licenses', `${name}.txt`))
  }
}

console.log('Vendor assets synchronized (katex, jsxgraph).')
