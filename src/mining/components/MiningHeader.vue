<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { Activity, ChevronDown, Clock3, ExternalLink, RadioTower } from 'lucide-vue-next'
import { miningConfig } from '../config'
import { useMiningStore } from '../store'

const store=useMiningStore(),expanded=ref(false),now=ref(new Date()),timer=window.setInterval(()=>now.value=new Date(),1000)
onBeforeUnmount(()=>window.clearInterval(timer))
const time=computed(()=>now.value.toLocaleString('zh-CN',{hour12:false}).replaceAll('/','-'))
const mode=computed(()=>store.workflow.stage==='ERROR'?'故障':store.workflow.stage==='PAUSED'?'暂停':store.mode==='mock'?'演示模式':'自动模式')
</script>

<template>
  <header class="mine-header">
    <div class="mine-brand"><img class="mine-logo" src="/resources/logo1.png" alt="系统标志" /><div><h1>{{ miningConfig.title }}</h1></div></div>
    <nav class="product-nav"><RouterLink to="/mining-brain">作业大脑</RouterLink></nav>
    <div class="header-status-group">
      <button class="header-status connection-card" @click="expanded=!expanded"><RadioTower :size="17" /><div><span>综合连接</span><strong><i :class="store.connected?'online':'offline'" />{{ store.connected?'在线':'离线' }}</strong></div><ChevronDown :size="13" /></button>
      <div class="header-status"><Clock3 :size="17" /><div><span>系统时间</span><strong class="clock-value">{{ time }}</strong></div></div>
      <div class="header-status"><Activity :size="17" /><div><span>作业模式</span><strong :class="['mode-value',store.workflow.stage.toLowerCase()]">{{ mode }}</strong></div></div>
    </div>
    <div v-if="expanded" class="connection-popover"><div v-for="device in store.devices" :key="device.id"><i :class="device.status.toLowerCase()" /><span>{{ device.name }}</span><strong>{{ device.status }}</strong><small>{{ device.latencyMs ?? '—' }} ms</small></div></div>
  </header>
</template>
