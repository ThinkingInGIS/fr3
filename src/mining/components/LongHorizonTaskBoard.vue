<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Check, ChevronDown, Circle, Clock3, ListTree, Pause, X } from 'lucide-vue-next'
import { useMiningStore } from '../store'
import type { TaskNodeStatus } from '../types'

const store=useMiningStore(),list=ref<HTMLElement>(),collapsed=ref(new Set<string>())
watch(()=>store.workflow.currentTaskId,async(id)=>{if(!id)return;await nextTick();list.value?.querySelector(`[data-task="${id}"]`)?.scrollIntoView({block:'nearest',behavior:'smooth'})})
const total=computed(()=>store.tasks.reduce((sum,parent)=>sum+(parent.children?.length??0),0)),done=computed(()=>store.tasks.flatMap(t=>t.children??[]).filter(t=>t.status==='COMPLETED').length)
const iconFor=(status:TaskNodeStatus)=>status==='COMPLETED'?Check:status==='RUNNING'?Clock3:status==='PAUSED'?Pause:status==='FAILED'?X:Circle
</script>

<template>
  <section class="mine-panel task-board">
    <div class="mine-panel-head"><div><h2>长程任务规划看板</h2></div><div class="task-total"><strong>{{ done }}</strong>/{{ total||9 }}</div></div>
    <div class="plan-summary"><ListTree :size="15" /><div><strong>{{ store.tasks.length||3 }} 个父任务 · {{ total||9 }} 个子任务</strong><span>{{ store.workflow.recognizedIntent??'等待意图理解与计划生成' }}</span></div><em>{{ store.workflow.progress.toFixed(0) }}%</em></div>
    <div ref="list" class="task-tree">
      <div v-if="!store.tasks.length" class="plan-empty"><i /><i /><i /><span>发送指令后动态生成任务计划</span></div>
      <div v-for="parent in store.tasks" :key="parent.id" class="parent-task">
        <button class="parent-row" @click="collapsed.has(parent.id)?collapsed.delete(parent.id):collapsed.add(parent.id)"><b>0{{ parent.order }}</b><div><strong>{{ parent.title }}</strong><span>{{ Math.round(parent.progress) }}% · {{ parent.status }}</span></div><i class="parent-progress"><span :style="{width:`${parent.progress}%`}" /></i><ChevronDown :class="{rotated:collapsed.has(parent.id)}" :size="13" /></button>
        <div v-if="!collapsed.has(parent.id)" class="child-list">
          <div v-for="child in parent.children" :key="child.id" :data-task="child.id" :class="['child-task',child.status.toLowerCase()]">
            <component :is="iconFor(child.status)" :size="12" /><b>{{ parent.order }}.{{ child.order }}</b><div><strong>{{ child.title }}</strong><span>{{ child.description }}</span></div><em>{{ child.status==='RUNNING'?`${Math.round(child.progress)}%`:child.status==='COMPLETED'?(child.durationMs?`${(child.durationMs/1000).toFixed(1)}s`:'完成'):'待执行' }}</em>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
