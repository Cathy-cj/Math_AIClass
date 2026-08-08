/** 统一课件真源：_output_/{grade}/{courseId}/{problemId}/。 */
import fs from 'fs'
import path from 'path'
import { outputRoot } from '../../../shared/output-paths.mjs'

const PROFILE = 'figure'
const legacyLessonRoot = process.env.MATH_SYLLABUS_LESSON_ROOT
  ? path.resolve(process.env.MATH_SYLLABUS_LESSON_ROOT)
  : null
export const LESSON_ROOT = legacyLessonRoot || process.env.AICLASS_OUTPUT_ROOT
  ? path.resolve(process.env.AICLASS_OUTPUT_ROOT || legacyLessonRoot)
  : outputRoot

function lessonDirectories() {
  if (!fs.existsSync(LESSON_ROOT)) return []
  if (legacyLessonRoot) {
    return fs.readdirSync(LESSON_ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(LESSON_ROOT, entry.name))
  }
  return fs.readdirSync(LESSON_ROOT, { withFileTypes: true })
    .filter((grade) => grade.isDirectory())
    .flatMap((grade) => {
      const gradeDir = path.join(LESSON_ROOT, grade.name)
      return fs.readdirSync(gradeDir, { withFileTypes: true })
        .filter((course) => course.isDirectory())
        .flatMap((course) => {
          const courseFile = path.join(gradeDir, course.name, 'course.json')
          if (!fs.existsSync(courseFile)) return []
          let courseJson = null
          try {
            courseJson = JSON.parse(fs.readFileSync(courseFile, 'utf8'))
          } catch {
            courseJson = null
          }
          if (!courseJson || String(courseJson.grade) !== grade.name || courseJson.profile !== PROFILE) return []
          const registered = (courseJson.authoring?.problems || []).map((p) => p.problemId)
          return registered
            .map((problemId) => path.join(gradeDir, course.name, problemId))
            .filter((dir) => fs.existsSync(dir))
        })
    })
}

/** @param {string} arg 题 id、courseId/problemId 或完整路径 */
export function resolveLessonDir(arg) {
  if (!arg) return null

  const candidates = []
  if (path.isAbsolute(arg)) {
    candidates.push(arg)
  } else {
    candidates.push(path.join(process.cwd(), arg))
    candidates.push(path.join(LESSON_ROOT, arg))
  }

  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c
  }

  for (const c of candidates) {
    if (fs.existsSync(c) && c.endsWith('.json')) return path.dirname(c)
  }

  const matches = lessonDirectories().filter((dir) => path.basename(dir) === arg)
  if (matches.length === 1) return matches[0]
  if (matches.length > 1) {
    throw new Error(`题目 ${arg} 在多个课程中存在，请使用 <courseId>/<problemId> 或完整路径。`)
  }
  if (legacyLessonRoot) return path.join(LESSON_ROOT, arg)
  throw new Error(`题目 ${arg} 无法定位，请使用 <courseId>/<problemId> 或完整路径。`)
}

export function resolveOutlineJson(arg) {
  if (!arg) return null
  if (arg.endsWith('outline.json')) {
    const p = path.isAbsolute(arg) ? arg : path.join(process.cwd(), arg)
    return p
  }
  return path.join(resolveLessonDir(arg), 'outline.json')
}

export function resolvePlanJson(arg) {
  if (!arg) return null
  if (arg.endsWith('plan.json')) {
    const p = path.isAbsolute(arg) ? arg : path.join(process.cwd(), arg)
    return p
  }
  return path.join(resolveLessonDir(arg), 'plan.json')
}

export function listPlanJsonFiles() {
  return lessonDirectories()
    .map((dir) => path.join(dir, 'plan.json'))
    .filter((p) => fs.existsSync(p))
}

export function listOutlineJsonFiles() {
  return lessonDirectories()
    .map((dir) => path.join(dir, 'outline.json'))
    .filter((p) => fs.existsSync(p))
}

/** outline.json 存在且同目录尚无 plan.json */
export function listOutlineOnlyJsonFiles() {
  return listOutlineJsonFiles().filter(
    (outlinePath) => !fs.existsSync(path.join(path.dirname(outlinePath), 'plan.json'))
  )
}

export function listFigureSpecFiles() {
  return lessonDirectories()
    .map((dir) => path.join(dir, 'figure-spec.json'))
    .filter((p) => fs.existsSync(p))
}

export function lessonRel(id, file) {
  return `_output_/{grade}/<courseId>/${id}/${file}`
}
