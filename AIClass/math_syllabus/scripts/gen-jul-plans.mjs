/**
 * One-off generator for solid-jul22-23 lesson plans
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

function writePlan(id, plan) {
  const dir = path.join(root, 'lesson', id)
  fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify(plan, null, 2), 'utf8')
  console.log('Wrote', id, 'plan.json', 'steps:', plan.steps.length)
}

const tiltPlan = {
  schemaVersion: 1,
  id: 'tilt-container-water',
  title: '倾斜容器中的水',
  source: '25-26五年级下·河南洛阳·期末',
  moduleType: 'example',
  difficulty: 4,
  layout: 'left-right',
  quickQALayout: 'above-body',
  figureTemplate: 'tilt-container-water',
  outlineId: 'tilt-container-water',
  lessonContext: {
    slot: 'standalone',
    archetype: 'compositeSplit',
    unitIntro: false,
    afterPlanId: null
  },
  problemBrief: {
    known: ['深$4$dm', '底面积$4$dm²', '倾斜时水不溢出'],
    ask: '水的体积',
    key: '水面顶开口'
  },
  guidanceLayout: 'interleaved',
  guidanceChain: [
    { title: '审题环节' },
    { title: '从哪入手' },
    { title: '拆分·看清水的形状' },
    { title: '读高·从不溢出定水深' },
    { title: '提取已知' },
    { title: '列式计算' }
  ],
  quickQA: [
    { id: 'qa1', question: '底面积4平方分米，所以底面边长是4分米，对不对？', answer: '不对，边长是2分米' },
    { id: 'qa2', question: '容器深度是多少分米？', answer: '4' },
    { id: 'qa3', question: '底面积是多少平方分米？', answer: '4' },
    { id: 'qa4', question: '倾斜时水刚好不溢出，说明水面已经顶到容器开口，对不对？', answer: '对' }
  ],
  steps: []
}

const P = '例1_'
const stem =
  '有一个深4分米的长方体容器，其内部底面是一个面积为4平方分米的正方形，当容器底面的一边紧紧贴着桌面倾斜时（如图）容器里面的水刚好不溢出，容器里面的水有多少立方分米？'

const steps = [
  {
    id: 'start',
    action: `${P}开始`,
    phase: '开场',
    group: 0,
    agent: {
      type: 'explain',
      description:
        '立体图一出现别慌，先把给了什么、要什么说清楚。这题代表倾斜容器装水——形状不规则，但体积能拆成规则体。带走的方法是化整为零，把复杂形体拆成标准长方体再求和。容器一斜，水还是那些水，咱们看看怎么算。'
    },
    figure: { state: 'default' },
    push: [{ type: 'text', region: 'top', lines: [stem] }]
  },
  {
    id: 's01',
    action: `${P}步骤01_展_读深`,
    phase: '审题环节',
    group: 1,
    problemBrief: { known: 1, ask: false, key: false },
    agent: {
      type: 'explain',
      description: '先审题。题目说容器深四分米，这是容器的高度，先记下来。'
    },
    figure: { state: 'default', actions: [{ op: 'highlight', targets: ['container'] }] },
    push: []
  },
  {
    id: 's02',
    action: `${P}步骤02_展_读底面积`,
    phase: '审题环节',
    group: 1,
    problemBrief: { known: 2, ask: false, key: false },
    agent: {
      type: 'explain',
      description:
        '底面是正方形，面积四平方分米。注意，四平方分米不等于边长四分米，边长要开方，是二分米。'
    },
    figure: { state: 'default', actions: [{ op: 'label', targets: ['base'], text: 'S=4' }] },
    push: []
  },
  {
    id: 's03',
    action: `${P}步骤03_展_读条件`,
    phase: '审题环节',
    group: 1,
    problemBrief: { known: 3, ask: true, key: false },
    agent: {
      type: 'explain',
      description:
        '关键条件：倾斜时水刚好不溢出。这说明水面已经顶到容器开口，不能再多一滴。求的是水的体积。'
    },
    figure: { state: 'default', actions: [{ op: 'highlight', targets: ['waterline'] }] },
    push: []
  },
  {
    id: 's04',
    action: `${P}步骤04_展_审题收束`,
    phase: '审题环节',
    group: 1,
    problemBrief: { known: 3, ask: true, key: true },
    agent: {
      type: 'explain',
      description:
        '这题要用长方体体积和组合体拆分。切入范式是化整为零。这题四颗星，公式你都学过，细心一点就成。'
    },
    figure: { state: 'default' },
    push: [{ type: 'text', region: 'right', replaceKey: 'tilt-container-water:strategy', lines: ['化整为零'] }]
  },
  {
    id: 's05',
    action: `${P}步骤05_展_切入点`,
    phase: '从哪入手',
    group: 2,
    agent: {
      type: 'explain',
      description:
        '水不是规规矩矩的长方体，直接套公式找不到长宽高。先看倾斜后水面长什么样，哪些部分满、哪些只有一半。别量容器外壳，那是壳不是水。'
    },
    figure: { state: 'default', actions: [{ op: 'highlight', targets: ['water'] }] },
    push: [{ type: 'text', region: 'right', replaceKey: 'tilt-container-water:entry', lines: ['先拆形状'] }]
  },
  {
    id: 's05b',
    action: `${P}步骤05b_问_切入点`,
    phase: '从哪入手',
    group: 2,
    agent: { type: 'ask', description: '这题应先观察水面形状，还是直接量容器长宽高？' },
    figure: { state: 'default' },
    push: [
      {
        type: 'choice',
        region: 'right',
        id: 'entry-choice',
        prompt: '先做什么？',
        options: [
          { label: '量容器长宽高', value: 'A' },
          { label: '观察水面形状', value: 'B' }
        ],
        answer: 'B',
        onSubmit: 'reportSingleChoice'
      }
    ],
    userResponse: true
  },
  {
    id: 's05c',
    action: `${P}步骤05c_答_切入点`,
    phase: '从哪入手',
    group: 2,
    agent: {
      type: 'explain',
      description: '关键在先看水面怎么分布，再决定怎么拆。'
    },
    figure: { state: 'default' },
    push: []
  },
  {
    id: 's06',
    action: `${P}步骤06_问_怎么拆`,
    phase: '拆分·看清水的形状',
    group: 3,
    agent: { type: 'ask', description: '看图说话，你发现了什么？倾斜时水最适合怎么拆？' },
    figure: { state: 'split', actions: [{ op: 'highlight', targets: ['lower', 'upper'] }] },
    push: [
      {
        type: 'choice',
        region: 'right',
        id: 'split-choice',
        prompt: '水怎么拆？',
        options: [
          { label: '整箱长方体', value: 'A' },
          { label: '下半满+上半半满', value: 'B' },
          { label: '全当三角形', value: 'C' }
        ],
        answer: 'B',
        onSubmit: 'reportSingleChoice'
      }
    ],
    userResponse: true
  },
  {
    id: 's07',
    action: `${P}步骤07_答_怎么拆`,
    phase: '拆分·看清水的形状',
    group: 3,
    agent: {
      type: 'explain',
      description:
        '标准做法是拆成两块：下面一段是满的长方体，上面一段是只有一半水的长方体。关键在这一步——化整为零。'
    },
    figure: { state: 'split' },
    push: [
      {
        type: 'text',
        region: 'right',
        replaceKey: 'tilt-container-water:split-lower',
        lines: ['下段：满长方体']
      }
    ]
  },
  {
    id: 's08',
    action: `${P}步骤08_展_上段半满`,
    phase: '拆分·看清水的形状',
    group: 3,
    agent: {
      type: 'explain',
      description: '上面斜着的那段，有效高度三分米，但水只占了其中一半，相当于半个长方体。'
    },
    figure: { state: 'split', actions: [{ op: 'highlight', targets: ['upper'] }] },
    push: [
      {
        type: 'text',
        region: 'right',
        replaceKey: 'tilt-container-water:split-upper',
        lines: ['上段：半长方体']
      }
    ]
  },
  {
    id: 's09',
    action: `${P}步骤09_展_读低水深`,
    phase: '读高·从不溢出定水深',
    group: 4,
    agent: {
      type: 'explain',
      description: '拆分后缺高度。从不溢出可以反推：最低处水深是一分米，这一段是满的。'
    },
    figure: { state: 'heights', actions: [{ op: 'label', targets: ['h1'], text: 'h=1' }] },
    push: [{ type: 'text', region: 'right', replaceKey: 'tilt-container-water:h1', lines: ['$h_1=1$ dm'] }]
  },
  {
    id: 's10',
    action: `${P}步骤10_问_低水深`,
    phase: '读高·从不溢出定水深',
    group: 4,
    agent: { type: 'ask', description: '下半段满水高度是多少分米？填一填。' },
    figure: { state: 'heights' },
    push: [
      {
        type: 'fill',
        region: 'right',
        id: 'h1-fill',
        prompt: '下半段高（dm）',
        answer: '1',
        onSubmit: 'reportFill'
      }
    ],
    userResponse: true
  },
  {
    id: 's11',
    action: `${P}步骤11_答_低水深`,
    phase: '读高·从不溢出定水深',
    group: 4,
    agent: {
      type: 'explain',
      description: '不管刚才填多少，关键在最低处是一分米。其余三分米是斜面段，只算一半体积。'
    },
    figure: { state: 'heights', actions: [{ op: 'label', targets: ['h2'], text: 'h=3' }] },
    push: [{ type: 'text', region: 'right', replaceKey: 'tilt-container-water:h2', lines: ['$h_2=3$ dm（半满）'] }]
  },
  {
    id: 's12',
    action: `${P}步骤12_展_清点数据`,
    phase: '提取已知',
    group: 5,
    agent: { type: 'explain', description: '先把数据清点一遍——底面积四分米，下段高一分米，上段有效高三分米且半满。' },
    figure: { state: 'heights' },
    push: [
      {
        type: 'text',
        region: 'right',
        replaceKey: 'tilt-container-water:data',
        lines: ['$S=4$ dm²', '$h_1=1$ dm', '$h_2=3$ dm']
      }
    ]
  },
  {
    id: 's12b',
    action: `${P}步骤12b_问_底面积`,
    phase: '提取已知',
    group: 5,
    agent: { type: 'ask', description: '列式用的底面积是多少？' },
    figure: { state: 'heights' },
    push: [
      {
        type: 'fill',
        region: 'right',
        id: 's-fill',
        prompt: '底面积（dm²）',
        answer: '4',
        onSubmit: 'reportFill'
      }
    ],
    userResponse: true
  },
  {
    id: 's12c',
    action: `${P}步骤12c_答_底面积`,
    phase: '提取已知',
    group: 5,
    agent: { type: 'explain', description: '底面积是四平方分米，两段体积都用它。' },
    figure: { state: 'heights' },
    push: []
  },
  {
    id: 's13',
    action: `${P}步骤13_算_下段体积`,
    phase: '列式计算',
    group: 6,
    agent: { type: 'explain', description: '列式走起，一步一步来。先算下段满长方体：四乘一。' },
    figure: { state: 'compute', actions: [{ op: 'highlight', targets: ['lower'] }] },
    push: [{ type: 'text', region: 'right', replaceKey: 'tilt-container-water:calc1', lines: ['$4\\times1=4$'] }]
  },
  {
    id: 's14',
    action: `${P}步骤14_算_上段体积`,
    phase: '列式计算',
    group: 6,
    agent: { type: 'explain', description: '再算上段半长方体：四乘三再除以二。' },
    figure: { state: 'compute', actions: [{ op: 'highlight', targets: ['upper'] }] },
    push: [{ type: 'text', region: 'right', replaceKey: 'tilt-container-water:calc2', lines: ['$4\\times3\\div2=6$'] }]
  },
  {
    id: 's15',
    action: `${P}步骤15_算_求和`,
    phase: '列式计算',
    group: 6,
    agent: {
      type: 'explain',
      description:
        '四加六等于十立方分米。四星拆分形状、三星读高、三星列式——化整为零把斜水变规则。不规则装水先拆成规则体，再分别套体积公式。'
    },
    figure: { state: 'compute' },
    push: [
      {
        type: 'text',
        region: 'right',
        replaceKey: 'tilt-container-water:answer',
        lines: ['$4+6=10$', '答：$10$ dm³']
      }
    ]
  },
  {
    id: 's15b',
    action: `${P}步骤15b_问_验算`,
    phase: '列式计算',
    group: 6,
    agent: { type: 'ask', description: '四加六等于多少立方分米？' },
    figure: { state: 'compute' },
    push: [
      {
        type: 'fill',
        region: 'right',
        id: 'sum-fill',
        prompt: '体积（dm³）',
        answer: '10',
        onSubmit: 'reportFill'
      }
    ],
    userResponse: true
  },
  {
    id: 's15c',
    action: `${P}步骤15c_答_验算`,
    phase: '列式计算',
    group: 6,
    agent: { type: 'explain', description: '合起来是十立方分米，与拆分结果一致。' },
    figure: { state: 'compute' },
    push: []
  }
]

tiltPlan.steps = steps
writePlan('tilt-container-water', tiltPlan)

const practicePlan = {
  schemaVersion: 1,
  id: 'corner-cut-cube',
  title: '缺角正方体的表面积与体积',
  source: '2025·四川成都·小升初真题',
  moduleType: 'practice',
  difficulty: 4,
  layout: 'left-right',
  figureTemplate: 'corner-cut-cube',
  outlineId: 'corner-cut-cube',
  lessonContext: {
    slot: 'afterExample',
    archetype: 'compositeSplit',
    unitIntro: false,
    afterPlanId: 'tilt-container-water'
  },
  problemBrief: {
    known: ['大棱长$10$cm', '挖去$4$cm小正方体'],
    ask: '表面积和体积',
    key: '挖角不增表面积'
  },
  guidanceLayout: 'interleaved',
  guidanceChain: [
    { title: '审题环节' },
    { title: '从哪入手' },
    { title: '表面积·外表面看整体' },
    { title: '体积·大减小' },
    { title: '提取已知' },
    { title: '列式计算' }
  ],
  steps: []
}

const PP = '练1_'
const pStem = '求这个图形的表面积和体积。（单位：厘米）'

const pSteps = [
  {
    id: 'start',
    action: `${PP}开始`,
    phase: '开场',
    group: 0,
    agent: {
      type: 'explain',
      description:
        '例题带完了，换你上手。同一套路，换个图形，你还抓得住吗？角上挖掉一块，外表还是原来那么大吗？'
    },
    figure: { state: 'default' },
    push: [{ type: 'text', region: 'top', lines: [pStem] }],
    moduleNote: '入口后调用 手写板_显示，logAction 为本题入口 action 练1_开始；学生提交后进入审题讲解'
  },
  {
    id: 's01',
    action: `${PP}步骤01_展_读大棱长`,
    phase: '审题环节',
    group: 1,
    problemBrief: { known: 1, ask: false, key: false },
    agent: { type: 'explain', description: '结合图看，大正方体棱长十厘米。' },
    figure: { state: 'default', actions: [{ op: 'highlight', targets: ['big'] }] },
    push: []
  },
  {
    id: 's02',
    action: `${PP}步骤02_展_读挖去`,
    phase: '审题环节',
    group: 1,
    problemBrief: { known: 2, ask: true, key: false },
    agent: {
      type: 'explain',
      description: '从一个角挖去棱长四厘米的小正方体。要同时求表面积和体积，别只求一个。'
    },
    figure: { state: 'default', actions: [{ op: 'highlight', targets: ['cut'] }] },
    push: []
  },
  {
    id: 's03',
    action: `${PP}步骤03_展_审题收束`,
    phase: '审题环节',
    group: 1,
    problemBrief: { known: 2, ask: true, key: true },
    agent: {
      type: 'explain',
      description: '挖角不改变外表面积，这是防坑关键。切入范式是外整内减。这题四颗星，拆开看每步都不难。'
    },
    figure: { state: 'default' },
    push: [{ type: 'text', region: 'right', replaceKey: 'corner-cut-cube:strategy', lines: ['外整内减'] }]
  },
  {
    id: 's04',
    action: `${PP}步骤04_展_切入点`,
    phase: '从哪入手',
    group: 2,
    agent: {
      type: 'explain',
      description:
        '缺了一个角，表面积是加还是减容易搞混。先看挖掉的是哪一块，再数外表面有没有多出新的面。不能逐面硬数，也不能把挖去的面算进外表。'
    },
    figure: { state: 'default', actions: [{ op: 'highlight', targets: ['surface'] }] },
    push: [{ type: 'text', region: 'right', replaceKey: 'corner-cut-cube:entry', lines: ['外表看整体'] }]
  },
  {
    id: 's04b',
    action: `${PP}步骤04b_问_切入点`,
    phase: '从哪入手',
    group: 2,
    agent: { type: 'ask', description: '求表面积时，应先逐面数，还是先看外表是否变化？' },
    figure: { state: 'default' },
    push: [
      {
        type: 'choice',
        region: 'right',
        id: 'p-entry-choice',
        prompt: '表面积先做什么？',
        options: [
          { label: '逐面数', value: 'A' },
          { label: '看外表是否变化', value: 'B' }
        ],
        answer: 'B',
        onSubmit: 'reportSingleChoice'
      }
    ],
    userResponse: true
  },
  {
    id: 's04c',
    action: `${PP}步骤04c_答_切入点`,
    phase: '从哪入手',
    group: 2,
    agent: { type: 'explain', description: '关键在判断挖角后外表有没有多出新的面。' },
    figure: { state: 'default' },
    push: []
  },
  {
    id: 's05',
    action: `${PP}步骤05_问_表面积`,
    phase: '表面积·外表面看整体',
    group: 3,
    agent: { type: 'ask', description: '挖角后外表面积怎么算？' },
    figure: { state: 'surface', actions: [{ op: 'highlight', targets: ['outer'] }] },
    push: [
      {
        type: 'choice',
        region: 'right',
        id: 'sa-choice',
        prompt: '表面积算法',
        options: [
          { label: '逐面相加', value: 'A' },
          { label: '等于完整大正方体', value: 'B' },
          { label: '大减小正方体', value: 'C' }
        ],
        answer: 'B',
        onSubmit: 'reportSingleChoice'
      }
    ],
    userResponse: true
  },
  {
    id: 's06',
    action: `${PP}步骤06_答_表面积`,
    phase: '表面积·外表面看整体',
    group: 3,
    agent: {
      type: 'explain',
      description:
        '标准做法是外表仍等于完整大正方体。挖去的三个面与露出的三个面抵消，外表不变。'
    },
    figure: { state: 'surface' },
    push: [
      {
        type: 'text',
        region: 'right',
        replaceKey: 'corner-cut-cube:sa-idea',
        lines: ['$S=6a^2$（大正方体）']
      }
    ]
  },
  {
    id: 's07',
    action: `${PP}步骤07_问_体积`,
    phase: '体积·大减小',
    group: 4,
    agent: { type: 'ask', description: '体积应怎么列式？' },
    figure: { state: 'volume', actions: [{ op: 'highlight', targets: ['cut'] }] },
    push: [
      {
        type: 'choice',
        region: 'right',
        id: 'vol-choice',
        prompt: '体积列式',
        options: [
          { label: '$10^3+4^3$', value: 'A' },
          { label: '$10^3-4^3$', value: 'B' },
          { label: '$10^3\\times4^3$', value: 'C' }
        ],
        answer: 'B',
        onSubmit: 'reportSingleChoice'
      }
    ],
    userResponse: true
  },
  {
    id: 's08',
    action: `${PP}步骤08_答_体积`,
    phase: '体积·大减小',
    group: 4,
    agent: {
      type: 'explain',
      description: '不管刚才怎么选，关键在大减小。挖空就是去掉一块，用大正方体体积减小正方体体积。'
    },
    figure: { state: 'volume' },
    push: [
      {
        type: 'text',
        region: 'right',
        replaceKey: 'corner-cut-cube:vol-idea',
        lines: ['$V=10^3-4^3$']
      }
    ]
  },
  {
    id: 's09',
    action: `${PP}步骤09_展_清点`,
    phase: '提取已知',
    group: 5,
    agent: { type: 'explain', description: '思路理清了，把已知条件摆上台面。大棱长十厘米，小棱长四厘米。' },
    figure: { state: 'volume' },
    push: [
      {
        type: 'text',
        region: 'right',
        replaceKey: 'corner-cut-cube:data',
        lines: ['$a=10$ cm', '小棱长$4$ cm']
      }
    ]
  },
  {
    id: 's09b',
    action: `${PP}步骤09b_问_大棱长`,
    phase: '提取已知',
    group: 5,
    agent: { type: 'ask', description: '大正方体棱长是多少厘米？' },
    figure: { state: 'volume' },
    push: [
      {
        type: 'fill',
        region: 'right',
        id: 'a-fill',
        prompt: '大棱长（cm）',
        answer: '10',
        onSubmit: 'reportFill'
      }
    ],
    userResponse: true
  },
  {
    id: 's09c',
    action: `${PP}步骤09c_答_大棱长`,
    phase: '提取已知',
    group: 5,
    agent: { type: 'explain', description: '大棱长十厘米，表面积和体积都要用到。' },
    figure: { state: 'volume' },
    push: []
  },
  {
    id: 's10',
    action: `${PP}步骤10_算_表面积`,
    phase: '列式计算',
    group: 6,
    agent: { type: 'explain', description: '到了算账环节——先算表面积。十乘十乘六。' },
    figure: { state: 'compute', actions: [{ op: 'highlight', targets: ['outer'] }] },
    push: [{ type: 'text', region: 'right', replaceKey: 'corner-cut-cube:calc-s', lines: ['$10\\times10\\times6=600$'] }]
  },
  {
    id: 's11',
    action: `${PP}步骤11_算_体积`,
    phase: '列式计算',
    group: 6,
    agent: { type: 'explain', description: '再算体积。十的三次方减四的三次方。' },
    figure: { state: 'compute', actions: [{ op: 'highlight', targets: ['solid'] }] },
    push: [
      {
        type: 'text',
        region: 'right',
        replaceKey: 'corner-cut-cube:calc-v',
        lines: ['$10^3-4^3=936$']
      }
    ]
  },
  {
    id: 's12',
    action: `${PP}步骤12_算_答案`,
    phase: '列式计算',
    group: 6,
    agent: {
      type: 'explain',
      description:
        '表面积六百平方厘米，体积九百三十六立方厘米。五星外表看整体、四星体积大减小、三星列式——挖角组合体双求。挖角不改变外表，体积用大减小。'
    },
    figure: { state: 'compute' },
    push: [
      {
        type: 'text',
        region: 'right',
        replaceKey: 'corner-cut-cube:answer',
        lines: ['$S=600$ cm²', '$V=936$ cm³']
      }
    ]
  },
  {
    id: 's12b',
    action: `${PP}步骤12b_问_体积`,
    phase: '列式计算',
    group: 6,
    agent: { type: 'ask', description: '体积是多少立方厘米？' },
    figure: { state: 'compute' },
    push: [
      {
        type: 'fill',
        region: 'right',
        id: 'v-fill',
        prompt: '体积（cm³）',
        answer: '936',
        onSubmit: 'reportFill'
      }
    ],
    userResponse: true
  },
  {
    id: 's12c',
    action: `${PP}步骤12c_答_体积`,
    phase: '列式计算',
    group: 6,
    agent: { type: 'explain', description: '体积九百三十六立方厘米，与大减小思路一致。' },
    figure: { state: 'compute' },
    push: []
  }
]

practicePlan.steps = pSteps
writePlan('corner-cut-cube', practicePlan)
