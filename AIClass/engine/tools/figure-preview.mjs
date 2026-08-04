/**
 * 从 figure-spec.json 生成 lesson/{id}/figure-preview.html
 *
 * Usage (from engine/):
 *   node tools/figure-preview.mjs <lessonId>
 *   node tools/figure-preview.mjs lesson/ex1/figure-spec.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const engineRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const repoRoot = path.dirname(engineRoot)
const templateDir = path.join(engineRoot, 'templates', 'figure-preview')

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function loadWorkspace() {
  const local = path.join(engineRoot, 'workspace.local.json')
  const example = path.join(engineRoot, 'workspace.example.json')
  const file = fs.existsSync(local) ? local : example
  return fs.existsSync(file) ? readJson(file) : { authoringRoots: {} }
}

function resolveLessonDir(arg) {
  if (!arg) return null
  if (arg.endsWith('figure-spec.json')) {
    const abs = path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg)
    return path.dirname(abs)
  }
  const roots = loadWorkspace().authoringRoots || {}
  const syllabus = roots.mathSyllabus
    ? path.resolve(engineRoot, roots.mathSyllabus)
    : path.join(repoRoot, 'math_syllabus')
  return path.join(syllabus, 'lesson', arg)
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

  const rel = path.relative(repoRoot, outPath).split(path.sep).join('/')
  console.log(`Wrote ${rel}`)
  console.log('Open locally:', outPath)
}

main()
