<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { miningConfig } from '../config'
import { useMiningStore } from '../store'

const store = useMiningStore(), forceChartHost = ref<HTMLElement>(), jointChartHost = ref<HTMLElement>()
const stale = computed(() => store.mode === 'ros' && Date.now() - store.robot.timestamp > miningConfig.staleTimeoutMs)
let forceChart: echarts.ECharts | undefined, jointChart: echarts.ECharts | undefined, observer: ResizeObserver | undefined

const timeAxis = { type: 'value' as const, min: -20, max: 0, axisLabel: { color: '#8096ad', fontSize: 8, formatter: '{value}s' }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: 'rgba(83,156,255,.11)' } } }
const tooltip = { trigger: 'axis' as const, backgroundColor: '#0b1522', borderColor: '#31556f', textStyle: { color: '#eaf3ff', fontSize: 10 } }

const renderForce = () => {
  if (!forceChart) return
  const data = store.wrenchHistory.slice(-200), latest = data.at(-1)?.timestamp ?? Date.now()
  const series = (name: string, color: string, values: number[]) => ({ name, type: 'line' as const, symbol: 'none', smooth: true, data: data.map((item, index) => [(item.timestamp - latest) / 1000, values[index]]), lineStyle: { color, width: 1.7 } })
  forceChart.setOption({
    animation: false, grid: { left: 34, right: 8, top: 24, bottom: 19 },
    legend: { top: 0, itemWidth: 9, itemHeight: 2, itemGap: 7, textStyle: { color: '#a9bed0', fontSize: 8 }, data: ['Fx', 'Fy', 'Fz'] },
    tooltip: { ...tooltip, valueFormatter: (value: number) => `${Number(value).toFixed(2)} N` }, xAxis: timeAxis,
    yAxis: { type: 'value', min:-10, max:10, name: 'N', nameTextStyle: { color: '#8096ad', fontSize: 8 }, axisLabel: { color: '#8096ad', fontSize: 8 }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: 'rgba(83,156,255,.11)' } } },
    series: [series('Fx', '#ffff00', data.map(item => item.force.x)), series('Fy', '#00ff00', data.map(item => item.force.y)), series('Fz', '#ff00ff', data.map(item => item.force.z))],
  }, true)
}

const renderJoints = () => {
  if (!jointChart) return
  const data = store.jointPositionHistory.slice(-400), latest = data.at(-1)?.timestamp ?? Date.now(), colors = ['#37a7ff', '#69d1ff', '#7de0c7', '#ffb84d', '#ff7d91', '#c99cff']
  jointChart.setOption({
    animation: false, grid: { left: 34, right: 8, top: 24, bottom: 19 },
    legend: { top: 0, itemWidth: 9, itemHeight: 2, itemGap: 6, textStyle: { color: '#a9bed0', fontSize: 8 }, data: ['J1', 'J2', 'J3', 'J4', 'J5', 'J6'] },
    tooltip: { ...tooltip, valueFormatter: (value: number) => `${Number(value).toFixed(3)} rad` }, xAxis: timeAxis,
    yAxis: { type: 'value', name: 'rad', nameTextStyle: { color: '#8096ad', fontSize: 8 }, axisLabel: { color: '#8096ad', fontSize: 8 }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: 'rgba(83,156,255,.11)' } } },
    series: colors.map((color, index) => ({ name: `J${index + 1}`, type: 'line' as const, symbol: 'none', smooth: true, data: data.map(item => [(item.timestamp - latest) / 1000, item.positions[index] ?? 0]), lineStyle: { color, width: 1.35 } })),
  }, true)
}

const render = () => { renderForce(); renderJoints() }
onMounted(() => {
  if (forceChartHost.value) forceChart = echarts.init(forceChartHost.value)
  if (jointChartHost.value) jointChart = echarts.init(jointChartHost.value)
  observer = new ResizeObserver(() => { forceChart?.resize(); jointChart?.resize() })
  if (forceChartHost.value) observer.observe(forceChartHost.value)
  if (jointChartHost.value) observer.observe(jointChartHost.value)
  render()
})
watch([() => store.wrenchHistory.at(-1)?.timestamp, () => store.jointPositionHistory.at(-1)?.timestamp], render)
onBeforeUnmount(() => { observer?.disconnect(); forceChart?.dispose(); jointChart?.dispose() })
</script>

<template>
  <section class="mine-panel robot-status-card">
    <div class="mine-panel-head compact">
      <div>
        <h2>实时作业状态</h2>
      </div>
      <div class="robot-status-tools"><b :class="['controller-state', store.robot.controllerState.toLowerCase()]">{{
        stale ? 'STALE' : store.robot.controllerState }}</b><span class="wrench-unit">实时曲线 · 20 s</span></div>
    </div>
    <div class="robot-status-charts">
      <div class="robot-status-chart"><span>末端三轴力 · N</span>
        <div ref="forceChartHost" class="wrench-chart" aria-label="末端三轴力实时曲线" />
      </div>
      <div class="robot-status-chart"><span>六关节角 · rad</span>
        <div ref="jointChartHost" class="wrench-chart" aria-label="六关节角实时曲线" />
      </div>
    </div>
  </section>
</template>
