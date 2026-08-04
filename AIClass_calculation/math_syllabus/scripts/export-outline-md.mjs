/**
 * 从 outline.json 导出 outline.md
 * 用法: node scripts/export-outline-md.mjs {id}
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { resolveOutlineJson, lessonRel } from './lesson-paths.mjs'

function escapeCell(t) {
  return String(t ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function pad(n) {
  return String(n).padStart(2, '0')
}

/** @returns {Array<{id?, title, goal?, approach?}>} */
export function normalizePhases(outline) {
  const raw = outline.teachingStages || outline.phases || []
  if (raw.length && typeof raw[0] === 'object') return raw
  return raw.map((title, i) => ({
    slug: `stage-${i + 1}`,
    title: String(title || '—'),
    goal: '—',
    approach: '—'
  }))
}

/** @param {string[] | undefined} tags */
function formatKnowledgeTags(outline, tags) {
  const internalKnowledge = outline.analysisModel?.stem?.knowledge
  const fromFour = outline.mathSkeleton?.readStemFour?.知识点
  const merged = [...(tags || [])]
  for (const item of Array.isArray(internalKnowledge) ? internalKnowledge : []) {
    if (!merged.includes(item)) merged.push(item)
  }
  if (fromFour) {
    for (const part of fromFour.split(/[；;]/).map((s) => s.trim()).filter(Boolean)) {
      if (!merged.some((t) => t.includes(part) || part.includes(t))) merged.push(part)
    }
  }
  return merged
}

function stars(n) {
  return Number.isFinite(Number(n)) ? '★'.repeat(Number(n)) : String(n ?? '—')
}

const INTERACTION_FORMS = { oral: '口答', choice: '选择', fill: '填空' }

/** @param {ReturnType<typeof normalizePhases>[number]} phase */
function buildPhaseStepLines(phase) {
  const lines = []

  if (phase.goal) lines.push(`- ${phase.goal}`)
  if (phase.approach) lines.push(`- ${phase.approach}`)
  if (phase.difficulty != null) lines.push(`- **本段难度**：${stars(phase.difficulty)}`)
  if (phase.loop?.from || phase.loop?.get) {
    const from = Array.isArray(phase.loop.from) ? phase.loop.from.join('、') : phase.loop.from
    lines.push(`- **本轮推导**：由「${from || '—'}」→ 求出「${phase.loop.get || '—'}」`)
  }
  if (phase.linkBack) lines.push(`- **联旧**：${phase.linkBack}`)
  if (phase.trap) lines.push(`- **陷阱**：${phase.trap}`)
  for (const qa of phase.interactions || []) {
    const form = INTERACTION_FORMS[qa.form] || qa.form || '—'
    const options = qa.options?.length ? `（${qa.options.join(' / ')}）` : ''
    lines.push(
      `- **互动·${form}**：${qa.ask || '—'}${options} → 答：${qa.answer || '—'}` +
        `｜考察：${qa.tests || '—'}`
    )
  }
  return lines
}

