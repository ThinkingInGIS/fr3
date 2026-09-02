<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import MiningHeader from '../components/MiningHeader.vue'
import WorkflowStepper from '../components/WorkflowStepper.vue'
import CommandPanel from '../components/CommandPanel.vue'
import LongHorizonTaskBoard from '../components/LongHorizonTaskBoard.vue'
import RobotDigitalTwin from '../components/RobotDigitalTwin.vue'
import CameraPanel from '../components/CameraPanel.vue'
import RobotStatusPanel from '../components/RobotStatusPanel.vue'
import TaskRuntimePanel from '../components/TaskRuntimePanel.vue'
import ExecutionLogPanel from '../components/ExecutionLogPanel.vue'
import SafetyViolationDialog from '../components/SafetyViolationDialog.vue'
import { getMiningDataSource } from '../dataSource'
import { useMiningStore } from '../store'
import '../styles.css'

const source=getMiningDataSource(),store=useMiningStore()
onMounted(()=>source.connect())
onBeforeUnmount(()=>source.disconnect())
</script>
<template>
  <main class="mining-shell">
    <MiningHeader />
    <WorkflowStepper />
    <div class="mining-main-grid">
      <aside class="mining-left"><CommandPanel /><LongHorizonTaskBoard /></aside>
      <section class="mining-center"><div class="mining-visual-row"><RobotDigitalTwin /><CameraPanel source="WRIST" title="局部视野" /></div><RobotStatusPanel /><div class="mining-info-row"><TaskRuntimePanel /></div></section>
      <aside class="mining-right"><CameraPanel source="GLOBAL" title="全局视野" /><div class="execution-log-slot"><ExecutionLogPanel /><SafetyViolationDialog v-if="store.safetyViolation" /></div></aside>
    </div>
    <div class="min-width-warning">建议使用 1280 px 及以上宽度查看作业大脑</div>
  </main>
</template>
