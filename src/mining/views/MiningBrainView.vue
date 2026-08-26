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
import DeviceStatusPanel from '../components/DeviceStatusPanel.vue'
import ExecutionLogPanel from '../components/ExecutionLogPanel.vue'
import { getMiningDataSource } from '../dataSource'
import '../styles.css'

const source=getMiningDataSource()
onMounted(()=>source.connect())
onBeforeUnmount(()=>source.disconnect())
</script>
<template>
  <main class="mining-shell">
    <MiningHeader />
    <WorkflowStepper />
    <div class="mining-main-grid">
      <aside class="mining-left"><CommandPanel /><LongHorizonTaskBoard /></aside>
      <section class="mining-center"><div class="mining-visual-row"><RobotDigitalTwin /><CameraPanel source="WRIST" title="D405 手腕相机" /></div><RobotStatusPanel /><div class="mining-info-row"><TaskRuntimePanel /><DeviceStatusPanel /></div></section>
      <aside class="mining-right"><CameraPanel source="GLOBAL" title="全局摄像头检测画面" /><ExecutionLogPanel /></aside>
    </div>
    <div class="min-width-warning">建议使用 1280 px 及以上宽度查看作业大脑</div>
  </main>
</template>
