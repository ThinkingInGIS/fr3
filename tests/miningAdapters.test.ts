import { describe,expect,it } from 'vitest'
import { adaptJointState, adaptMiningWorkflow, adaptRobotStatus, adaptTaskRuntime, createStartActionMessage, isCompletedTaskPlan, plannedPathSchema } from '@/mining/dataSource'

describe('煤矿工作流消息适配器',()=>{
  it('解析 std_msgs/String JSON',()=>{const value=adaptMiningWorkflow({data:JSON.stringify({taskId:'task-1',command:'开始钻锚作业',stage:'TASK_PLANNING',progress:20,message:'规划中',decisionReasons:[],updatedAt:1})});expect(value.stage).toBe('TASK_PLANNING')})
  it('拒绝缺失字段的消息',()=>{expect(()=>adaptMiningWorkflow({data:'{"stage":"ERROR"}'})).toThrow()})
  it('解析 ROS 1 JointState 并按最短数组对齐',()=>{expect(adaptJointState({name:['shoulder_pan_joint','elbow_joint'],position:[.2,-.4],velocity:[.01]})).toEqual({names:['shoulder_pan_joint','elbow_joint'],positions:[.2,-.4],velocities:[.01],efforts:[]})})
  it('拒绝无效 JointState',()=>{expect(()=>adaptJointState({name:['elbow_joint'],position:[Number.NaN]})).toThrow()})
  it('解析机械臂作业状态',()=>{const value=adaptRobotStatus({data:JSON.stringify({timestamp:10,controllerState:'EXECUTING',tcpPosition:{x:.4,y:0,z:.3},tcpOrientation:{x:0,y:0,z:0,w:1},tcpLinearSpeed:.1,tcpAngularSpeed:.2,gripperWidth:.02,gripperForce:20,gripperState:'GRASPING',plannedProgress:100,executedProgress:50})});expect(value.executedProgress).toBe(50)})
  it('解析系统作业信息',()=>{const value=adaptTaskRuntime({data:JSON.stringify({taskId:'task-1',currentTaskTitle:'钻杆抓取',elapsedMs:1000,totalTaskCount:9,completedTaskCount:3,remainingTaskCount:6,overallProgress:33,lastActionResult:'检测完成',decisionReasons:['目标可达'],running:true,updatedAt:10})});expect(value.remainingTaskCount).toBe(6)})
  it('生成开始行动触发消息',()=>{expect(createStartActionMessage('开始钻锚作业','web-1',10)).toEqual({event:'START_ACTION',requestId:'web-1',command:'开始钻锚作业',source:'web-dashboard',requestedAt:10})})
  it('仅在全部子任务完成时判定计划完成',()=>{expect(isCompletedTaskPlan([{id:'rod',order:1,title:'钻杆备料',status:'COMPLETED',progress:100,children:[{id:'rod-1',parentId:'rod',order:1,title:'钻杆检测',status:'COMPLETED',progress:100}]}])).toBe(true);expect(isCompletedTaskPlan([{id:'rod',order:1,title:'钻杆备料',status:'RUNNING',progress:50,children:[{id:'rod-1',parentId:'rod',order:1,title:'钻杆检测',status:'RUNNING',progress:50}]}])).toBe(false)})
  it('解析至少两个点的规划路径',()=>{expect(plannedPathSchema.parse([{x:0,y:0,z:0},{x:.2,y:.1,z:.3}])).toHaveLength(2);expect(()=>plannedPathSchema.parse([{x:0,y:0,z:0}])).toThrow()})
})
