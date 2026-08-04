import path from 'node:path'

export function validSlug(value) {
  return /^[a-z][a-z0-9-]{1,47}$/.test(value)
}

/** MD path or slug → courseId (strip .md, validate validSlug). */
export function courseIdFromInput(input) {
  const base = path.basename(input, path.extname(input))
  if (!validSlug(base)) {
    throw new Error(
      `Invalid courseId from "${input}": must match validSlug after stripping .md`
    )
  }
  return base
}
