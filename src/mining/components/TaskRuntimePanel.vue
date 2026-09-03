<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { BrainCircuit, Clock3, Crosshair, Target } from 'lucide-vue-next'
import { useMiningStore } from '../store'

const store = useMiningStore(), now = ref(Date.now()), timer = window.setInterval(() => now.value = Date.now(), 500)
onBeforeUnmount(() => window.clearInterval(timer))
const rosRuntime = computed(() => store.mode === 'ros' && Boolean(store.runtime.taskId))
const elapsed = computed(() => {
  if (rosRuntime.value) return Math.max(0, store.runtime.elapsedMs + (store.runtime.running ? now.value - store.runtime.updatedAt : 0))
  return store.workflow.startedAt ? Math.max(0, now.value - store.workflow.startedAt) : 0
})
const currentTaskTitle = computed(() => rosRuntime.value ? store.runtime.currentTaskTitle : store.currentTask?.title)
const planningDuration = computed(() => rosRuntime.value ? store.runtime.planningDurationMs : store.workflow.planningDurationMs)
const currentObjectId = computed(() => rosRuntime.value ? store.runtime.currentObjectId : store.workflow.currentObjectId)
const overallProgress = computed(() => rosRuntime.value ? store.runtime.overallProgress : store.workflow.progress)
const lastResult = computed(() => rosRuntime.value ? store.runtime.lastActionResult : store.lastActionResult)
const format = (ms: number) => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`
</script>
<template>
  <section class="mine-panel runtime-card">
    <div class="mine-panel-head compact">
      <div>
        <h2>作业信息</h2>
      </div><em>{{ store.workflow.stage }}</em>
    </div>
    <div class="runtime-top">
      <div>
        <Clock3 :size="14" /><span>总执行时间</span><strong>{{ format(elapsed) }}</strong>
      </div>
      <div>
        <BrainCircuit :size="14" /><span>规划耗时</span><strong>{{ planningDuration ?? '—' }}<small
            v-if="planningDuration !== undefined"> ms</small></strong>
      </div>
      <div>
        <Target :size="14" /><span>剩余子任务</span><strong>{{ store.remainingTasks }}</strong>
      </div>
    </div>
    <div class="runtime-info">
      <div><span>当前任务</span><strong>{{ currentTaskTitle ?? '等待任务' }}</strong></div>
      <div><span>当前对象</span><strong>
          <Crosshair :size="12" />{{ currentObjectId ?? '—' }}
        </strong>
      </div>
      
    </div>
    <div class="runtime-progress"><span>整体进度</span><i><b :style="{ width: `${overallProgress}%` }" /></i><strong>{{
      overallProgress.toFixed(0) }}%</strong><em>{{ lastResult }}</em></div>
  </section>
</template>
