/**
 * 检查 plan 开场措辞与右栏往下叠加 push 约定
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { listOutlineOnlyJsonFiles, listPlanJsonFiles } from './lesson-paths.mjs'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const phraseBankPath = path.join(root, '..', 'skills', 'lesson-plan', 'phrase-bank.json')

function getStartDescription(plan) {
  const start =
    (plan.steps || []).find((s) => s.action.endsWith('_开始') || s.id === 'start') ||
    plan.steps?.[0]
  return start?.agent?.description || ''
}

function linesFingerprint(lines) {
  return (Array.isArray(lines) ? lines : [])
    .map((line) => (typeof line === 'object' ? line.text : line))
    .filter((v) => v != null && String(v).trim() !== '')
    .map((v) => String(v).trim())
}

/** 后拍 lines 是否包含前拍全部行（允许追加） */
function isLinesSuperset(prev, next) {
  if (!prev.length) return true
  return prev.every((line) => next.includes(line))
}

function checkReplaceKeys(plan, label) {
  // 同 replaceKey 跨多步 text：后拍若不是前拍超集 → 覆盖告警（板书应往下叠）
  const byKey = new Map()
  for (const step of plan.steps || []) {
    for (const block of step.push || []) {
      if (block.type !== 'text') continue
      const key = block.replaceKey
      if (typeof key !== 'string' || !key) continue
      if (!byKey.has(key)) byKey.set(key, [])
      byKey.get(key).push({
        stepId: step.id,
        lines: linesFingerprint(block.lines)
      })
    }
  }

  let warnings = 0
  for (const [key, hits] of byKey) {
    if (hits.length < 2) continue
    for (let i = 1; i < hits.length; i++) {
      const prev = hits[i - 1]
      const cur = hits[i]
      if (isLinesSuperset(prev.lines, cur.lines)) continue
      console.warn(
        `[replaceKey-overwrite] ${label}: ${prev.stepId}→${cur.stepId} 共用 replaceKey「${key}」且后拍未保留前拍行——` +
        `板书应往下叠（换新 key），勿用同 key 覆盖`
      )
      warnings++
    }
  }
  return warnings
}

/** 纯文字题仓不得混入图形题的数据契约。 */
function checkTextOnlyPlan(plan, label) {
  const invalid = []
  if (plan.layout && plan.layout !== 'text-only') invalid.push(`layout=${plan.layout}`)
  if (Object.prototype.hasOwnProperty.call(plan, 'figureTemplate')) invalid.push('figureTemplate')
  for (const step of plan.steps || []) {
    if (Object.prototype.hasOwnProperty.call(step, 'figure')) invalid.push(`${step.id}.figure`)
  }
  if (!invalid.length) return 0
  console.warn(`[text-only] ${label}: 纯文字题不得使用图形字段：${invalid.join(', ')}`)
  return 1
}

