<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { miningConfig } from '../config'
import { useMiningStore } from '../store'

const store=useMiningStore(),chartHost=ref<HTMLElement>()
const stale=computed(()=>store.mode==='ros'&&Date.now()-store.robot.timestamp>miningConfig.staleTimeoutMs)
let chart:echarts.ECharts|undefined,observer:ResizeObserver|undefined
const render=()=>{
  if(!chart)return
  const data=store.wrenchHistory.slice(-200),latest=data.at(-1)?.timestamp??Date.now()
  const series=(name:string,color:string,values:number[],axis:number)=>({name,type:'line' as const,yAxisIndex:axis,symbol:'none',smooth:true,data:data.map((item,index)=>[(item.timestamp-latest)/1000,values[index]]),lineStyle:{color,width:1.7}})
  chart.setOption({
    animation:false,
    grid:{left:38,right:40,top:24,bottom:19},
    legend:{top:0,itemWidth:10,itemHeight:2,itemGap:8,textStyle:{color:'#a9bed0',fontSize:8},data:['Fx','Fy','Fz']},
    tooltip:{trigger:'axis',backgroundColor:'#0b1522',borderColor:'#31556f',textStyle:{color:'#eaf3ff',fontSize:10},valueFormatter:(value:number)=>Number(value).toFixed(2)},
    xAxis:{type:'value',min:-20,max:0,axisLabel:{color:'#8096ad',fontSize:8,formatter:'{value}s'},axisLine:{show:false},axisTick:{show:false},splitLine:{lineStyle:{color:'rgba(83,156,255,.11)'}}},
    yAxis:{type:'value',name:'N',nameTextStyle:{color:'#8096ad',fontSize:8},axisLabel:{color:'#8096ad',fontSize:8},axisLine:{show:false},axisTick:{show:false},splitLine:{lineStyle:{color:'rgba(83,156,255,.11)'}}},
    series:[
      series('Fx','#37a7ff',data.map(item=>item.force.x),0),series('Fy','#69d1ff',data.map(item=>item.force.y),0),series('Fz','#7de0c7',data.map(item=>item.force.z),0),
    ],
  },true)
}
onMounted(()=>{if(chartHost.value){chart=echarts.init(chartHost.value);observer=new ResizeObserver(()=>chart?.resize());observer.observe(chartHost.value);render()}})
watch(()=>store.wrenchHistory.at(-1)?.timestamp,render)
onBeforeUnmount(()=>{observer?.disconnect();chart?.dispose()})
</script>

<template>
  <section class="mine-panel robot-status-card">
    <div class="mine-panel-head compact"><div><h2>实时作业状态</h2></div><div class="robot-status-tools"><b :class="['controller-state',store.robot.controllerState.toLowerCase()]">{{ stale?'STALE':store.robot.controllerState }}</b><span class="wrench-unit">末端三轴力 · N</span></div></div>
    <!-- <div class="robot-metrics">
      <div><Move3D :size="14" /><span>末端位置 X / Y / Z</span><strong>{{ store.robot.tcpPosition.x.toFixed(3) }} · {{ store.robot.tcpPosition.y.toFixed(3) }} · {{ store.robot.tcpPosition.z.toFixed(3) }}<small> m</small></strong></div>
      <div><Activity :size="14" /><span>线速度 / 角速度</span><strong>{{ store.robot.tcpLinearSpeed.toFixed(2) }}<small> m/s</small> · {{ store.robot.tcpAngularSpeed.toFixed(2) }}<small> rad/s</small></strong></div>
      <div><Gauge :size="14" /><span>夹爪开度 / 夹持力</span><strong>{{ (store.robot.gripperWidth*1000).toFixed(1) }}<small> mm</small> · {{ store.robot.gripperForce.toFixed(1) }}<small> N</small></strong></div>
      <div><RadioTower :size="14" /><span>轨迹 规划 / 执行</span><strong>{{ store.robot.plannedProgress.toFixed(0) }}% · {{ store.robot.executedProgress.toFixed(0) }}%</strong></div>
    </div>  -->
    <div ref="chartHost" class="wrench-chart" aria-label="末端力和力矩实时曲线" />
  </section>
</template>
