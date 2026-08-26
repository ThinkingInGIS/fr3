import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { MockDataSource } from '@/services/mockDataSource'
import { useTaskStore } from '@/stores/task'
import { useWorldModelStore } from '@/stores/worldModel'

describe('Mock complete pick-and-place flow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16))
    vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id))
    setActivePinia(createPinia())
  })

  it('selects Obj-04, places it in Slot-03, then completes all six targets', async () => {
    const source = new MockDataSource()
    source.connect(); source.setSpeed(2)
    await source.command('start')
    expect(useTaskStore().current.targetId).toBe('Obj-04')
    expect(useTaskStore().current.targetSlotId).toBe('Slot-03')
    await vi.advanceTimersByTimeAsync(38_000)
    expect(useTaskStore().current.stage).toBe('FINISH')
    expect(useTaskStore().current.progress).toBe(6)
    expect(useWorldModelStore().slots.find((slot) => slot.id === 'Slot-03')).toMatchObject({ occupied: true, objectId: 'Obj-04' })
    source.disconnect(); vi.useRealTimers()
  })
})
