import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { chromium } from 'playwright'
import { distDir } from '../../../shared/engine/tests/dist-path.mjs'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const coursesRoot = path.join(root, '..', '..', '_output_', '7')
const fixture = path.join(root, 'tests', 'fixtures', 'minimal-course')
const courseId = 'fixture-minimal'
const courseDir = path.join(coursesRoot, courseId)
const actions = ['测试_开始', '测试_步骤01']

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

fs.rmSync(courseDir, { recursive: true, force: true })
copyDirectory(fixture, courseDir)

try {
  const generated = spawnSync(
    process.execPath,
    ['tools/aiclass.mjs', 'course:export', courseId],
    { cwd: root, encoding: 'utf8' }
  )
  if (generated.status !== 0) throw new Error(generated.stderr || generated.stdout)

  const launchOptions = process.platform === 'win32'
    ? { channel: 'msedge', headless: true }
    : { headless: true }
  const browser = await chromium.launch(launchOptions)
  const exported = distDir(root, courseId)
  if (!exported) throw new Error(`No course.json for ${courseId} — cannot resolve dist path`)
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))

  await page.goto(pathToFileURL(path.join(exported, 'index.html')).href, {
    waitUntil: 'domcontentloaded',
    timeout: 15000
  })
  await page.waitForFunction(() => window.AIClassMessageBridge && window.__courseScheduler, null, {
    timeout: 10000
  })

  const result = await page.evaluate(async (actionList) => {
    window._visualThemeLog = []
    window.__onCourseMessage = (payload) => window._visualThemeLog.push(payload)
    for (const action of actionList) {
      window.AIClassMessageBridge.handleMessage({ data: { action } })
    }
    const guideChain = document.querySelector('.cc-guide-panel, .cc-guide-chain')
    const guideStyle = guideChain ? getComputedStyle(guideChain) : null
    const difficulty = document.querySelector('.course-difficulty')
    const difficultyStars = [...document.querySelectorAll('img.course-difficulty__star')]
    await Promise.all(difficultyStars.map((star) => {
      if (star.complete) return Promise.resolve()
      return new Promise((resolve) => {
        star.addEventListener('load', resolve, { once: true })
        star.addEventListener('error', resolve, { once: true })
      })
    }))
    const engineCss = [...document.styleSheets]
      .map((sheet) => sheet.href || '')
      .some((href) => href.includes('engine.css'))
    const lessonCss = [...document.styleSheets]
      .map((sheet) => sheet.href || '')
      .some((href) => href.includes('lesson/styles/lesson.css'))
    return {
      log: window._visualThemeLog.slice(),
      hasStemHead: !!document.querySelector('.course-stem-head'),
      hasGuideChain: !!guideChain,
      guideBackground: guideStyle && guideStyle.backgroundColor,
      hasDifficulty: !!difficulty,
      difficultyStarCount: difficultyStars.length,
      difficultyStarsLoaded: difficultyStars.every((star) => star.complete && star.naturalWidth > 0),
      labelText: document.querySelector('.course-label')?.textContent || '',
      sourceText: document.querySelector('.course-source')?.textContent || '',
      engineCss,
      lessonCss
    }
  }, actions)

  await page.close()
  await browser.close()

  if (errors.length) throw new Error(`${courseId} page errors:\n${errors.join('\n')}`)
  if (!result.log.some((item) => item.type === 'step_ok')) {
    throw new Error(`${courseId} start action did not emit step_ok.`)
  }
  if (!result.hasStemHead) throw new Error(`${courseId} missing .course-stem-head`)
  if (!result.hasGuideChain) throw new Error(`${courseId} missing .cc-guide-chain`)
  if (!result.hasDifficulty) throw new Error(`${courseId} missing .course-difficulty`)
  if (result.difficultyStarCount !== 8) {
    throw new Error(`${courseId} difficulty stars are not image elements.`)
  }
  if (!result.difficultyStarsLoaded) {
    throw new Error(`${courseId} difficulty star images failed to load.`)
  }
  if (!result.engineCss || !result.lessonCss) {
    throw new Error(`${courseId} stylesheet chain incomplete.`)
  }
  if (result.labelText !== '例') throw new Error('Generated header label must be 例.')
  if (result.sourceText) {
    throw new Error('Course source must not be rendered.')
  }
  console.log(`Visual theme smoke passed: ${courseId}`)
} finally {
  fs.rmSync(courseDir, { recursive: true, force: true })
}
