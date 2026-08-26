import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { MiningMockDataSource } from '@/mining/dataSource'
import { useMiningStore } from '@/mining/store'

describe('煤矿钻锚 Mock 工作流',()=>{
  beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>window.setTimeout(()=>callback(performance.now()),16));vi.stubGlobal('cancelAnimationFrame',(id:number)=>window.clearTimeout(id));setActivePinia(createPinia())})
  it('从自然语言指令生成 3 个父任务和 9 个子任务并执行完成',async()=>{
    const source=new MiningMockDataSource();source.connect();source.setSpeed(2);await source.sendCommand('开始钻锚作业')
    expect(useMiningStore().workflow.stage).toBe('COMMAND')
    await vi.advanceTimersByTimeAsync(8000)
    const store=useMiningStore();expect(store.workflow.stage).toBe('COMPLETED');expect(store.tasks).toHaveLength(3);expect(store.tasks.flatMap(task=>task.children??[])).toHaveLength(9);expect(store.tasks.flatMap(task=>task.children??[]).every(task=>task.status==='COMPLETED')).toBe(true);expect(store.events.some(event=>event.level==='VISION')).toBe(true)
    source.disconnect();vi.useRealTimers()
  })
  it('支持暂停与模拟故障隔离',async()=>{
    const source=new MiningMockDataSource();source.connect();await source.sendCommand('开始钻锚作业');await source.control('pause');expect(useMiningStore().workflow.stage).toBe('PAUSED');await source.control('resume');expect(useMiningStore().workflow.stage).toBe('COMMAND');await source.control('fault');expect(useMiningStore().workflow.stage).toBe('ERROR');expect(useMiningStore().devices.find(item=>item.id==='moveit')?.status).toBe('ERROR');source.disconnect();vi.useRealTimers()
  })
})
