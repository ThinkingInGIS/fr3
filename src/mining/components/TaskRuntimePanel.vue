<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { BrainCircuit, Clock3, Crosshair, Target } from 'lucide-vue-next'
import { useMiningStore } from '../store'

const store=useMiningStore(),now=ref(Date.now()),timer=window.setInterval(()=>now.value=Date.now(),500)
onBeforeUnmount(()=>window.clearInterval(timer))
const elapsed=computed(()=>store.workflow.startedAt?Math.max(0,now.value-store.workflow.startedAt):0),format=(ms:number)=>`${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`
</script>
<template>
  <section class="mine-panel runtime-card">
    <div class="mine-panel-head compact"><div><h2>系统作业信息</h2></div><em>{{ store.workflow.stage }}</em></div>
    <div class="runtime-top"><div><Clock3 :size="14" /><span>总执行时间</span><strong>{{ format(elapsed) }}</strong></div><div><BrainCircuit :size="14" /><span>规划耗时</span><strong>{{ store.workflow.planningDurationMs??'—' }}<small v-if="store.workflow.planningDurationMs"> ms</small></strong></div><div><Target :size="14" /><span>剩余子任务</span><strong>{{ store.remainingTasks }}</strong></div></div>
    <div class="runtime-info"><div><span>当前任务</span><strong>{{ store.currentTask?.title??'等待任务' }}</strong></div><div><span>当前对象</span><strong><Crosshair :size="12" />{{ store.workflow.currentObjectId??'—' }}</strong></div><div class="wide"><span>决策说明</span><strong>{{ store.workflow.decisionReasons.join(' · ')||'等待意图理解结果' }}</strong></div></div>
    <div class="runtime-progress"><span>整体进度</span><i><b :style="{width:`${store.workflow.progress}%`}" /></i><strong>{{ store.workflow.progress.toFixed(0) }}%</strong><em>{{ store.lastActionResult }}</em></div>
  </section>
</template>
