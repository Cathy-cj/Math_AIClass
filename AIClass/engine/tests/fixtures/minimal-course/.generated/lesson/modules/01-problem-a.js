// @generated from standard plan problem-a; do not edit.
;(function () {
  window.__lessonRegisterModule({
  "id": "mod_problem_a",
  "title": "合成模块 A",
  "sideEffects": [
    {
      "id": "problem-a_step-01",
      "action": "测试_步骤01",
      "kind": "example",
      "containerIdx": 0,
      "group": 1,
      "description": "验证同卡更新和选择交互。",
      "figure": {
        "state": "focus"
      },
      "push": [
        {
          "type": "text",
          "region": "right",
          "replaceKey": "problem-a:readStem",
          "lines": [
            "合成内容 A；状态已更新"
          ]
        },
        {
          "type": "choice",
          "region": "right",
          "id": "synthetic-choice",
          "prompt": "请选择占位选项",
          "options": [
            {
              "label": "选项 A",
              "value": "A"
            },
            {
              "label": "选项 B",
              "value": "B"
            }
          ],
          "answer": "A",
          "onSubmit": "reportSingleChoice"
        }
      ]
    }
  ],
  "quickQA": [
    {
      "id": "qa-a",
      "question": "合成问题 A",
      "answer": "合成答案 A",
      "openAction": "测试_快问快答_打开",
      "questionAction": "测试_快问快答_显示问题",
      "answerAction": "测试_快问快答_显示答案"
    }
  ],
  "containers": [
    {
      "id": "c_problem_a",
      "label": "合成模块 A",
      "difficulty": 1,
      "layout": "left-right",
      "figure": "synthetic-board",
      "guidanceChain": [
        {
          "title": "阶段 A",
          "desc": "验证框架结构"
        }
      ],
      "textAccumulate": true,
      "steps": [
        {
          "id": "problem-a_start",
          "kind": "example",
          "action": "测试_开始",
          "description": "显示合成测试起始状态。",
          "figure": {
            "state": "default"
          },
          "push": [
            {
              "type": "text",
              "region": "top",
              "lines": [
                "合成内容 A"
              ]
            }
          ]
        }
      ]
    }
  ]
})
})()
