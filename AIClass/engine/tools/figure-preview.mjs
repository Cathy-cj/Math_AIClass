/**
 * 从 _output_/{grade}/{courseId}/{problemId}/figure-spec.json 生成图形预览。
 *
 * Usage (from engine/):
 *   node tools/figure-preview.mjs <courseId>/<lessonId>
 *   node tools/figure-preview.mjs <lessonId> # 仅限该 id 全局唯一
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { outputLessonDir, outputRoot, findOutputCourseDir, platformRoot } from '../../../shared/output-paths.mjs'

const engineRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const templateDir = path.join(engineRoot, 'templates', 'figure-preview')

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function courseGrade(courseId) {
  const dir = findOutputCourseDir(courseId)
  if (!dir) return null
  try {
    return readJson(path.join(dir, 'course.json')).grade
  } catch {
    return null
  }
}

function resolveLessonDir(arg) {
  if (!arg) return null
  if (arg.endsWith('figure-spec.json')) {
    const abs = path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg)
    return path.dirname(abs)
  }
  const parts = arg.replaceAll('\\', '/').split('/').filter(Boolean)
  if (parts.length === 2) {
    const grade = courseGrade(parts[0])
    if (grade == null) return null
    return outputLessonDir(grade, parts[0], parts[1])
  }
  if (!fs.existsSync(outputRoot)) return null
  const matches = []
  for (const gradeEntry of fs.readdirSync(outputRoot, { withFileTypes: true })) {
    if (!gradeEntry.isDirectory()) continue
    const gradeDir = path.join(outputRoot, gradeEntry.name)
    for (const courseEntry of fs.readdirSync(gradeDir, { withFileTypes: true })) {
      if (!courseEntry.isDirectory()) continue
      const dir = path.join(gradeDir, courseEntry.name, arg)
      if (fs.existsSync(dir)) matches.push(dir)
    }
  }
  if (matches.length > 1) {
    throw new Error(`题目 ${arg} 在多个课程中存在，请使用 <courseId>/<lessonId>。`)
  }
  return matches[0] || null
}

function previewTitle(outline, spec, lessonDir) {
  const id = spec.id || path.basename(lessonDir)
  if (outline?.moduleType === 'example' && /^ex/i.test(id)) {
    return `例${id.replace(/^ex/i, '')} · 图形预览`
  }
  if (outline?.moduleType === 'practice' && /^pr/i.test(id)) {
    return `练${id.replace(/^pr/i, '')} · 图形预览`
  }
  return `${id} · 图形预览`
}

function defaultPreviewMeta(spec, lessonDir) {
  const outlinePath = path.join(lessonDir, 'outline.json')
  const outline = fs.existsSync(outlinePath) ? readJson(outlinePath) : null
  const title = outline?.title || spec.figureTemplate || spec.id
  return {
    title: previewTitle(outline, spec, lessonDir),
    subtitle: title,
    info: []
  }
}

function mergePreview(spec, lessonDir) {
  const defaults = defaultPreviewMeta(spec, lessonDir)
  const preview = spec.preview || {}
  return {
    title: preview.title || defaults.title,
    subtitle: preview.subtitle != null ? preview.subtitle : defaults.subtitle,
    info: Array.isArray(preview.info) ? preview.info : defaults.info
  }
}

function renderPreviewHtml(spec, lessonDir) {
  const template = fs.readFileSync(path.join(templateDir, 'preview.template.html'), 'utf8')
  const preview = mergePreview(spec, lessonDir)
  const pageTitle = `${spec.id || 'figure'} · 图形预览`
  const specForPage = { ...spec, preview }

  return template
    .replace(/\{\{PAGE_TITLE\}\}/g, pageTitle)
    .replace(/\{\{PREVIEW_TITLE\}\}/g, preview.title)
    .replace(/\{\{PREVIEW_SUBTITLE\}\}/g, preview.subtitle || '')
    .replace('{{SPEC_JSON}}', JSON.stringify(specForPage, null, 2))
}

function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage: node tools/figure-preview.mjs <lessonId|figure-spec.json>')
    process.exit(1)
  }

  const lessonDir = resolveLessonDir(arg)
  if (!lessonDir || !fs.existsSync(lessonDir)) {
    throw new Error(`Lesson directory not found: ${arg}`)
  }

  const specPath = path.join(lessonDir, 'figure-spec.json')
  if (!fs.existsSync(specPath)) {
    throw new Error(`Missing figure-spec.json: ${specPath}`)
  }

  const spec = readJson(specPath)
  const outPath = path.join(lessonDir, 'figure-preview.html')
  fs.writeFileSync(outPath, renderPreviewHtml(spec, lessonDir), 'utf8')

  const rel = path.relative(platformRoot, outPath).split(path.sep).join('/')
  console.log(`Wrote ${rel}`)
  console.log('Open locally:', outPath)
}

main()