export function outlineToReviewMd(outline) {
  const ctx = outline.lessonContext || {}
  const phaseList = normalizePhases(outline)
  const phaseChain = phaseList.map((p) => p.title).join(' → ')

  const parts = [
    `# 讲法大纲 · ${outline.title || outline.id}`,
    '',
    '> 可选导出稿。真源为 outline.json；`plan:check` 通过后自动进入 fill（有图题须 **图形 OK**）。由 `lesson/' +
      (outline.id || 'id') +
      '/outline.json` 自动导出。',
    '',
    '| 字段 | 值 |',
    '|------|-----|',
    `| id | ${outline.id} |`,
    `| 答案 | ${outline.unit ? outline.answer + ' ' + outline.unit : outline.answer} |`,
    `| 题型 | ${outline.moduleType} |`,
    `| 星级 | ${outline.difficulty ?? '—'} |`,
    `| 讲法配方 | ${ctx.archetype ?? '—'} |`,
    `| 课内位置 | ${ctx.slot ?? '—'} |`,
    `| 环节链 | ${phaseChain || '—'} |`,
    `| 大环节数 | ${phaseList.length} |`,
    `| 状态 | ${outline.outlineStatus || 'draft'} |`,
    '',
    '## 题干',
    '',
    outline.stem || '—',
    ''
  ]

  if (outline.analysis) {
    parts.push('## 解析', '', outline.analysis, '')
  }

  const positioning = outline.positioning
  if (positioning) {
    parts.push('## 开场定位（30 秒）', '')
    if (positioning.represents) parts.push(`- **代表性**：${positioning.represents}`)
    if (positioning.generalSkill) parts.push(`- **普遍性**：${positioning.generalSkill}`)
    if (positioning.examRelevance) parts.push(`- **真题背景**：${positioning.examRelevance}`)
    if (positioning.hook) parts.push(`- **开场钩子**：${positioning.hook}`)
    parts.push('')
  }

  const entry = outline.entryPoint
  if (entry) {
    parts.push('## 切入点分析', '')
    if (entry.stuckPoint) parts.push(`- **学生卡点**：${entry.stuckPoint}`)
    if (entry.observe) parts.push(`- **第一眼看**：${entry.observe}`)
    if (entry.strategy) parts.push(`- **主攻方向**：${entry.strategy}`)
    for (const rejected of entry.rejectedPaths || []) {
      parts.push(`- **排除死路**：${rejected}`)
    }
    parts.push('')
  }

  const model = outline.analysisModel || {
    stem: {
      known: outline.mathSkeleton?.readStemFour?.条件,
      ask: outline.mathSkeleton?.readStemFour?.问题,
      knowledge: outline.mathSkeleton?.readStemFour?.知识点
        ? [outline.mathSkeleton.readStemFour.知识点]
        : [],
      key: outline.mathSkeleton?.readStemFour?.关键
    },
    logicChain: outline.mathSkeleton?.logicChain || [],
    computeSteps: outline.mathSkeleton?.computeSteps || outline.solution || []
  }
  const brief = outline.problemBrief || {
    known: model.stem?.known,
    ask: model.stem?.ask,
    key: model.stem?.key
  }

  parts.push('## 大纲分析', '')
  const known = Array.isArray(brief.known) ? brief.known : [brief.known].filter(Boolean)
  known.forEach((line) => parts.push(`- **已知**：${line}`))
  if (brief.ask) parts.push(`- **求**：${brief.ask}`)
  if (brief.key) parts.push(`- **关键**：${brief.key}`)
  ;(model.logicChain || []).forEach((line) => parts.push(`- ${line}`))
  parts.push('')

  parts.push('## 解题思路', '')

  phaseList.forEach((p, i) => {
    parts.push(`### ${i + 1}. ${p.title}`, '')
    const stepLines = buildPhaseStepLines(p)
    if (stepLines.length) {
      stepLines.forEach((line) => parts.push(line))
    } else {
      parts.push('- —')
    }
    parts.push('')
  })

  const closing = outline.closing
  if (closing) {
    parts.push('## 收尾回顾', '')
    if (closing.recap) parts.push(`- **难度拼装**：${closing.recap}`)
    if (closing.takeaway) parts.push(`- **带走一句**：${closing.takeaway}`)
    parts.push('')
  }

  const answerText = outline.unit ? `${outline.answer} ${outline.unit}` : outline.answer
  parts.push('## 标准答案', '', answerText || '—', '')

  const knowledge = formatKnowledgeTags(outline, outline.knowledgeTags)
  parts.push('## 相关知识点', '')
  if (knowledge.length) {
    knowledge.forEach((tag) => parts.push(`- ${tag}`))
  } else {
    parts.push('- —')
  }
  parts.push('')

  parts.push(
    '<details>',
    '<summary>讲法环节（供 fill-lesson-plan 参考）</summary>',
    '',
    '| # | 环节 | stage slug | 侧栏副标题 | 本段目标 | 讲法要点 | 星级 | 互动 |',
    '|---|------|----------|------------|----------|----------|------|------|'
  )

  phaseList.forEach((p, i) => {
    parts.push(
      '| ' +
        [
          pad(i + 1),
          escapeCell(p.title),
          escapeCell(p.slug || p.id),
          escapeCell(p.guidanceDesc),
          escapeCell(p.goal),
          escapeCell(p.approach),
          escapeCell(p.difficulty != null ? stars(p.difficulty) : '—'),
          escapeCell(p.interactions?.length ? `${p.interactions.length} 道` : '—')
        ].join(' | ') +
        ' |'
    )
  })

  parts.push('', '</details>', '')

  if (outline.quickQASkeleton?.length) {
    parts.push(
      '## quickQA 提纲',
      '',
      '| # | 形式 | 考点 | 预期答 |',
      '|---|------|------|--------|'
    )
    outline.quickQASkeleton.forEach((q, i) => {
      parts.push(
        `| ${i + 1} | ${escapeCell(q.form)} | ${escapeCell(q.topic || q.question)} | ${escapeCell(q.expected)} |`
      )
    })
    parts.push('')
  }

  parts.push(
    '## 确认',
    '',
    '- [ ] 开场定位讲出了代表性/普遍性吗？',
    '- [ ] 切入点是学生真实卡点吗？主攻方向一句话能复述吗？',
    '- [ ] 讲法配方与环节选对了吗？推导环节链能从已知推到答案吗？',
    '- [ ] 互动题考在点子上吗（非 1+1）？陷阱都点名了吗？',
    '- [ ] 解析/列式与【分析】【详解】一致吗？',
    '- [ ] 各段 goal / approach 是否说清了本题思路？',
    '- [ ] 各段 guidanceDesc（侧栏副标题）是否定稿、播放时不需要再改？',
    '',
    '（可选导出）`plan:check` 通过后自动进入 fill-lesson-plan；有图题须 **图形 OK**',
    ''
  )

  return parts.join('\n')
}

function main() {
  const inputArg = process.argv[2]
  if (!inputArg) {
    console.error('Usage: node scripts/export-outline-md.mjs <id|outline.json>')
    process.exit(1)
  }
  const inputPath = resolveOutlineJson(inputArg)
  if (!fs.existsSync(inputPath)) {
    console.error('File not found:', inputPath)
    process.exit(1)
  }
  const outline = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
  const md = outlineToReviewMd(outline)
  const outPath = path.join(path.dirname(inputPath), 'outline.md')
  fs.writeFileSync(outPath, md, 'utf8')
  console.log('Wrote', lessonRel(outline.id, 'outline.md'))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main()
}
