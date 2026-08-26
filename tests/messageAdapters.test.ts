import { describe, expect, it, vi } from 'vitest'
import { adaptDetections, adaptTaskState, safeAdapt } from '@/ros/messageAdapters'

describe('ROS message adapters', () => {
  it('parses std_msgs/String JSON detections', () => {
    const result = adaptDetections({ data: JSON.stringify([{ id: 'Obj-04', className: '方块', confidence: .98, state: 'selected' }]) })
    expect(result[0]).toMatchObject({ id: 'Obj-04', state: 'selected' })
  })

  it('rejects incomplete task messages without crashing safe adapter', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(safeAdapt(adaptTaskState, { data: '{"stage":"GRASP"}' }, '任务状态')).toBeUndefined()
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })
})
