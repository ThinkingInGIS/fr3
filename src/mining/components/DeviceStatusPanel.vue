<script setup lang="ts">
import { Cpu, DatabaseZap, Radio, Video } from 'lucide-vue-next'
import { useMiningStore } from '../store'
const store=useMiningStore()
const icon=(id:string)=>id==='video'||id.includes('camera')?Video:id==='ros'?Radio:id==='planner'||id==='detector'?DatabaseZap:Cpu
</script>
<template>
  <section class="mine-panel device-card">
    <div class="mine-panel-head compact"><div><h2>设备与软件状态</h2></div><em>{{ store.devices.filter(d=>d.status==='ONLINE').length }} / {{ store.devices.length }} ONLINE</em></div>
    <div class="device-scroller"><div v-for="device in store.devices" :key="device.id" :class="['device-item',device.status.toLowerCase()]" :title="device.message"><component :is="icon(device.id)" :size="13" /><div><strong>{{ device.name }}</strong><span>{{ device.status }} · {{ device.latencyMs??'—' }} ms</span></div><i /></div></div>
  </section>
</template>
