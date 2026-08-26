import { describe,expect,it } from 'vitest'
import { adaptJointState, adaptMiningWorkflow } from '@/mining/dataSource'

describe('煤矿工作流消息适配器',()=>{
  it('解析 std_msgs/String JSON',()=>{const value=adaptMiningWorkflow({data:JSON.stringify({taskId:'task-1',command:'开始钻锚作业',stage:'TASK_PLANNING',progress:20,message:'规划中',decisionReasons:[],updatedAt:1})});expect(value.stage).toBe('TASK_PLANNING')})
  it('拒绝缺失字段的消息',()=>{expect(()=>adaptMiningWorkflow({data:'{"stage":"ERROR"}'})).toThrow()})
  it('解析 ROS 1 JointState 并按最短数组对齐',()=>{expect(adaptJointState({name:['shoulder_pan_joint','elbow_joint'],position:[.2,-.4],velocity:[.01]})).toEqual({names:['shoulder_pan_joint','elbow_joint'],positions:[.2,-.4],velocities:[.01],efforts:[]})})
  it('拒绝无效 JointState',()=>{expect(()=>adaptJointState({name:['elbow_joint'],position:[Number.NaN]})).toThrow()})
})
