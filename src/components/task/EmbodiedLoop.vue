<script setup lang="ts">
import { BrainCircuit, Eye, Hand, MessageCircleMore, Route } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'

const task = useTaskStore()
const stages = [
  { name: '感知', sub: '多模态观测', icon: Eye }, { name: '理解', sub: '世界模型', icon: BrainCircuit },
  { name: '规划', sub: '任务与运动', icon: Route }, { name: '执行', sub: '操作与控制', icon: Hand },
  { name: '反馈', sub: '闭环校正', icon: MessageCircleMore },
]
</script>

<template>
  <section class="loop-strip">
    <div class="loop-title"><span class="eyebrow">EMBODIED LOOP</span><strong>具身智能闭环</strong></div>
    <div class="loop-stages">
      <template v-for="(stage, index) in stages" :key="stage.name">
        <div :class="['loop-stage', { active: task.activeLoop === stage.name }]"><component :is="stage.icon" :size="17" /><div><strong>{{ stage.name }}</strong><small>{{ stage.sub }}</small></div></div>
        <i v-if="index < stages.length - 1" class="flow-line"><span /></i>
      </template>
    </div>
    <div class="loop-state"><span class="pulse-ring" /><div><span>CURRENT LOOP</span><strong>{{ task.current.message }}</strong></div></div>
  </section>
</template>
