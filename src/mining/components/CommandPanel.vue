<script setup lang="ts">
import { computed, ref } from 'vue'
import { Mic, Pause, Play, RotateCcw, Send, ShieldAlert, Square, Zap } from 'lucide-vue-next'
import { getMiningDataSource } from '../dataSource'
import { miningConfig } from '../config'
import { useMiningStore } from '../store'

const source=getMiningDataSource(),store=useMiningStore(),command=ref('开始钻锚作业，请帮我备料'),error=ref(''),sending=ref(false)
const canSend=computed(()=>command.value.trim()&&!store.running)
const send=async()=>{if(!canSend.value)return;error.value='';sending.value=true;try{if(source.mode==='ros'&&miningConfig.commandConfirm&&!window.confirm(`确认发送真实作业指令：${command.value.trim()}？`))return;await source.sendCommand(command.value);store.taskPlanExpandRequest+=1}catch(e){error.value=e instanceof Error?e.message:'指令发送失败'}finally{sending.value=false}}
const keydown=(event:KeyboardEvent)=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();void send()}}
</script>

<template>
  <section class="mine-panel command-card">
    <div class="mine-panel-head"><div><h2>指令交互</h2></div><em>{{ source.mode==='mock'?'演示链路':'ROS 指令链路' }}</em></div>
    <div class="command-input-wrap"><textarea v-model="command" aria-label="作业指令" rows="2" maxlength="120" @keydown="keydown" /><button class="voice-button" title="语音接口预留" disabled><Mic :size="15" /></button></div>
    <div class="command-actions"><button class="send-command" :disabled="!canSend||sending" @click="send"><Send :size="14" />{{ sending?'发送中':'发送指令' }}</button></div>
    <div v-if="error" class="command-feedback error"><ShieldAlert :size="12" />{{ error }}</div>
    <div class="demo-controls">
      <button v-if="store.workflow.stage!=='PAUSED'" :disabled="!store.running" @click="source.control('pause')"><Pause :size="12" />暂停</button><button v-else @click="source.control('resume')"><Play :size="12" />继续</button>
      <button :disabled="!store.running" @click="source.control('cancel')"><Square :size="11" />取消</button><button @click="source.control('reset')"><RotateCcw :size="12" />重置</button><button class="fault-btn" :disabled="!store.running" @click="source.control('fault')"><Zap :size="12" />模拟故障</button>
      <label>速度<select :value="store.speed" @change="source.setSpeed(Number(($event.target as HTMLSelectElement).value))"><option :value=".5">0.5×</option><option :value="1">1×</option><option :value="2">2×</option></select></label>
    </div>
  </section>
</template>
