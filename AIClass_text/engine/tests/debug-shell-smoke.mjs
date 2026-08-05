import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { chromium } from 'playwright'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const coursesRoot = path.join(path.dirname(root), 'courses')
const courseId = 'fixture-minimal'
const courseDir = path.join(coursesRoot, courseId)
const fixture = path.join(root, 'tests', 'fixtures', 'minimal-course')
const exported = path.join(root, 'dist', courseId)

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true })
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name === '.generated') continue
    const from = path.join(source, entry.name)
    const to = path.join(target, entry.name)
    if (entry.isDirectory()) copyDirectory(from, to)
    else fs.copyFileSync(from, to)
  }
}

if (!fs.existsSync(courseDir)) {
  copyDirectory(fixture, courseDir)
}

const generated = spawnSync(
  process.execPath,
  ['tools/aiclass.mjs', 'course:export', courseId],
  { cwd: root, encoding: 'utf8' }
)

try {
  if (generated.status !== 0) throw new Error(generated.stderr || generated.stdout)

const debugHtml = path.join(exported, 'debug', 'parent-shell', 'index.html')
const debugCss = path.join(exported, 'debug', 'parent-shell', 'parent-shell.css')
const debugJs = path.join(exported, 'debug', 'parent-shell', 'parent-shell.js')
const editMapFile = path.join(exported, 'debug', 'edit-map.json')

for (const file of [debugHtml, debugCss, debugJs, editMapFile]) {
  if (!fs.existsSync(file)) throw new Error(`Debug shell asset missing: ${file}`)
}
const editMap = JSON.parse(fs.readFileSync(editMapFile, 'utf8'))
const actionCatalog = JSON.parse(fs.readFileSync(path.join(exported, 'course', 'runtime', 'action-catalog.json'), 'utf8'))
if (!editMap.actions.length) throw new Error('Debug edit map has no editable actions.')
for (const entry of editMap.actions) {
  if (!entry.editable || !actionCatalog.some((item) => item.name === entry.action)) {
    throw new Error(`Debug edit map action is inconsistent: ${entry.action}`)
  }
}

const launchOptions = process.platform === 'win32'
  ? { channel: 'msedge', headless: true }
  : { headless: true }
const browser = await chromium.launch(launchOptions)
const page = await browser.newPage()
const errors = []

page.on('pageerror', (error) => errors.push(String(error)))

await page.goto(pathToFileURL(debugHtml).href, {
  waitUntil: 'domcontentloaded',
  timeout: 15000
})

const result = await page.evaluate(async () => {
  await new Promise((resolve, reject) => {
    var timer = setTimeout(function () {
      reject(new Error('Timed out waiting for help catalog.'))
    }, 12000)
    window.addEventListener('message', function onMessage(event) {
      var data = event.data || {}
      if (data.source !== 'aiclass-page' || data.type !== 'help') return
      clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      resolve()
    })
  })

  var styles = getComputedStyle(document.querySelector('.toolbar'))
  var grouped = document.querySelectorAll('.zone-block.collapsible-block')
  var actionButtons = document.querySelectorAll('.action-btn')
  var logWrap = document.getElementById('logWrap')

  document.getElementById('btnToggleLog').click()
  var logExpanded = !logWrap.classList.contains('collapsed')

  var firstAction = document.querySelector('.action-btn')
  if (firstAction) firstAction.click()

  document.getElementById('btnReset').click()

  return {
    toolbarDisplay: styles.display,
    groupedCount: grouped.length,
    actionCount: actionButtons.length,
    logExpanded: logExpanded,
    sidebarHead: document.getElementById('sidebarHead').textContent,
    hasReload: !!document.getElementById('btnReload'),
    hasFolderConnect: !!document.getElementById('btnConnectFolder')
  }
})

await browser.close()

if (errors.length) throw new Error(`Debug shell page errors:\n${errors.join('\n')}`)
if (result.toolbarDisplay !== 'flex') throw new Error('Debug shell CSS did not load.')
if (result.groupedCount < 1) throw new Error('Debug shell did not render grouped catalog zones.')
if (result.actionCount < 2) throw new Error('Debug shell action list is too small.')
if (!result.logExpanded) throw new Error('Debug shell log panel did not expand.')
if (!result.hasReload || !result.hasFolderConnect) throw new Error('Debug shell toolbar controls missing.')

console.log('Debug shell smoke passed: ' + courseId)
} finally {
  fs.rmSync(courseDir, { recursive: true, force: true })
}
