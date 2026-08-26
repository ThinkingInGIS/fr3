<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import SystemHeader from '@/components/layout/SystemHeader.vue'
import RobotVision from '@/components/vision/RobotVision.vue'
import SceneUnderstanding from '@/components/world-model/SceneUnderstanding.vue'
import DigitalTwin from '@/components/digital-twin/DigitalTwin.vue'
import TaskDecision from '@/components/task/TaskDecision.vue'
import VisualServoChart from '@/components/servo/VisualServoChart.vue'
import EmbodiedLoop from '@/components/task/EmbodiedLoop.vue'
import TaskTimeline from '@/components/task/TaskTimeline.vue'
import { getDataSource } from '@/services'
import { runtimeConfig } from '@/config/runtime'
import type { SystemCommand } from '@/types/task'

const dataSource = getDataSource()
let autoStartTimer: number | undefined
const command = (value: SystemCommand) => dataSource.command(value)
const setSpeed = (speed: number) => dataSource.setSpeed?.(speed)

onMounted(() => {
  dataSource.connect(); setSpeed(runtimeConfig.mockSpeed)
  if (dataSource.mode === 'mock') autoStartTimer = window.setTimeout(() => void dataSource.command('start'), 700)
})
onBeforeUnmount(() => { if (autoStartTimer) window.clearTimeout(autoStartTimer); dataSource.disconnect() })
</script>

<template>
  <main class="dashboard-shell">
    <SystemHeader :on-command="command" :on-speed="setSpeed" />
    <div class="dashboard-grid">
      <div class="left-column"><RobotVision /><SceneUnderstanding /></div>
      <DigitalTwin />
      <div class="right-column"><TaskDecision /><VisualServoChart /></div>
    </div>
    <EmbodiedLoop />
    <TaskTimeline />
  </main>
</template>
