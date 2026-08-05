/**
 * 从已有 plan.json 反推 outline.json（维护范例用）
 * 按 guidanceChain + group 聚合，不解析 phase 名称
 * 用法: node scripts/sync-outline-from-plan.mjs vol1
 */
import fs from 'fs'
import path from 'path'
import { resolvePlanJson, lessonRel } from './lesson-paths.mjs'

function inferArchetype(plan) {
  const text = JSON.stringify(plan.analysis || '') + JSON.stringify(plan.steps || '')
  if (/周期|翻滚|次数/.test(text)) return 'patternCycle'
  if (/组合体|分段|端面|曲面/.test(text)) return 'compositeSplit'
  if (/面积相等|等面积|反求|逆用/.test(text)) return 'relationBridge'
  return 'directFormula'
}

function aggregatePhases(plan) {
  const chain = plan.guidanceChain || []
  return chain.map((stage, index) => {
    const group = index + 1
    const steps = (plan.steps || []).filter((step) => step.group === group)
    const notes = [...new Set(steps.map((step) => step.moduleNote).filter(Boolean))]
    return {
      slug: stage.slug || steps.find((step) => step.stageSlug)?.stageSlug || `stage-${group}`,
      title: stage.title,
      goal: stage.goal || stage.desc || notes[0] || '—',
      approach: notes.slice(0, 4).join('；') || '—',
      guidanceDesc: stage.desc || ''
    }
  })
}

function main() {
  const inputArg = process.argv[2]
  if (!inputArg) {
    console.error('Usage: node scripts/sync-outline-from-plan.mjs <id|plan.json>')
    process.exit(1)
  }
  const inputPath = resolvePlanJson(inputArg)
  if (!fs.existsSync(inputPath)) {
    console.error('File not found:', inputPath)
    process.exit(1)
  }
  const plan = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
  const teachingStages = aggregatePhases(plan)

  const outline = {
    id: plan.id,
    title: plan.title,
    stem: plan.stem,
    answer: plan.answer,
    unit: plan.unit,
    moduleType: plan.moduleType,
    difficulty: plan.difficulty,
    layout: plan.layout,
    figureTemplate: plan.figureTemplate,
    knowledgeTags: plan.knowledgeTags,
    lessonContext: plan.lessonContext || {
      slot: 'standalone',
      archetype: inferArchetype(plan),
      unitIntro: false,
      afterPlanId: null
    },
    analysis: plan.analysis || '',
    solution: plan.solution || [],
    analysisModel: plan.analysisModel || {
      stem: {
        known: plan.problemBrief?.known || ['（从题干提取）'],
        ask: plan.problemBrief?.ask || '（从题干提取）',
        knowledge: plan.knowledgeTags || [],
        key: plan.problemBrief?.key || ''
      },
      logicChain: plan.analysis ? [plan.analysis] : plan.mathSkeleton?.logicChain || [],
      computeSteps: plan.solution || plan.mathSkeleton?.computeSteps || []
    },
    problemBrief: plan.problemBrief,
    teachingStages,
    quickQASkeleton: (plan.quickQA || []).map((q) => ({
      form: q.form,
      topic: q.question,
      expected: q.expected
    })),
    outlineStatus: 'approved'
  }

  if (!outline.lessonContext.archetype) {
    outline.lessonContext.archetype = inferArchetype(plan)
  }

  const outPath = path.join(path.dirname(inputPath), 'outline.json')
  fs.writeFileSync(outPath, JSON.stringify(outline, null, 2) + '\n', 'utf8')
  console.log('Wrote', lessonRel(plan.id, 'outline.json'))
}

main()
