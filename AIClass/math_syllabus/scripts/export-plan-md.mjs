/**
 * 从 lesson-plan.json 确定性导出人工校验用 plan.md
 * 用法: node scripts/export-plan-md.mjs {id}
 *       node scripts/export-plan-md.mjs lesson/{id}/plan.json
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { resolvePlanJson, lessonRel } from './lesson-paths.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.dirname(__dirname)

const AGENT_TYPE_LABEL = {
  explain: '讲解',
  question: '问题'
}

const PUSH_TYPE_LABEL = {
  oral: '口答卡',
  choice: '选择题',
  text: '算式/文本',
  fill: '填空'
}

function padNum(n, width = 2) {
  return String(n).padStart(width, '0')
}

function truncate(text, max = 28) {
  if (!text) return '—'
  const s = String(text).replace(/\s+/g, ' ')
  return s.length <= max ? s : s.slice(0, max) + '…'
}

function escapeTableCell(text) {
  return String(text ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function agentSubtype(step) {
  const agent = step.agent || {}
  if (agent.type !== 'question') return AGENT_TYPE_LABEL[agent.type] || agent.type || '—'
  const answerType = agent.answerType || 'text'
  if (answerType === 'select') return '问题·选择'
  if (answerType === 'fill') return '问题·填空'
  return '问题·口答'
}

function summarizePush(pushList) {
  if (!pushList || !pushList.length) return '—'
  return pushList
    .map((p) => {
      const label = PUSH_TYPE_LABEL[p.type] || p.type
      if (p.type === 'oral') {
        if (p.attachStepId && p.answer) return `${label}（揭晓）`
        return p.badge ? `${label}「${truncate(p.question, 12)}」` : label
      }
      if (p.type === 'choice') return `${label}「${truncate(p.question, 12)}」`
      if (p.type === 'text') {
        const line = Array.isArray(p.lines) ? p.lines[0] : ''
        const text = typeof line === 'object' ? line.text : line
        const mode = p.replaceKey ? '（同卡更新）' : ''
        return `${label}${mode}「${truncate(text, 14)}」`
      }
      if (p.type === 'fill') return label
      return label
    })
    .join('；')
}

function summarizeFigure(figure) {
  if (!figure) return '—'
  const parts = []
  if (figure.state) parts.push(figure.state)
  if (figure.keepPrevious) parts.push('保持')
  if (figure.note) parts.push(truncate(figure.note, 20))
  else if (figure.annotations && figure.annotations.length) {
    parts.push(figure.annotations.map((a) => a.label || a.kind).join('、'))
  }
  return parts.length ? parts.join('；') : '—'
}

function renderMetaTable(plan) {
  const rows = [
    ['id', plan.id],
    ['答案', plan.unit ? `${plan.answer} ${plan.unit}` : plan.answer],
    ['题型', plan.moduleType],
    ['星级', plan.difficulty != null ? String(plan.difficulty) : '—'],
    ['来源', plan.source || '—'],
    ['布局', plan.layout || '—'],
    ['figure 模板', plan.figureTemplate || '—']
  ]
  if (plan.knowledgeTags && plan.knowledgeTags.length) {
    rows.push(['知识点', plan.knowledgeTags.join('、')])
  }
  return [
    '| 字段 | 值 |',
    '|------|-----|',
    ...rows.map(([k, v]) => `| ${k} | ${escapeTableCell(v)} |`)
  ].join('\n')
}

function renderOverviewTable(steps) {
  const header = '| # | 阶段 | action | 类型 | 口播摘要 | 左图 state | 右栏 |'
  const sep = '|---|------|--------|------|----------|------------|------|'
  const rows = steps.map((step, i) => {
    const agent = step.agent || {}
    return [
      padNum(i + 1),
      escapeTableCell(step.phase || '—'),
      `\`${step.action}\``,
      agentSubtype(step),
      escapeTableCell(truncate(agent.description, 24)),
      escapeTableCell(summarizeFigure(step.figure)),
      escapeTableCell(summarizePush(step.push))
    ].join(' | ')
  })
  return [header, sep, ...rows.map((r) => '| ' + r + ' |')].join('\n')
}

function renderPushDetailLines(pushList) {
  if (!pushList || !pushList.length) return []
  return pushList.map((p) => {
    const label = PUSH_TYPE_LABEL[p.type] || p.type
    if (p.type === 'oral') {
      if (p.attachStepId && p.answer) return `${label}（揭晓「${p.answer}」）`
      const q = p.question ? `「${p.question}」` : ''
      return p.badge ? `${label}${q}` : label
    }
    if (p.type === 'choice') {
      const opts = (p.options || []).map((o) => o.label).join(' ')
      return `${label}「${p.question}」${opts ? `（${opts}）` : ''}`
    }
    if (p.type === 'text') {
      const lines = (p.lines || []).map((line) =>
        typeof line === 'object' ? line.text : line
      )
      const mode = p.replaceKey ? `（覆盖槽 \`${p.replaceKey}\`）` : ''
      return `${label}${mode}：${lines.join('；')}`
    }
    return label
  })
}

function formatAction(a) {
  const op = a.op || '?'
  switch (op) {
    case 'dim':
      return `弱化 ${(a.targets || []).join('、')} → opacity ${a.opacity ?? '?'}` 
    case 'highlight':
      return `高亮 ${(a.targets || []).join('、')}${a.stroke ? `（描边 ${a.stroke}）` : ''}${a.glow ? ' + 发光' : ''}`
    case 'color':
      return `染色 ${(a.targets || []).join('、')} → ${a.fill || '?'}`
    case 'draw':
      return `绘制 ${a.target || '?'}：${a.from || '?'} → ${a.to || '?'}${a.durationMs ? ` ${a.durationMs}ms` : ''}`
    case 'label':
      return `标注 ${a.target || '?'}：「${a.text || ''}」${a.placement ? ` @${a.placement}` : ''}`
    case 'blink':
      return `闪烁 ${(a.targets || []).join('、')} ×${a.times ?? 1}${a.durationMs ? ` ${a.durationMs}ms` : ''}`
    case 'separate':
      return `分离 ${(a.targets || []).join('、')}${a.offset ? ` offset ${JSON.stringify(a.offset)}` : ''}`
    case 'fill':
      return `填充 ${(a.targets || []).join('、')} ${a.direction || ''}${a.heightRatio ? ` 比例${a.heightRatio}` : ''}`
    case 'show':
      return `显示 ${(a.targets || []).join('、')}`
    default:
      return `${op} ${JSON.stringify(a)}`
  }
}

function renderFigureDetail(figure) {
  if (!figure) return []
  const lines = []
  if (figure.state) {
    let s = `state \`${figure.state}\``
    if (figure.keepPrevious) s += '（保留上一帧标注）'
    lines.push(s)
  }
  if (figure.transition) {
    const t = figure.transition
    lines.push(
      `切入：从 \`${t.from || '—'}\` · ${t.durationMs ?? '?'}ms · ${t.easing || 'default'}`
    )
  }
  if (figure.note) lines.push(`摘要：${figure.note}`)
  if (figure.actions && figure.actions.length) {
    figure.actions.forEach((a, i) => {
      lines.push(`${i + 1}. ${formatAction(a)}`)
    })
  } else if (figure.annotations && figure.annotations.length) {
    lines.push(
      '标注（旧）：' +
        figure.annotations.map((a) => a.label || JSON.stringify(a)).join('、')
    )
  }
  return lines
}

function renderBulletBlock(label, contentLines) {
  const lines = [`- **${label}**：`]
  if (!contentLines || !contentLines.length) {
    lines.push('  - —')
    return lines
  }
  contentLines.forEach((l) => lines.push(`  - ${l}`))
  return lines
}

function renderStepDetail(step, index) {
  const agent = step.agent || {}
  const lines = [
    `### 步骤 ${padNum(index + 1)} · \`${step.action}\``,
    '',
    `- **阶段**：${step.phase || '—'}${step.group != null ? `（group ${step.group}）` : ''}`,
    `- **Agent 类型**：${agentSubtype(step)}`,
    `- **口播**：${agent.description || '—'}`
  ]
  if (agent.type === 'question' && agent.userResponse) {
    lines.push(`- **参考答案**：${agent.userResponse}`)
  }
  lines.push(...renderBulletBlock('左图', renderFigureDetail(step.figure)))
  lines.push(...renderBulletBlock('右栏', renderPushDetailLines(step.push)))
  if (step.moduleNote) {
    lines.push(`- **课件备注**：${step.moduleNote}`)
  }
  return lines.join('\n')
}

function renderQuickQA(quickQA) {
  if (!quickQA || !quickQA.length) return ''
  const header = '| # | 形式 | 问题 | 预期回答 | 答对反馈 |'
  const sep = '|---|------|------|----------|----------|'
  const rows = quickQA.map((item, i) =>
    [
      i + 1,
      escapeTableCell(item.form || '—'),
      escapeTableCell(item.question),
      escapeTableCell(item.expected),
      escapeTableCell(item.feedback || '—')
    ].join(' | ')
  )
  return [
    '## 快速确认（quickQA）',
    '',
    header,
    sep,
    ...rows.map((r) => '| ' + r + ' |'),
    ''
  ].join('\n')
}

function renderVariants(variants) {
  if (!variants || !Object.keys(variants).length) return ''
  const blocks = ['## 讲法分支（variants）', '']
  for (const [key, v] of Object.entries(variants)) {
    blocks.push(`### ${v.label || key}`)
    if (v.description) blocks.push(v.description, '')
    if (v.stepIds && v.stepIds.length) {
      blocks.push('步骤 id：' + v.stepIds.map((id) => `\`${id}\``).join('、'))
    }
    if (v.actions && v.actions.length) {
      blocks.push('action：' + v.actions.map((a) => `\`${a}\``).join('、'))
    }
    blocks.push('')
  }
  return blocks.join('\n')
}

function renderChecklist() {
  return [
    '## 人工校验清单',
    '',
    '- [ ] 每步 action 名唯一且符合命名规范',
    '- [ ] 口播括号内为屏幕说明（不朗读）',
    '- [ ] 问题步均有参考答案（userResponse）',
    '- [ ] figure state 序列合理',
    '- [ ] 体积对比步：左图 note/actions 表达体积份数，非「高度 1/3 填色」',
    '- [ ] push 类型与 agent 类型一致',
    '- [ ] quickQA / variants 与题型匹配',
    ''
  ].join('\n')
}

function renderGuidanceChain(chain) {
  if (!chain?.length) return ''
  const header = '| # | 环节 | 侧栏副标题（定稿，播放不变） |'
  const sep = '|---|------|---------------------------|'
  const rows = chain.map((g, i) =>
    [padNum(i + 1), escapeTableCell(g.title), escapeTableCell(g.desc)].join(' | ')
  )
  return [header, sep, ...rows.map((r) => '| ' + r + ' |'), ''].join('\n')
}

function renderPlanSummary(plan) {
  const ctx = plan.lessonContext || {}
  const phases = plan.guidanceChain?.map((g) => g.title).join(' → ') || '—'
  const phraseIds = (plan.phraseIds || []).join('、') || '—'
  return [
    '## 讲法摘要',
    '',
    '| 项目 | 值 |',
    '|------|-----|',
    `| outline | ${plan.outlineId || plan.id} |`,
    `| 讲法配方 | ${ctx.archetype || '—'} |`,
    `| 课内位置 | ${ctx.slot || '—'} |`,
    `| 选用阶段 | ${phases} |`,
    `| 总步数 | ${(plan.steps || []).length} |`,
    `| phrase ids | ${phraseIds} |`,
    '',
    renderGuidanceChain(plan.guidanceChain)
  ].join('\n')
}

export function planToReviewMd(plan) {
  const title = plan.title || plan.id
  const parts = [
    `# ${title}`,
    '',
    '> 由 `lesson/' + plan.id + '/plan.json` 自动导出，仅供人工校验；请改 JSON 后重新运行 `npm run plan:review -- ' +
      plan.id +
      '`。',
    '',
    renderMetaTable(plan),
    '',
    renderPlanSummary(plan),
    '## 题干',
    '',
    plan.stem || '—',
    '',
    '## 步骤总览',
    '',
    renderOverviewTable(plan.steps || []),
    '',
    '## 逐步详情',
    ''
  ]

  ;(plan.steps || []).forEach((step, i) => {
    parts.push(renderStepDetail(step, i))
    parts.push('')
  })

  const quick = renderQuickQA(plan.quickQA)
  if (quick) parts.push(quick)

  const variants = renderVariants(plan.variants)
  if (variants) parts.push(variants)

  parts.push(renderChecklist())
  return parts.join('\n')
}

function main() {
  const inputArg = process.argv[2]
  if (!inputArg) {
    console.error('Usage: node scripts/export-plan-md.mjs <id|plan.json>')
    process.exit(1)
  }

  const inputPath = resolvePlanJson(inputArg)

  if (!fs.existsSync(inputPath)) {
    console.error('File not found:', inputPath)
    process.exit(1)
  }

  const plan = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
  const md = planToReviewMd(plan)

  const outPath = path.join(path.dirname(inputPath), 'plan.md')
  fs.writeFileSync(outPath, md, 'utf8')
  console.log('Wrote', lessonRel(plan.id, 'plan.md'))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main()
}
