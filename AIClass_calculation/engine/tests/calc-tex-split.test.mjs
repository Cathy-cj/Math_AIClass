import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const splitPath = path.join(root, 'src', 'components', 'calc-tex-split.js')
const code = fs.readFileSync(splitPath, 'utf8')
const sandbox = { window: {} }
vm.runInNewContext(code, sandbox)
const split = sandbox.window.AIClassCalcTexSplit

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed')
}

// 分数/括号内的 = 不断开
const fracTex = '\\dfrac{1}{2}=\\dfrac{a=b}{c}'
const fracIdx = split.findTopLevelEqualsIndices(fracTex)
assert(fracIdx.length === 1 && fracIdx[0] === 12, 'only split top-level = outside frac args')

// 多段 =（± 不断行，只在 = 处切）
const multi = '=1-\\dfrac{1}{5}=\\dfrac{4}{5}'
const segments = split.splitIntoSegments(multi)
assert(segments.length === 3, 'three segments at = only')
assert(segments[0] === '', 'leading empty before first =')
assert(segments[1] === '=1-\\dfrac{1}{5}', 'second segment')
assert(segments[2] === '=\\dfrac{4}{5}', 'third segment')

// 分组
const grouped0 = split.groupSegmentsIntoLines(segments, 0)
assert(grouped0.length === 1 && grouped0[0] === multi, 'no breaks -> single line')

const grouped1 = split.groupSegmentsIntoLines(segments, 1)
assert(grouped1.length === 2, 'one break -> two lines')
assert(grouped1[0] === '=1-\\dfrac{1}{5}', 'first line through first = segment')
assert(grouped1[1] === '=\\dfrac{4}{5}', 'second line remainder')

// 无 = 且无顶层除号：不切段
const noEq = '\\left(1-\\dfrac{1}{2}\\right)+\\cdots'
const noEqSeg = split.splitIntoSegments(noEq)
assert(noEqSeg.length === 1, '± alone does not split')
assert(split.maxBreakCount(noEqSeg) === 0, 'no wrap break points without = or div')

// 裂项长式仅开头一个 =：wrap 切点只有一个，靠 fit 缩字而非 ± 断行
const splitLine = '=\\left(1-\\frac{1}{2}\\right)+\\left(\\frac{1}{2}+\\frac{1}{3}\\right)-\\left(\\frac{1}{3}+\\frac{1}{4}\\right)'
const splitSeg = split.splitIntoSegments(splitLine)
assert(splitSeg.length === 2, 'single leading = only')
assert(split.maxBreakCount(splitSeg) === 1, 'at most one wrap break')

// \\div / \\dfrac 顶层断点
const divTex = 'a\\div b + c\\dfrac{1}{2}{3}'
const divIdx = split.findBreakIndices(divTex)
assert(divIdx.some(function (i) { return divTex.slice(i, i + 4) === '\\div' }), 'break at \\div')
assert(divIdx.some(function (i) { return divTex.slice(i, i + 6) === '\\dfrac' }), 'break at \\dfrac')

const grouped2 = split.groupSegmentsIntoLines(['', '=a', '=b', '=c'], 2)
assert(grouped2.length === 3, 'two breaks -> three lines')
assert(grouped2.join('|') === '=a|=b|=c', 'each = segment on its own line')

console.log('calc-tex-split tests passed.')
