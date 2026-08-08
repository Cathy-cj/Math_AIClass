import { courseIdFromInput, validSlug } from '../tools/course-id-from-md.mjs'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(validSlug('ab'), 'two-char slug should be valid')
assert(validSlug('sum-6-21-5star'), 'example courseId should be valid')
assert(validSlug('4-21-2star'), 'digit-leading slug should be valid')
assert(!validSlug('A'), 'uppercase slug should be invalid')
assert(!validSlug('-abc'), 'leading hyphen should be invalid')
assert(!validSlug('中文'), 'CJK slug should be invalid')

assert(
  courseIdFromInput('sum-6-21-5star.md') === 'sum-6-21-5star',
  'basename from .md filename'
)
assert(
  courseIdFromInput('../path/to/sum-6-21-5star.md') === 'sum-6-21-5star',
  'basename from md path'
)
assert(
  courseIdFromInput('volume-review') === 'volume-review',
  'plain slug unchanged'
)

let threw = false
try {
  courseIdFromInput('bad name.md')
} catch (error) {
  threw = true
  assert(String(error.message).includes('Invalid courseId'), 'invalid slug error message')
}
assert(threw, 'space in basename should throw')

console.log('course-id-from-md tests passed')
