/**
 * 统一 lesson 目录约定：lesson/{id}/outline.json | plan.json
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
export const LESSON_ROOT = process.env.MATH_SYLLABUS_LESSON_ROOT
  ? path.resolve(process.env.MATH_SYLLABUS_LESSON_ROOT)
  : path.join(root, 'lesson')

/** @param {string} arg 课 id（ex1）或路径（lesson/ex1/plan.json） */
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

  return path.join(LESSON_ROOT, arg)
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
  if (!fs.existsSync(LESSON_ROOT)) return []
  return fs
    .readdirSync(LESSON_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(LESSON_ROOT, d.name, 'plan.json'))
    .filter((p) => fs.existsSync(p))
}

export function listOutlineJsonFiles() {
  if (!fs.existsSync(LESSON_ROOT)) return []
  return fs
    .readdirSync(LESSON_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(LESSON_ROOT, d.name, 'outline.json'))
    .filter((p) => fs.existsSync(p))
}

/** outline.json 存在且同目录尚无 plan.json */
export function listOutlineOnlyJsonFiles() {
  return listOutlineJsonFiles().filter(
    (outlinePath) => !fs.existsSync(path.join(path.dirname(outlinePath), 'plan.json'))
  )
}

export function lessonRel(id, file) {
  return `lesson/${id}/${file}`
}
