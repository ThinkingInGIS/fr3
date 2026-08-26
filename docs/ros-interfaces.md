# ROS 2 接口约定

所有接口可由 `.env` 覆盖，默认值定义在 `src/mining/config.ts`。

| 功能 | 默认 Topic | 建议类型 | 骨架状态 |
|---|---|---|---|
| 关节状态 | `/joint_states` | `sensor_msgs/msg/JointState` | 已订阅，按 name 映射 |
| 工作流 | `/embodied_brain/workflow_state` | `std_msgs/msg/String` JSON | 已订阅并校验 |
| 任务计划 | `/embodied_brain/task_plan` | `std_msgs/msg/String` JSON | 已订阅并校验 |
| 当前任务 | `/embodied_brain/task_state` | 自定义/JSON | 已配置，待最终 schema |
| 检测结果 | `/detected_objects` | `std_msgs/msg/String` JSON | 已订阅并校验 |
| 设备状态 | `/system/device_status` | `std_msgs/msg/String` JSON | 已订阅并校验 |
| 执行事件 | `/embodied_brain/events` | `std_msgs/msg/String` JSON | 已订阅并校验 |
| MoveIt 规划轨迹 | `/display_planned_path` | `moveit_msgs/msg/DisplayTrajectory` | 配置预留，待解析 |
| 指令 | `/embodied_brain/command` | `std_msgs/msg/String` | 已发布骨架 |

临时控制请求可通过命令 Topic 发送 JSON。正式系统建议把长程任务迁移到 ROS 2 Action，把暂停、继续、取消和复位定义为受权限控制的 Service。Web 取消不是安全急停。

```json
{"taskId":"task-001","command":"开始钻锚作业","stage":"TASK_EXECUTION","progress":48,"message":"正在执行钻杆抓取","decisionReasons":["目标可达"],"updatedAt":1787700000000}
```

原始相机图像禁止通过 rosbridge；使用 `VITE_WRIST_RGB_URL`、`VITE_WRIST_DEPTH_URL` 和 `VITE_GLOBAL_CAMERA_URL` 接入 MJPEG，正式版本可替换为 WebRTC。
