/** 供 check-phrase-variety 测试用的最小 outline 工厂 */

export function makeDerivationStage(index, withInteraction = false) {
  const stage = {
    slug: `derive-${index}`,
    title: `推导环节${index}`,
    goal: '建立关系',
    approach: '动机到操作',
    loop: { from: [`已知${index}`], get: `中间量${index}` },
    difficulty: 3
  }
  if (withInteraction) {
    stage.interactions = [{
      form: 'oral',
      ask: '这一步求什么？',
      answer: '中间量',
      tests: '考察推导目标'
    }]
  }
  return stage
}

/** example：9 环节长链（无上限校验） */
export function makeLongChainOutline() {
  const teachingStages = [
    {
      slug: 'read-problem',
      title: '审题环节',
      goal: '读题',
      approach: '标条件'
    },
    {
      slug: 'entry-point',
      title: '从哪入手',
      goal: '定范式',
      approach: '找卡点'
    },
    ...Array.from({ length: 5 }, (_, i) => makeDerivationStage(i + 1, i === 0)),
    {
      slug: 'extract-known',
      title: '提取已知',
      goal: '清点数据',
      approach: '亮标',
      interactions: [{
        form: 'choice',
        ask: '底面积是多少？',
        options: ['12.56', '25.12'],
        answer: '12.56',
        tests: '考察数据对应'
      }]
    },
    {
      slug: 'compute',
      title: '列式计算',
      goal: '得答案',
      approach: '列式'
    }
  ]

  return {
    id: 'fixture-long-chain',
    moduleType: 'example',
    title: '长链测试题',
    analysisModel: {
      stem: {
        known: ['r＝2'],
        ask: '求体积',
        knowledge: ['体积公式'],
        key: '别漏⅓'
      },
      logicChain: ['分段', '分别求体积', '相加'],
      computeSteps: ['S', 'V柱', 'V锥', '合计']
    },
    problemBrief: {
      known: ['r＝2dm'],
      ask: '求组合体体积',
      key: '圆锥要乘⅓'
    },
    positioning: {
      hook: '组合体',
      represents: '分段体积',
      generalSkill: '化整为零'
    },
    entryPoint: {
      stuckPoint: '不知先算什么',
      strategy: '化整为零',
      observe: '上下两段',
      rejectedPaths: ['一次列总式']
    },
    closing: {
      recap: '五星分段加四星关系',
      takeaway: '分段再合并'
    },
    teachingStages,
    quickQASkeleton: [
      { question: '圆锥体积要乘⅓吗？', answer: '要', tests: '公式辨析' },
      { question: '圆柱底面积公式？', answer: 'πr²', tests: '基础公式' },
      { question: '组合体先拆还是先算？', answer: '先拆', tests: '策略' }
    ],
    outlineStatus: 'draft'
  }
}

/** 缺 positioning，应触发 outline 结构告警 */
export function makeBrokenOutline() {
  const base = makeLongChainOutline()
  delete base.positioning
  base.id = 'fixture-broken'
  return base
}