/** 图上 label 与右栏 push 渲染路径不同：label 用 plain 分数，禁止 $...$ */
function checkFigureLabels(plan, label) {
  let warnings = 0
  for (const step of plan.steps || []) {
    for (const action of step.figure?.actions || []) {
      if (action.op !== 'label' || typeof action.text !== 'string') continue
      if (/\$[^$]+\$/.test(action.text) || /\\frac\{/.test(action.text)) {
        console.warn(
          `[figure-label] ${label} ${step.id}: 图上 label 勿写 $...$ / \\\\frac——` +
          `用 plain 分数（如 1/2、2/6）；右栏 push 才用 LaTeX`
        )
        warnings++
      }
    }
  }
  return warnings
}

function checkMathTypesetting(plan, label) {
  const forbidden = /[½⅓¼⅔¾⅛⅜⅝⅞√]/
  const fields = []
  const add = (where, value) => {
    if (typeof value === 'string') fields.push({ where, value })
  }

  for (const step of plan.steps || []) {
    for (const block of step.push || []) {
      add(`${step.id}.question`, block.question || block.prompt)
      for (const line of block.lines || []) {
        add(`${step.id}.lines`, typeof line === 'object' ? line.text : line)
      }
      for (const option of block.options || []) {
        add(`${step.id}.options`, typeof option === 'object' ? option.label : option)
      }
    }
  }
  for (const [index, qa] of (plan.quickQA || []).entries()) {
    add(`quickQA[${index}].question`, qa.question)
    add(`quickQA[${index}].expected`, qa.expected)
    add(`quickQA[${index}].feedback`, qa.feedback)
  }

  const invalid = fields.filter((field) => forbidden.test(field.value))
  if (!invalid.length) return 0
  console.warn(
    `[latex] ${label}: 屏幕数学表达禁止使用 Unicode 分数/根号，请改用 $...$；` +
    `异常字段：${invalid.map((x) => x.where).join(', ')}`
  )
  return 1
}

/** 屏幕极简：口播讲理，屏幕留证（见 skills/lesson-outline/teaching-design.md） */
function checkScreenTextBrevity(plan, label) {
  // 只数汉字：算式/字母/数字不受罚，罚的是解释性课文
  const proseLen = (s) =>
    String(s).replace(/\$[^$]*\$/g, '').replace(/[^一-鿿]/g, '').length
  const narrationHint = /因为|所以|由于|也就是说|换句话说/
  const longLines = []
  const narrationLines = []

  for (const step of plan.steps || []) {
    for (const block of step.push || []) {
      if (block.region === 'top') continue // 题干置顶允许全文
      if (block.type === 'text') {
        for (const line of block.lines || []) {
          const text = typeof line === 'object' ? line.text : line
          if (typeof text !== 'string') continue
          if (proseLen(text) > 24) longLines.push(step.id)
          if (narrationHint.test(text)) narrationLines.push(step.id)
        }
      }
      for (const option of block.options || []) {
        const text = typeof option === 'object' ? option.label : option
        if (typeof text === 'string' && proseLen(text) > 12) longLines.push(step.id)
      }
    }
  }

  let warnings = 0
  if (longLines.length) {
    console.warn(
      `[screen] ${label}: 屏幕文字须为短语级（卡片行汉字 ≤24、选项汉字 ≤12），长句移入口播；` +
      `异常步骤：${[...new Set(longLines)].join(', ')}`
    )
    warnings++
  }
  if (narrationLines.length) {
    console.warn(
      `[screen] ${label}: 屏幕不写「因为/所以」式解释句——道理走口播，屏幕留结论；` +
      `异常步骤：${[...new Set(narrationLines)].join(', ')}`
    )
    warnings++
  }

  return warnings
}

function checkVolumeFigureSemantics(plan, label) {
  let warnings = 0
  const volumeHint = /体积|同底同高|⅓|1\/3|三分之一/
  for (const step of plan.steps || []) {
    const fig = step.figure
    if (!fig) continue
    const oral = step.agent?.description || ''
    const note = fig.note || ''
    const asksVolume = volumeHint.test(oral) || volumeHint.test(note)
    if (!asksVolume) continue

    const badNote = /(?:仅|只).{0,6}高度\s*1\s*\/\s*3|1\/3\s*高度填|高度\s*1\s*\/\s*3\s*填色/
    if (badNote.test(note)) {
      console.warn(
        `[figure] ${label} ${step.action}: figure.note 把体积比画成「高度 1/3」——应写体积份数对比`
      )
      warnings++
    }
    for (const action of fig.actions || []) {
      if (action.op === 'fill' && action.heightRatio != null && action.heightRatio < 1) {
        console.warn(
          `[figure] ${label} ${step.action}: fill.heightRatio 不能用于同底等高体积对比（体积比 ≠ 高度比）`
        )
        warnings++
      }
    }
  }
  return warnings
}

/** 左图 state 变化时须配 L2 figure.actions[]（见 figure-animation.md） */
function checkFigureActions(plan, label) {
  if (LEGACY_PRE_TTS.has(plan.id)) return 0
  let warnings = 0
  let prevState = null
  let seenFigure = false
  for (const step of plan.steps || []) {
    const fig = step.figure
    if (!fig || fig.state == null) continue
    const state = String(fig.state)
    if (seenFigure && prevState !== null && state !== prevState) {
      const actions = fig.actions || []
      if (!actions.length) {
        console.warn(
          `[figure-actions] ${label} ${step.id}: 左图 state 变化须配非空 figure.actions[]（L2 动画规格）`
        )
        warnings++
      }
    }
    seenFigure = true
    prevState = state
  }
  return warnings
}

/** agent.type 必填且为 explain / ask */
function checkAgentType(plan, label) {
  if (LEGACY_PRE_TTS.has(plan.id)) return 0
  let warnings = 0
  for (const step of plan.steps || []) {
    const t = step.agent?.type
    if (!t || !['explain', 'ask'].includes(t)) {
      console.warn(`[agent-type] ${label} ${step.id}: agent.type 必填且为 explain 或 ask`)
      warnings++
    }
  }
  return warnings
}

/** TTS 逐字稿：agent.description 只能是给 TTS 朗读的中文（数字/符号写读法，无括号说明）；几何点名可用大写字母 */
const TTS_FORBIDDEN = /[0-9a-z()（）[\]{}$+*/=×÷＋－＝<>＜＞％%√△∠°π²³½⅓¼·~～-]/g

/** 规则生效前的存量题：豁免 TTS 逐字稿与 desc 废弃检查（不重写旧内容），新题一律不加 */
const LEGACY_PRE_TTS = new Set(['hw0729', 'triangle-shadow-thirds', 'test_v1'])

function checkTtsNarration(plan, label) {
  let warnings = 0
  if (LEGACY_PRE_TTS.has(plan.id)) return 0
  for (const step of plan.steps || []) {
    const desc = step.agent?.description
    if (!desc) continue
    const hits = String(desc).match(TTS_FORBIDDEN)
    if (hits) {
      const chars = [...new Set(hits)].slice(0, 10).join(' ')
      console.warn(
        `[tts] ${label} ${step.id}: 口播含非逐字稿字符（${chars}）——数字/符号写中文读法，屏幕说明移到 figure.note/moduleNote`
      )
      warnings++
    }
  }
  return warnings
}

/** 屏幕文字用数学符号：汉字读法（三角形ABD、平方厘米）只属于口播；题干原文（region: top）豁免 */
const SCREEN_HANZI_GEOMETRY = /三角形[A-Z]{2,3}|角[A-Z]{1,3}(?![一-鿿])/
const SCREEN_HANZI_UNIT = /(?:平方|立方)(?:毫米|厘米|分米|米)|（(?:毫米|厘米|分米|千米|米)）/

function screenStringsOfBlock(block) {
  const out = []
  for (const line of block.lines || []) out.push(line)
  if (block.question) out.push(block.question)
  for (const option of block.options || []) {
    out.push(typeof option === 'object' ? `${option.label ?? ''}${option.value ?? ''}` : option)
  }
  for (const part of block.parts || []) if (part.value) out.push(part.value)
  return out.map(String)
}

function checkScreenMathSymbols(plan, label) {
  let warnings = 0
  if (LEGACY_PRE_TTS.has(plan.id)) return 0
  for (const step of plan.steps || []) {
    for (const block of step.push || []) {
      if (block.region === 'top') continue
      for (const text of screenStringsOfBlock(block)) {
        if (SCREEN_HANZI_GEOMETRY.test(text) || SCREEN_HANZI_UNIT.test(text)) {
          console.warn(
            `[screen-symbol] ${label} ${step.id}: 屏幕要用数学符号（△ABD / S△ABD / cm²），汉字读法只属于口播：「${text.slice(0, 30)}」`
          )
          warnings++
        }
      }
    }
  }
  return warnings
}

/** desc 废弃后环节槽内无兜底文字：纯文字题每个 group 至少一张正文卡。 */
function checkGuideSlotCoverage(plan, label) {
  let warnings = 0
  if (LEGACY_PRE_TTS.has(plan.id)) return 0
  const guidanceCount = (plan.guidanceChain || []).length
  if (!guidanceCount) return 0
  const groupCards = new Map()
  for (const step of plan.steps || []) {
    const group = step.group || 0
    const count = (step.push || []).filter((block) => block.region !== 'top').length
    groupCards.set(group, (groupCards.get(group) || 0) + count)
  }
  for (let group = 2; group <= guidanceCount; group++) {
    if (!(groupCards.get(group) > 0)) {
      const title = plan.guidanceChain[group - 1]?.title || ''
      console.warn(
        `[guide-slot] ${label}: group ${group}（${title}）没有正文卡，环节槽位会空白——从哪入手落 strategy 短语卡，提取已知落数据卡`
      )
      warnings++
    }
  }
  return warnings
}

function checkQuickQA(plan, label) {
  const items = plan.quickQA || []
  let warnings = 0
  const openQuestion = /你觉得|说说|谈谈|你的思路|怎么做|如何做|有什么方法/

  if (plan.moduleType === 'example') {
    if (items.length < 3 || items.length > 5) {
      console.warn(`[quickQA] ${label}: 例题快问快答必须为 3–5 道，当前为 ${items.length} 道`)
      warnings++
    }
    if (plan.quickQALayout !== 'above-body') {
      console.warn(`[quickQA] ${label}: 例题快问快答必须使用 quickQALayout="above-body"`)
      warnings++
    }
  } else if (items.length) {
    console.warn(`[quickQA] ${label}: 仅 example 可配置快问快答，${plan.moduleType} 不得配置`)
    warnings++
  }

  for (const [index, item] of items.entries()) {
    if (!String(item.id || '').trim() || !String(item.question || '').trim() ||
        !String(item.answer || '').trim()) {
      console.warn(`[quickQA] ${label}: 第 ${index + 1} 题必须含 id、question、answer`)
      warnings++
    }
    if (openQuestion.test(String(item.question || ''))) {
      console.warn(`[quickQA] ${label}: 第 ${index + 1} 题是开放提问；必须改为本题具体数据/关系且答案唯一的题目`)
      warnings++
    }
    const blankCount = (String(item.question || '').match(/＿＿/g) || []).length
    if (item.fillBlank && blankCount === 0) {
      console.warn(`[quickQA] ${label}: 第 ${index + 1} 题 fillBlank=true 时题干必须含 ＿＿`)
      warnings++
    }
  }
  return warnings
}

/** group 2..N 每个大环节至少一道互动；审题（group 1）除外 */
function checkStageInteraction(plan, label) {
  let warnings = 0
  if (LEGACY_PRE_TTS.has(plan.id)) return 0
  const guidanceCount = (plan.guidanceChain || []).length
  if (!guidanceCount) return 0
  const interactive = new Set()
  for (const step of plan.steps || []) {
    if (step.userResponse != null) interactive.add(step.group || 0)
  }
  for (let group = 2; group <= guidanceCount; group++) {
    if (!interactive.has(group)) {
      const title = plan.guidanceChain[group - 1]?.title || ''
      console.warn(
        `[stage-interaction] ${label}: group ${group}（${title}）没有互动步——outline 没覆盖的环节要从微步里挑关键一小步设过程级简单小问（选择/口答/填空）`
      )
      warnings++
    }
  }
  return warnings
}

function isInteractionQuestionPush(block) {
  if (!block || block.attachStepId) return false
  if (block.type === 'oral' || block.type === 'choice') return Boolean(block.question)
  if (block.type === 'fill') return (block.parts || []).some((part) => part.kind === 'blank')
  return false
}

/** 审题环节（group 1）禁止问/答互动 */
function checkReadProblemNoInteraction(plan, label) {
  let warnings = 0
  if (LEGACY_PRE_TTS.has(plan.id)) return 0
  for (const step of plan.steps || []) {
    if (step.group !== 1) continue
    const badPush = (step.push || []).some(isInteractionQuestionPush)
    if (step.userResponse != null || badPush) {
      console.warn(
        `[read-problem] ${label} ${step.id}: 审题环节（group 1）禁止互动问/答——只写 section 已知/求与口播`
      )
      warnings++
    }
  }
  return warnings
}

function checkPlanStructure(plan, label) {
  let warnings = 0
  if (!LEGACY_PRE_TTS.has(plan.id) &&
      ((plan.guidanceChain || []).some((item) => item.desc != null) ||
      (plan.steps || []).some((step) => step.guidanceDesc != null))) {
    console.warn(`[guidance] ${label}: desc/guidanceDesc 已废弃，guidanceChain 仅保留 title`)
    warnings++
  }
  const guidanceCount = (plan.guidanceChain || []).length
  const groups = (plan.steps || []).map((step) => step.group || 0)
  const visibleGroups = new Set(groups.filter((group) => group > 0))
  const expectedGroups = Array.from({ length: guidanceCount }, (_, index) => index + 1)

  if (groups.some((group) => group < 0 || group > guidanceCount) ||
      expectedGroups.some((group) => !visibleGroups.has(group))) {
    console.warn(
      `[group] ${label}: group 0 可重复，正文必须完整覆盖 1..${guidanceCount}`
    )
    warnings++
  }
  const invalidGroupZero = (plan.steps || []).find((step) =>
    (step.group || 0) === 0 &&
    step.id !== 'start' &&
    !String(step.action || '').endsWith('_开始')
  )
  if (invalidGroupZero) {
    console.warn(`[group] ${label}: group 0 仅用于开场；异常步骤 ${invalidGroupZero.id}`)
    warnings++
  }

  if (guidanceCount && plan.guidanceLayout !== 'interleaved') {
    console.warn(
      `[guidance] ${label}: 多环节必须使用 guidanceLayout="interleaved"`
    )
    warnings++
  }

  const relationText = [
    plan.stem,
    plan.analysis,
    ...(plan.solution || [])
  ].filter(Boolean).join(' ')
  if (plan.lessonContext?.archetype === 'directFormula' &&
      /面积相等|等面积|等高|逆用|反求|上下底之和/.test(relationText)) {
    console.warn(`[archetype] ${label}: 关系/逆用题不得使用 directFormula`)
    warnings++
  }

  if (plan.moduleType !== 'knowledge') {
    const group1Blocks = (plan.steps || [])
      .filter((step) => (step.group || 0) === 1)
      .flatMap((step) => step.push || [])
    const hasKnownTag = group1Blocks.some((block) =>
      block.type === 'section' && String(block.tag || '').includes('已知'))
    const hasAskTag = group1Blocks.some((block) =>
      block.type === 'section' && String(block.tag || '').includes('求'))
    if (!hasKnownTag || !hasAskTag) {
      console.warn(`[审题] ${label}: 须用 section 标签写出「已知」与「求」`)
      warnings++
    }
    if (plan.problemBrief || (plan.steps || []).some((step) => step.problemBrief)) {
      console.warn(`[problemBrief] ${label}: plan 不上屏 problemBrief，请删除（备课字段留在 outline）`)
      warnings++
    }
  }

  for (const step of plan.steps || []) {
    for (const block of step.push || []) {
      if (block.card === 'readStem') {
        console.warn(`[readStem] ${label}: text-only 用 section 已知/求上屏，禁止 readStem 卡`)
        warnings++
      }
    }
  }

  if (['example', 'practice'].includes(plan.moduleType)) {
    const interactionSteps = (plan.steps || []).filter((step) =>
      (step.push || []).some((block) => ['oral', 'choice', 'fill'].includes(block.type)))
    if (!interactionSteps.length) {
      console.warn(`[interaction] ${label}: 全量讲法必须含互动步（oral/choice/fill）`)
      warnings++
    }
  }

  return warnings + checkQuickQA(plan, label)
}

function checkOutlineStructure(filePath, label) {
  const outlinePath = path.join(path.dirname(filePath), 'outline.json')
  if (!fs.existsSync(outlinePath)) {
    console.warn(`[outline] ${label}: 缺少 outline.json`)
    return 1
  }
  const outline = JSON.parse(fs.readFileSync(outlinePath, 'utf8'))
  const model = outline.analysisModel
  const stem = model?.stem
  const stages = outline.teachingStages || []
  let warnings = 0

  if (!stem || !Array.isArray(stem.known) || !stem.known.length ||
      !String(stem.ask || '').trim() || !Array.isArray(stem.knowledge) ||
      !Object.prototype.hasOwnProperty.call(stem, 'key') ||
      !Array.isArray(model.logicChain) || !Array.isArray(model.computeSteps)) {
    console.warn(`[outline] ${label}: analysisModel 不完整`)
    warnings++
  }
  const outlineBrief = outline.problemBrief
  if (outlineBrief) {
    const known = (Array.isArray(outlineBrief.known) ? outlineBrief.known : [outlineBrief.known])
      .filter(Boolean)
    if (known.some((item) => String(item).length > 18) ||
        String(outlineBrief.ask || '').length > 32 ||
        String(outlineBrief.key || '').length > 24) {
      console.warn(
        `[outline] ${label}: problemBrief 为备课字段（不上屏），须为短语级（known 每条 ≤18 字，ask ≤32，key ≤24）`
      )
      warnings++
    }
  }

  const isCore = ['example', 'practice'].includes(outline.moduleType)
  const minStages = isCore ? 4 : 2
  const slugs = stages.map((stage) => stage.slug)
  if (stages.length < minStages ||
      new Set(slugs).size !== slugs.length ||
      stages.some((stage) => !stage.slug || !stage.title || !stage.goal ||
        !stage.approach)) {
    console.warn(
      `[outline] ${label}: teachingStages 至少需要 ${minStages} 个完整且 slug 唯一的环节（无上限）`
    )
    warnings++
  }
  if (!LEGACY_PRE_TTS.has(outline.id) && stages.some((stage) => stage.guidanceDesc != null)) {
    console.warn(`[outline] ${label}: guidanceDesc 已废弃，删除后课件不再展示环节副标题`)
    warnings++
  }
  if (stages[0]?.slug !== 'read-problem' || stages[0]?.title !== '审题环节' ||
      stages.slice(1).some((stage) => /^(审题环节|公式环节|计算环节|推导环节)$/.test(stage.title))) {
    console.warn(`[outline] ${label}: 第一项必须是审题环节，后续禁止固定菜单式标题`)
    warnings++
  }
  if ((stages[0]?.interactions || []).length) {
    console.warn(`[outline] ${label}: 审题环节（read-problem）禁止设计 interactions[]`)
    warnings++
  }
  if (isCore) {
    if (stages[1]?.slug !== 'entry-point') {
      console.warn(`[outline] ${label}: 第二项必须是 entry-point / 从哪入手`)
      warnings++
    }
    if (!outline.positioning?.represents || !outline.positioning?.generalSkill) {
      console.warn(`[outline] ${label}: positioning 缺 represents/generalSkill（开场定位）`)
      warnings++
    }
    if (!outline.entryPoint?.stuckPoint || !outline.entryPoint?.strategy) {
      console.warn(`[outline] ${label}: entryPoint 缺 stuckPoint/strategy（切入点分析）`)
      warnings++
    }
    if (!outline.closing?.recap) {
      console.warn(`[outline] ${label}: closing.recap 缺失（收尾拼装复盘）`)
      warnings++
    }
    const hasLoop = stages.some((stage) =>
      stage.loop && (Array.isArray(stage.loop.from) ? stage.loop.from.length : stage.loop.from) &&
      stage.loop.get)
    if (!hasLoop) {
      console.warn(`[outline] ${label}: 至少一个推导环节要写 loop（from→get）`)
      warnings++
    }
    const interactions = stages.flatMap((stage) => stage.interactions || [])
    const minInteractions = 2
    if (interactions.length < minInteractions) {
      console.warn(`[outline] ${label}: 互动题不足（需 ≥${minInteractions} 道，见 teaching-design.md）`)
      warnings++
    }
    const badInteraction = interactions.find((qa) =>
      !['oral', 'choice', 'fill'].includes(qa.form) || !qa.ask || !qa.answer ||
      !String(qa.tests || '').trim() ||
      (qa.form === 'choice' && !(qa.options?.length >= 2)))
    if (badInteraction) {
      console.warn(
        `[outline] ${label}: 互动题字段不完整（form/ask/answer/tests，choice 需 options；` +
        `tests 必须写清考察点）`
      )
      warnings++
    }
  }
  const quickQA = outline.quickQASkeleton || []
  if (outline.moduleType === 'example') {
    if (quickQA.length < 3 || quickQA.length > 5) {
      console.warn(`[outline] ${label}: example 的 quickQASkeleton 必须为 3–5 道`)
      warnings++
    }
    const invalidQuickQA = quickQA.find((item) =>
      !String(item.question || '').trim() || !String(item.answer || '').trim() ||
      /你觉得|说说|谈谈|你的思路|怎么做|如何做|有什么方法/.test(String(item.question || '')))
    if (invalidQuickQA) {
      console.warn(`[outline] ${label}: quickQASkeleton 必须是本题具体数据/关系题，且有唯一答案；禁止开放提问`)
      warnings++
    }
  } else if (quickQA.length) {
    console.warn(`[outline] ${label}: 仅 example 可配置 quickQASkeleton`)
    warnings++
  }
  if (outline.mathSkeleton || outline.phases) {
    console.warn(`[outline] ${label}: 新题不得继续写 mathSkeleton/phases`)
    warnings++
  }
  return warnings
}

function stepHasInteractionAsk(push) {
  return (push || []).some((block) => {
    if (block.attachStepId && block.answer != null) return false
    return block.type === 'choice' || block.type === 'oral' || block.type === 'fill'
  })
}

function stepHasOralRevealPush(push) {
  return (push || []).some((block) => block.attachStepId && block.answer != null)
}

function isPostAnswerStep(plan, step, index) {
  if (/_答_/.test(String(step.action || ''))) return true
  if (stepHasOralRevealPush(step.push)) return true
  if (index > 0) {
    const prev = plan.steps[index - 1]
    const prevAsk = stepHasInteractionAsk(prev.push)
    const thisAsk = stepHasInteractionAsk(step.push)
    const thisReveal = stepHasOralRevealPush(step.push)
    if (prevAsk && !thisAsk && !thisReveal) return true
  }
  return false
}

const POST_ANSWER_OPENING = [
  /^对[，,、！!？?\s]/,
  /^没错[！!，,、？?\s]/,
  /^不对[，,、！!？?\s]/,
  /^你说得对/,
  /^答对了/,
  /^答错了/,
  /^正确[，,、！!]/,
  /^错误[，,、！!]/
]

function checkPostAnswerNeutralNarration(plan, label, postAnswerBanned) {
  if (LEGACY_PRE_TTS.has(plan.id)) return 0
  let warnings = 0
  const steps = plan.steps || []
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (!isPostAnswerStep(plan, step, i)) continue
    const desc = String(step.agent?.description || '')
    if (!desc) continue
    let hit = POST_ANSWER_OPENING.some((re) => re.test(desc))
    if (!hit) {
      hit = (postAnswerBanned || []).some((token) => desc.includes(token))
    }
    if (hit) {
      console.warn(
        `[post-answer] ${label} ${step.id}: 答后口播不得判定对错或假定答对（${step.action}）`
      )
      warnings++
    }
  }
  return warnings
}

