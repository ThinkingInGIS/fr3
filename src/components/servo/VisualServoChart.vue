<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { Activity, Gauge } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'

const task = useTaskStore(), chartHost = ref<HTMLElement>()
let chart: echarts.ECharts | undefined, resizeObserver: ResizeObserver | undefined
const latest = computed(() => task.servoHistory.at(-1))
const first = computed(() => task.servoHistory[0])

const render = () => {
  if (!chart) return
  const data = task.servoHistory.slice(-90), origin = data.at(-1)?.timestamp ?? Date.now()
  chart.setOption({
    animation: false,
    grid: { left: 30, right: 12, top: 18, bottom: 24 },
    tooltip: { trigger: 'axis', backgroundColor: '#132024', borderColor: '#36504d', textStyle: { color: '#d9e5e1', fontSize: 10 } },
    xAxis: { type: 'value', min: -10, max: 0, axisLabel: { color: '#607773', fontSize: 9, formatter: '{value}s' }, splitLine: { lineStyle: { color: '#182a2a' } }, axisLine: { show: false } },
    yAxis: { type: 'value', min: 0, max: 22, axisLabel: { color: '#607773', fontSize: 9 }, splitLine: { lineStyle: { color: '#182a2a' } }, axisLine: { show: false } },
    series: [
      { name: '平移范数', type: 'line', symbol: 'none', smooth: true, data: data.map(item => [(item.timestamp - origin) / 1000, item.translationNormMm]), lineStyle: { color: '#43d5ad', width: 2 }, areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(67,213,173,.22)'},{offset:1,color:'rgba(67,213,173,0)'}]) } },
      { name: '阈值', type: 'line', symbol: 'none', data: [[-10,1],[0,1]], lineStyle: { color: '#e0b44e', type: 'dashed', width: 1 } },
    ],
  })
}

onMounted(() => { if (chartHost.value) { chart = echarts.init(chartHost.value); resizeObserver = new ResizeObserver(() => chart?.resize()); resizeObserver.observe(chartHost.value); render() } })
watch(() => task.servoHistory.length, render)
onBeforeUnmount(() => { resizeObserver?.disconnect(); chart?.dispose() })
</script>

<template>
  <section class="panel servo-panel">
    <div class="panel-head compact"><div><span class="eyebrow">VISUAL SERVO</span><h2>视觉伺服闭环</h2></div><span :class="['servo-status', latest?.status?.toLowerCase() ?? 'inactive']"><Activity :size="12" />{{ latest?.status ?? 'INACTIVE' }}</span></div>
    <div class="servo-kpis">
      <div><span>平移误差</span><strong>{{ latest?.translationNormMm.toFixed(2) ?? '—' }}<small> mm</small></strong></div>
      <div><span>收敛过程</span><strong>{{ first?.translationNormMm.toFixed(1) ?? '—' }} <i>→</i> {{ latest?.translationNormMm.toFixed(1) ?? '—' }}<small> mm</small></strong></div>
      <div><Gauge :size="14" /><span>阈值</span><strong>1.0<small> mm</small></strong></div>
    </div>
    <div ref="chartHost" class="servo-chart" />
    <div class="chart-legend"><span><i class="line norm" />平移范数</span><span><i class="line threshold" />收敛阈值</span><small>WINDOW · 10 SEC</small></div>
  </section>
</template>
