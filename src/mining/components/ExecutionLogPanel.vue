<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ChevronDown, Eraser, Pause, Play, Search } from 'lucide-vue-next'
import { useMiningStore } from '../store'
import type { EventLevel, ExecutionEvent } from '../types'

const store=useMiningStore(),query=ref(''),filter=ref<'ALL'|'INFO'|'PLAN'|'ACTION'|'WARNING'|'ERROR'>('ALL'),auto=ref(true),list=ref<HTMLElement>(),hiddenBefore=ref(0),selected=ref<ExecutionEvent>()
const filters=['ALL','INFO','PLAN','ACTION','WARNING','ERROR'] as const
const group=(level:EventLevel)=>level==='THINK'||level==='VISION'?'INFO':level==='SUCCESS'?'ACTION':level
const visible=computed(()=>store.events.filter(event=>event.timestamp>hiddenBefore.value&&(filter.value==='ALL'||group(event.level)===filter.value)&&event.message.toLowerCase().includes(query.value.toLowerCase())))
watch(()=>store.events.length,async()=>{if(auto.value){await nextTick();list.value?.scrollTo({top:list.value.scrollHeight,behavior:'smooth'})}})
</script>
<template>
  <section class="mine-panel log-card">
    <div class="mine-panel-head"><div><h2>执行日志</h2></div><div class="log-count">{{ visible.length }} EVENTS</div></div>
    <div class="log-search"><Search :size="12" /><input v-model="query" placeholder="搜索日志关键词" /><button @click="auto=!auto"><Pause v-if="auto" :size="11" /><Play v-else :size="11" />{{ auto?'自动滚动':'已暂停' }}</button><button title="清空页面显示" @click="hiddenBefore=Date.now()"><Eraser :size="12" /></button></div>
    <div class="log-filters"><button v-for="item in filters" :key="item" :class="{active:filter===item}" @click="filter=item">{{ item==='ALL'?'全部':item }}</button></div>
    <div ref="list" class="log-list">
      <div v-if="!visible.length" class="log-empty">等待执行事件</div>
      <button v-for="event in visible" :key="event.id" :class="['log-row',event.level.toLowerCase()]" @click="event.level==='ERROR'&&(selected=event)"><time>{{ new Date(event.timestamp).toLocaleTimeString('zh-CN',{hour12:false}) }}</time><b>{{ event.level }}</b><span>{{ event.message }}</span><ChevronDown v-if="event.details" :size="11" /></button>
    </div>
    <div v-if="selected" class="log-details"><button @click="selected=undefined">×</button><span>错误详情</span><strong>{{ selected.message }}</strong><pre>{{ JSON.stringify(selected.details,null,2) }}</pre></div>
  </section>
</template>