function main() {
  const bank = JSON.parse(fs.readFileSync(phraseBankPath, 'utf8'))
  const banned = bank.banned || []
  const postAnswerBanned = bank.postAnswerBanned || []
  const files = listPlanJsonFiles()
  let warnings = 0

  const starts = []
  for (const filePath of files) {
    const plan = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const desc = getStartDescription(plan)
    const label = path.join('lesson', plan.id, 'plan.json')
    starts.push({ file: label, id: plan.id, desc })
    warnings += checkReplaceKeys(plan, label)
    warnings += checkTextOnlyPlan(plan, label)
    warnings += checkScreenTextBrevity(plan, label)
    warnings += checkTtsNarration(plan, label)
    warnings += checkScreenMathSymbols(plan, label)
    warnings += checkGuideSlotCoverage(plan, label)
    warnings += checkStageInteraction(plan, label)
    warnings += checkReadProblemNoInteraction(plan, label)
    warnings += checkMathTypesetting(plan, label)
    warnings += checkAgentType(plan, label)
    warnings += checkPlanStructure(plan, label)
    warnings += checkOutlineStructure(filePath, label)
    warnings += checkPostAnswerNeutralNarration(plan, label, postAnswerBanned)

    for (const b of banned) {
      if (desc.includes(b)) {
        console.warn(`[banned] ${label}: 开场含禁用语「${b.slice(0, 20)}…」`)
        warnings++
      }
    }
  }

  for (let i = 0; i < starts.length; i++) {
    for (let j = i + 1; j < starts.length; j++) {
      const a = starts[i].desc.slice(0, 30)
      const b = starts[j].desc.slice(0, 30)
      if (a && a === b) {
        console.warn(
          `[duplicate] ${starts[i].file} 与 ${starts[j].file} 开场前 30 字相同`
        )
        warnings++
      }
    }
  }

  const outlineOnlyFiles = listOutlineOnlyJsonFiles()
  for (const outlinePath of outlineOnlyFiles) {
    const outline = JSON.parse(fs.readFileSync(outlinePath, 'utf8'))
    const lessonId = outline.id || path.basename(path.dirname(outlinePath))
    const label = path.join('lesson', lessonId, 'outline.json')
    warnings += checkOutlineStructure(outlinePath, label)
  }

  if (warnings === 0) {
    const outlineNote = outlineOnlyFiles.length
      ? `, ${outlineOnlyFiles.length} outline-only`
      : ''
    console.log('plan:check OK —', files.length, 'plan(s)' + outlineNote)
  } else {
    console.log('plan:check —', warnings, 'warning(s)')
    process.exitCode = 1
  }
}

const isMain = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (isMain) {
  main()
}

export {
  checkOutlineStructure,
  checkTextOnlyPlan,
  checkAgentType
}
