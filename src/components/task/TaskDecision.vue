<script setup lang="ts">
import { computed } from 'vue'
import { BrainCircuit, Check, ChevronRight, Clock3, Crosshair, Route, ShieldCheck, Sparkles } from 'lucide-vue-next'
import { runtimeConfig } from '@/config/runtime'
import { useTaskStore } from '@/stores/task'
import type { TaskStage } from '@/types/task'

const task = useTaskStore()
const actions = ['接近', '视觉精定位', '抓取', '提升', '搬运', '放置', '验证']
const actionOrder: Partial<Record<TaskStage, number>> = { APPROACH: 0, VISUAL_SERVO: 1, GRASP: 2, LIFT: 3, TRANSPORT: 4, PLACE: 5, VERIFY: 6 }
const actionIndex = computed(() => actionOrder[task.current.stage] ?? -1)
const stageLabel = computed(() => ({ IDLE:'待命', PERCEPTION:'场景感知', TARGET_SELECTION:'目标选择', MOTION_PLANNING:'运动规划', APPROACH:'接近目标', VISUAL_SERVO:'视觉精定位', GRASP:'夹爪抓取', LIFT:'稳定提升', TRANSPORT:'搬运目标', PLACE:'柔顺放置', VERIFY:'结果验证', FINISH:'任务完成', PAUSED:'任务暂停', ERROR:'系统异常' }[task.current.stage]))
</script>

<template>
  <section class="panel decision-panel">
    <div class="panel-head"><div><span class="eyebrow">TASK INTELLIGENCE</span><h2>任务决策与动作计划</h2></div><BrainCircuit :size="21" class="accent-icon" /></div>
    <div class="mission-card"><span>总任务目标</span><strong>{{ task.current.taskName }}</strong><small>{{ task.current.message }}</small><div class="mission-progress"><i :style="{ width: `${task.current.progress / task.current.total * 100}%` }" /></div></div>
    <div class="target-pair"><div><span>当前目标</span><strong><Crosshair :size="14" />{{ task.current.targetId ?? '—' }}</strong></div><ChevronRight :size="17" /><div><span>下一槽位</span><strong>{{ task.current.targetSlotId ?? '—' }}</strong></div></div>
    <div class="section-label"><Sparkles :size="13" />目标选择依据 <em v-if="runtimeConfig.dataSource === 'mock'">演示数据</em></div>
    <div class="reason-grid">
      <span v-for="reason in task.current.reasons" :key="reason"><Check :size="12" />{{ reason }}</span>
      <span v-if="!task.current.reasons.length" class="placeholder">等待目标评估</span>
    </div>
    <div class="section-label"><Route :size="13" />动作计划 <small>{{ stageLabel }}</small></div>
    <div class="action-plan">
      <div v-for="(action, index) in actions" :key="action" :class="{ active: index === actionIndex, done: index < actionIndex }"><i>{{ index < actionIndex ? '✓' : index + 1 }}</i><span>{{ action }}</span></div>
    </div>
    <div class="metrics-row">
      <div><Clock3 :size="14" /><span>规划耗时</span><strong>{{ task.current.planningMs ?? '—' }}<small v-if="task.current.planningMs"> ms</small></strong></div>
      <div><Route :size="14" /><span>轨迹长度</span><strong>{{ task.current.trajectoryLengthM ?? '—' }}<small v-if="task.current.trajectoryLengthM"> m</small></strong></div>
      <div><ShieldCheck :size="14" /><span>抓取评分</span><strong>{{ task.current.graspScore ? Math.round(task.current.graspScore * 100) : '—' }}<small v-if="task.current.graspScore">%</small></strong></div>
    </div>
  </section>
</template>
