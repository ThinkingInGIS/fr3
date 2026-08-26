<script setup lang="ts">
import { Check, Command, Factory, Flag, Network, ScanSearch } from 'lucide-vue-next'
import { useMiningStore } from '../store'

const store=useMiningStore()
const stages=[
  {key:'COMMAND',label:'指令交互',sub:'自然语言输入',icon:Command},
  {key:'INTENT_UNDERSTANDING',label:'意图理解',sub:'语义与约束',icon:ScanSearch},
  {key:'TASK_PLANNING',label:'作业规划',sub:'长程任务分解',icon:Network},
  {key:'TASK_EXECUTION',label:'任务执行',sub:'感知与操作闭环',icon:Factory},
  {key:'COMPLETED',label:'作业完成',sub:'结果验证',icon:Flag},
] as const
const index=()=>({IDLE:0,COMMAND:0,INTENT_UNDERSTANDING:1,TASK_PLANNING:2,TASK_EXECUTION:3,COMPLETED:4,PAUSED:Math.max(0,stages.findIndex(s=>s.key===store.workflow.previousStage)),ERROR:Math.max(0,stages.findIndex(s=>s.key===store.workflow.previousStage))}[store.workflow.stage])
</script>

<template>
  <section class="workflow-strip">
    <div class="workflow-steps">
      <template v-for="(stage,i) in stages" :key="stage.key">
        <div :class="['workflow-step',{active:i===index(),completed:i<index(),error:store.workflow.stage==='ERROR'&&i===index()}]">
          <div class="step-icon"><Check v-if="i<index()" :size="17" /><component :is="stage.icon" v-else :size="17" /></div><div><b>0{{ i+1 }}</b><strong>{{ stage.label }}</strong><small>{{ stage.sub }}</small></div>
        </div><i v-if="i<stages.length-1" :class="['step-link',{completed:i<index()}]" />
      </template>
    </div>
    <div class="workflow-message"><span>当前状态</span><strong>{{ store.workflow.message }}</strong><em>{{ store.workflow.progress.toFixed(0) }}%</em></div>
  </section>
</template>
