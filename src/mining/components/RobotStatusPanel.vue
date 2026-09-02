<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { miningConfig } from '../config'
import { useMiningStore } from '../store'

const store = useMiningStore()
const forceHost = ref<HTMLElement>(), torqueHost = ref<HTMLElement>(), positionHost = ref<HTMLElement>(), velocityHost = ref<HTMLElement>()
const stale = computed(() => store.mode === 'ros' && Date.now() - store.robot.timestamp > miningConfig.staleTimeoutMs)
let forceChart: echarts.ECharts | undefined, torqueChart: echarts.ECharts | undefined, positionChart: echarts.ECharts | undefined, velocityChart: echarts.ECharts | undefined, observer: ResizeObserver | undefined

const colors = ['#ffff00', '#00ff00', '#ff00ff', '#37a7ff', '#ffb84d', '#c99cff']
const axis = (unit: string) => ({ type: 'value' as const, name: unit, nameTextStyle: { color: '#8096ad', fontSize: 8 }, axisLabel: { color: '#8096ad', fontSize: 8 }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: 'rgba(83,156,255,.11)' } } })
const timeAxis = { type: 'value' as const, min: -20, max: 0, axisLabel: { color: '#8096ad', fontSize: 8, formatter: '{value}s' }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: 'rgba(83,156,255,.11)' } } }
const grid = { left: 32, right: 7, top: 23, bottom: 17 }
const tooltip = { trigger: 'axis' as const, backgroundColor: '#0b1522', borderColor: '#31556f', textStyle: { color: '#eaf3ff', fontSize: 9 } }
const names = (prefix: string) => [`${prefix}x`, `${prefix}y`, `${prefix}z`]
const line = (name: string, color: string, data: Array<[number, number]>) => ({ name, type: 'line' as const, symbol: 'none', smooth: true, data, lineStyle: { color, width: 1.3 } })

const renderWrench = (chart: echarts.ECharts | undefined, field: 'force' | 'torque', unit: string, titlePrefix: 'F' | 'M') => {
  if (!chart) return
  const samples = store.wrenchHistory.slice(-200), latest = samples.at(-1)?.timestamp ?? Date.now(), labels = names(titlePrefix)
  chart.setOption({
    animation: false, grid, legend: { top: 0, itemWidth: 8, itemHeight: 2, itemGap: 6, textStyle: { color: '#a9bed0', fontSize: 8 }, data: labels },
    tooltip: { ...tooltip, valueFormatter: (value: number) => `${Number(value).toFixed(2)} ${unit}` }, xAxis: timeAxis, yAxis: axis(unit),
    series: ['x', 'y', 'z'].map((component, index) => line(labels[index], colors[index], samples.map(sample => [(sample.timestamp-latest)/1000, sample[field][component as 'x' | 'y' | 'z']]))),
  }, true)
}

const renderJointState = (chart: echarts.ECharts | undefined, field: 'positions' | 'velocities', unit: string) => {
  if (!chart) return
  const samples = store.jointPositionHistory.slice(-400), latest = samples.at(-1)?.timestamp ?? Date.now(), labels = ['J1', 'J2', 'J3', 'J4', 'J5', 'J6']
  chart.setOption({
    animation: false, grid, legend: { top: 0, itemWidth: 8, itemHeight: 2, itemGap: 5, textStyle: { color: '#a9bed0', fontSize: 8 }, data: labels },
    tooltip: { ...tooltip, valueFormatter: (value: number) => `${Number(value).toFixed(3)} ${unit}` }, xAxis: timeAxis, yAxis: axis(unit),
    series: labels.map((label, index) => line(label, colors[index], samples.map(sample => [(sample.timestamp-latest)/1000, sample[field][index] ?? 0]))),
  }, true)
}

const render = () => {
  renderWrench(forceChart, 'force', 'N', 'F')
  renderWrench(torqueChart, 'torque', 'N·m', 'M')
  renderJointState(positionChart, 'positions', 'rad')
  renderJointState(velocityChart, 'velocities', 'rad/s')
}
onMounted(() => {
  if (forceHost.value) forceChart = echarts.init(forceHost.value)
  if (torqueHost.value) torqueChart = echarts.init(torqueHost.value)
  if (positionHost.value) positionChart = echarts.init(positionHost.value)
  if (velocityHost.value) velocityChart = echarts.init(velocityHost.value)
  observer = new ResizeObserver(() => [forceChart, torqueChart, positionChart, velocityChart].forEach(chart => chart?.resize()))
  ;[forceHost.value, torqueHost.value, positionHost.value, velocityHost.value].forEach(host => { if (host) observer?.observe(host) })
  render()
})
watch([() => store.wrenchHistory.at(-1)?.timestamp, () => store.jointPositionHistory.at(-1)?.timestamp], render)
onBeforeUnmount(() => { observer?.disconnect(); [forceChart, torqueChart, positionChart, velocityChart].forEach(chart => chart?.dispose()) })
</script>

<template>
  <section class="mine-panel robot-status-card">
    <div class="mine-panel-head compact">
      <div><h2>实时作业状态</h2></div>
      <div class="robot-status-tools"><b :class="['controller-state', store.robot.controllerState.toLowerCase()]">{{ stale ? 'STALE' : store.robot.controllerState }}</b><span class="wrench-unit">实时曲线 · 20 s</span></div>
    </div>
    <div class="robot-status-charts">
      <div class="robot-status-chart"><span>末端三轴力 · N</span><div ref="forceHost" class="wrench-chart" aria-label="末端三轴力实时曲线" /></div>
      <div class="robot-status-chart"><span>末端三轴力矩 · N·m</span><div ref="torqueHost" class="wrench-chart" aria-label="末端三轴力矩实时曲线" /></div>
      <div class="robot-status-chart"><span>六关节角 · rad</span><div ref="positionHost" class="wrench-chart" aria-label="六关节角实时曲线" /></div>
      <div class="robot-status-chart"><span>六关节速度 · rad/s</span><div ref="velocityHost" class="wrench-chart" aria-label="六关节速度实时曲线" /></div>
    </div>
  </section>
</template>
