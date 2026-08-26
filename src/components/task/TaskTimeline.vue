<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { ListFilter, Pause, Play } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'

const task = useTaskStore(), list = ref<HTMLElement>(), autoScroll = ref(true), filter = ref('all')
watch(() => task.events.length, async () => { if (autoScroll.value) { await nextTick(); list.value?.scrollTo({ top: list.value.scrollHeight, behavior: 'smooth' }) } })
</script>

<template>
  <section class="timeline-panel">
    <div class="timeline-head"><div><span class="eyebrow">TASK EVENTS</span><strong>任务时间线</strong></div><div class="timeline-tools"><button @click="filter = filter === 'all' ? 'success' : 'all'"><ListFilter :size="12" />{{ filter === 'all' ? '全部级别' : '仅成功' }}</button><button @click="autoScroll = !autoScroll"><Pause v-if="autoScroll" :size="12" /><Play v-else :size="12" />{{ autoScroll ? '暂停滚动' : '继续滚动' }}</button></div></div>
    <div ref="list" class="timeline-list">
      <div v-if="!task.events.length" class="empty-event">等待任务事件…</div>
      <div v-for="event in task.events.filter(e => filter === 'all' || e.level === filter)" :key="event.id" :class="['event-row', event.level]">
        <time>{{ new Date(event.timestamp).toLocaleTimeString('zh-CN', { hour12: false }) }}</time><i /><span>{{ event.stage }}</span><strong>{{ event.message }}</strong>
      </div>
    </div>
  </section>
</template>
