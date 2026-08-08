import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Monorepo-level locations shared by all profile engines. */
export const platformRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
export const outputRoot = path.join(platformRoot, '_output_')
export const distRoot = path.join(platformRoot, 'dist')

export function outputCourseDir(grade, courseId) {
  return path.join(outputRoot, String(grade), courseId)
}

export function outputLessonDir(grade, courseId, problemId) {
  return path.join(outputCourseDir(grade, courseId), problemId)
}

export function distCourseDir(grade, courseId) {
  return path.join(distRoot, String(grade), courseId)
}

/** 按 courseId 在 _output_/{grade}/{courseId}/ 中定位已注册课程（grade 未知，需扫描）。 */
export function findOutputCourseDir(courseId) {
  if (!fs.existsSync(outputRoot)) return null
  for (const g of fs.readdirSync(outputRoot, { withFileTypes: true })) {
    if (!g.isDirectory()) continue
    const dir = path.join(outputRoot, g.name, courseId)
    if (fs.existsSync(path.join(dir, 'course.json'))) return dir
  }
  return null
}
