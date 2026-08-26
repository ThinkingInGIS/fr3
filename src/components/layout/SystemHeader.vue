<script setup lang="ts">
import { computed, ref } from 'vue'
import { CirclePause, CirclePlay, Power, RefreshCw, RotateCcw, ShieldCheck, Square } from 'lucide-vue-next'
import { ElTooltip } from 'element-plus'
import 'element-plus/es/components/tooltip/style/css'
import { runtimeConfig } from '@/config/runtime'
import { useConnectionStore } from '@/stores/connection'
import { useRobotStore } from '@/stores/robot'
import { useTaskStore } from '@/stores/task'
import type { SystemCommand } from '@/types/task'

defineProps<{ onCommand: (command: SystemCommand) => Promise<void>; onSpeed: (speed: number) => void }>()
const connection = useConnectionStore(), robot = useRobotStore(), task = useTaskStore()
const busy = ref(false), commandError = ref('')
const isStale = computed(() => runtimeConfig.dataSource === 'ros' && Date.now() - connection.lastMessageAt > runtimeConfig.staleAfterMs)

const run = async (handler: (command: SystemCommand) => Promise<void>, command: SystemCommand) => {
  if (busy.value) return
  busy.value = true; commandError.value = ''
  try { await handler(command) } catch (error) { commandError.value = error instanceof Error ? error.message : '命令发送失败' }
  finally { window.setTimeout(() => { busy.value = false }, 400) }
}
</script>

<template>
  <header class="system-header">
    <div class="brand-block">
      <div class="brand-mark"><span /><span /><span /></div>
      <div><p>F R 3 · EMBODIED INTELLIGENCE</p><h1>具身智能抓取与码放系统</h1></div>
    </div>
    <div class="system-statuses">
      <div class="system-status"><span :class="['status-dot', connection.ros === 'online' ? 'online' : 'offline']" /><span>ROS</span><strong>{{ connection.ros === 'online' ? 'CONNECTED' : 'OFFLINE' }}</strong></div>
      <div class="system-status"><ShieldCheck :size="14" /><span>机械臂</span><strong>{{ robot.available ? 'READY' : 'UNAVAILABLE' }}</strong></div>
      <div class="system-status"><span :class="['status-dot', connection.video === 'online' ? 'online' : 'offline']" /><span>视觉</span><strong>{{ connection.video === 'online' ? 'STREAMING' : 'OFFLINE' }}</strong></div>
      <div v-if="isStale" class="stale-badge">STALE</div>
      <div class="mode-badge">{{ runtimeConfig.dataSource === 'mock' ? 'MOCK DEMO' : 'LIVE ROS' }}</div>
    </div>
    <div class="header-actions">
      <label class="speed-select">速度<select :value="task.speed" @change="onSpeed(Number(($event.target as HTMLSelectElement).value))"><option :value="0.5">0.5×</option><option :value="1">1×</option><option :value="1.5">1.5×</option><option :value="2">2×</option></select></label>
      <div class="task-counter"><span>任务进度</span><strong>{{ task.current.progress }}<small>/ {{ task.current.total }}</small></strong></div>
      <button v-if="!task.running" class="control primary" :disabled="busy" @click="run(onCommand, 'start')"><CirclePlay :size="16" />开始演示</button>
      <button v-else-if="!task.paused" class="control" :disabled="busy" @click="run(onCommand, 'pause')"><CirclePause :size="16" />暂停</button>
      <button v-else class="control primary" :disabled="busy" @click="run(onCommand, 'resume')"><CirclePlay :size="16" />继续</button>
      <ElTooltip content="复位演示状态" placement="bottom"><button class="icon-control" aria-label="复位" :disabled="busy" @click="run(onCommand, 'reset')"><RotateCcw :size="16" /></button></ElTooltip>
      <button class="control stop" :disabled="busy || !task.running" @click="run(onCommand, 'stop')"><Square :size="14" />停止</button>
    </div>
    <div v-if="commandError" class="command-error"><Power :size="13" />{{ commandError }}<RefreshCw :size="12" /></div>
  </header>
</template>
