<script setup lang="ts">
import { computed, ref } from 'vue'
import { Activity, ChevronDown, Gauge, Move3D, RadioTower } from 'lucide-vue-next'
import { miningConfig } from '../config'
import { useMiningStore } from '../store'

const store=useMiningStore(),expanded=ref(false),unit=ref<'deg'|'rad'>('deg')
const stale=computed(()=>store.mode==='ros'&&Date.now()-store.robot.timestamp>miningConfig.staleTimeoutMs)
const joint=(value:number)=>unit.value==='deg'?`${(value*180/Math.PI).toFixed(1)}°`:value.toFixed(3)
</script>

<template>
  <section class="mine-panel robot-status-card">
    <div class="mine-panel-head compact"><div><h2>机械臂作业状态</h2></div><div class="robot-status-tools"><b :class="['controller-state',store.robot.controllerState.toLowerCase()]">{{ stale?'STALE':store.robot.controllerState }}</b><button @click="unit=unit==='deg'?'rad':'deg'">{{ unit==='deg'?'°':'rad' }}</button><button @click="expanded=!expanded"><ChevronDown :class="{rotated:expanded}" :size="13" /></button></div></div>
    <div class="robot-metrics">
      <div><Move3D :size="14" /><span>末端位置 X / Y / Z</span><strong>{{ store.robot.tcpPosition.x.toFixed(3) }} · {{ store.robot.tcpPosition.y.toFixed(3) }} · {{ store.robot.tcpPosition.z.toFixed(3) }}<small> m</small></strong></div>
      <div><Activity :size="14" /><span>线速度 / 角速度</span><strong>{{ store.robot.tcpLinearSpeed.toFixed(2) }}<small> m/s</small> · {{ store.robot.tcpAngularSpeed.toFixed(2) }}<small> rad/s</small></strong></div>
      <div><Gauge :size="14" /><span>夹爪开度 / 夹持力</span><strong>{{ (store.robot.gripperWidth*1000).toFixed(1) }}<small> mm</small> · {{ store.robot.gripperForce.toFixed(1) }}<small> N</small></strong></div>
      <div><RadioTower :size="14" /><span>轨迹 规划 / 执行</span><strong>{{ store.robot.plannedProgress.toFixed(0) }}% · {{ store.robot.executedProgress.toFixed(0) }}%</strong></div>
    </div>
    <div v-if="expanded" class="joint-details"><div v-for="(name,index) in store.robot.jointNames" :key="name"><span>J{{ index+1 }}</span><strong>{{ joint(store.robot.jointPosition[index]??0) }}</strong><i><b :style="{width:`${Math.min(100,Math.abs(store.robot.jointPosition[index]??0)/.5*100)}%`}" /></i></div></div>
  </section>
</template>
