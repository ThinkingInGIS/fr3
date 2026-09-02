# FR3 具身智能 Web 展示系统——Codex 开发 Prompt

> 使用方法：将本文件放入待开发项目根目录，然后将“主开发 Prompt”以下内容整体交给 Codex 执行。若项目中已有代码，以增量修改为原则，不覆盖用户已有成果。

---

## 主开发 Prompt

你是一名具备机器人系统、ROS 2、Vue 3、Three.js 与实时可视化经验的高级全栈工程师。请在当前项目中开发一个面向参观展示和实验操作的“FR3 具身智能抓取与码放展示系统”。

系统以 Franka FR3 机械臂和 Intel RealSense D435i 手腕相机为基础，后续可接入一台全局相机。机器人需要在待抓取区域内识别任意摆放的多个目标，自主选择目标、生成抓取方案、执行抓取，并将目标整齐码放到指定区域。Web 端要把机器人内部的“感知—理解—规划—执行—反馈”闭环清晰地展示出来，让参观者看到机器人为何行动，而不仅是看到机械臂运动。

### 一、执行原则

1. 开始编码前，先检查当前仓库结构、已有依赖、README、AGENTS.md、环境变量示例和未提交改动。
2. 若已有项目，采用增量开发，保留现有功能、样式和用户修改；不得擅自重置或删除无关文件。
3. 先输出简短实施计划和预计修改文件，再开始编码。
4. 优先交付可独立运行的前端演示版本，并提供 Mock 数据模式；没有 ROS 2、相机或机械臂时，页面也必须完整运行。
5. 将 ROS 通信、视频传输、三维渲染和业务状态解耦，禁止把所有逻辑堆积在单一 Vue 组件中。
6. 所有 Web 地址、Topic 名称、模型路径、刷新频率均通过配置或环境变量管理，不得散落硬编码。
7. 完成后执行构建、类型检查、Lint 和已有测试；修复由本次开发引入的问题。
8. 最后报告：实现内容、修改文件、运行命令、配置方法、验证结果、已知限制和下一步建议。

### 二、目标技术栈

前端使用：

- Vue 3
- TypeScript
- Vite
- Pinia
- Element Plus
- Three.js
- `urdf-loader` 或等价的 Three.js URDF 加载方案
- roslibjs
- ECharts

机器人与数据侧使用：

- Ubuntu 24.04
- ROS 2 Jazzy
- Franka ROS 2 / MoveIt 2
- `rosbridge_suite`
- RealSense ROS 2
- OpenCV 与现有目标检测、实例分割或 6D 位姿估计节点

可选后端使用 FastAPI，负责配置、任务历史、统计、日志和文件服务。第一阶段的实时 ROS 数据优先由浏览器通过 rosbridge WebSocket 订阅；视频不得使用 rosbridge 传输原始高频图像。

部署使用：

- Nginx 托管 Vite 构建产物
- WebSocket 反向代理连接 rosbridge
- 视频第一版允许使用 `web_video_server` 的 MJPEG；正式演示版优先预留 WebRTC

### 三、总体架构

实现以下数据链路：

```text
D435i / 全局相机
        ↓
ROS 2 感知节点 → 目标检测 / 分割 / 6D Pose
        ↓
World Model → 目标选择 → MoveIt 2 → 视觉伺服 → FR3
        │
        ├── rosbridge / WebSocket：状态、位姿、TF、目标、轨迹、日志
        ├── MJPEG 或 WebRTC：相机视频
        └── FastAPI：配置、历史、统计、文件（可选）
                         ↓
                  Vue 3 Web Dashboard
```

前端必须同时支持两种数据源：

- `mock`：无需 ROS 环境，可自动演示完整抓取闭环。
- `ros`：连接真实 rosbridge、视频服务和 ROS 2 Topic。

通过环境变量切换，例如：

```dotenv
VITE_DATA_SOURCE=mock
VITE_ROSBRIDGE_URL=ws://127.0.0.1:9090
VITE_WRIST_VIDEO_URL=http://127.0.0.1:8080/stream?topic=/camera/camera/color/image_raw
VITE_GLOBAL_VIDEO_URL=
VITE_ROBOT_MODEL_URL=/models/fr3/fr3.urdf
```

### 四、页面设计

页面定位为“具身智能作业驾驶舱”，采用深色科技风，但保持信息清晰、克制，避免无意义发光和过度动画。推荐 1920×1080 大屏优先，同时适配 1366×768；最低宽度下允许面板折叠。

#### 1. 顶部状态栏

显示：

- 系统名称：`FR3 具身智能抓取与码放系统`
- ROS 连接状态
- 机械臂状态
- 相机状态
- 当前模式：Mock / Live
- 当前任务进度，例如 `3 / 6`
- 启动、暂停、继续、停止和复位按钮

涉及真实机械臂的动作按钮必须有明显状态反馈；停止操作应突出显示。前端按钮只发送请求，不得自行假定机械臂已完成动作，最终状态以 ROS 返回为准。

#### 2. 左上：机器人视觉

实现视图切换：

- 手腕 RGB
- 深度图
- 点云
- AI 识别叠加
- 后续全局相机
- 后续多相机融合视图

第一版默认显示“RGB 视频 + Canvas/SVG 检测叠加层”，识别框不要直接烧录到视频。叠加内容包括：目标 ID、类别、置信度、当前目标、抓取点和抓取方向。

必须正确处理视频原始尺寸与页面缩放、`object-fit`、留黑和坐标映射，保证检测框与视频内容一致。

#### 3. 左下：场景理解 / World Model

用结构化列表展示机器人对环境的理解：

- 待抓取区中的目标数量
- 每个目标的 ID、类别与状态
- 状态包括：可抓取、当前目标、遮挡、不可达、已抓取、已放置
- 码放区槽位的占用状态
- 下一目标与下一放置槽位

不要只展示算法名，应使用“场景感知”“空间理解”“目标可达性”等面向能力的表述。

#### 4. 中央：Three.js 数字孪生主视图

这是页面视觉中心，至少展示：

- FR3 机械臂实时关节姿态
- 夹爪状态
- 工作台或简化环境模型
- D435i 手腕相机位置与视锥
- 预留全局相机和视锥
- 待抓取区与码放区的半透明边界
- 识别目标的三维模型或包围盒
- 目标 ID、状态与 6D Pose 坐标轴
- 当前抓取目标高亮
- 末端执行器坐标系
- 预抓取位姿、抓取位姿与放置位姿
- 规划轨迹折线或平滑曲线
- 可选降采样点云

数字孪生要求：

- 使用独立的 Three.js 渲染模块和 Vue 生命周期封装。
- 使用 `requestAnimationFrame`，组件卸载时释放几何体、材质、纹理、事件与动画循环。
- 支持 OrbitControls，但避免操作时页面滚动冲突。
- 处理 ROS REP-103 与 Three.js 坐标系之间的统一转换，并将转换集中封装，不允许各组件分别交换轴。
- 关节更新按 joint name 映射，不能假设消息数组顺序固定。
- 高频消息进行节流；渲染更新与消息接收解耦。
- 若 URDF 或网格资源加载失败，显示明确占位模型和错误状态，页面不得崩溃。

#### 5. 右侧：任务决策与动作计划

显示：

- 总任务目标
- 当前阶段
- 当前目标与下一槽位
- 目标选择原因：可见、少遮挡、可达、碰撞风险低、代价较小等
- 当前动作计划：接近、视觉精定位、抓取、提升、搬运、放置、验证
- 规划耗时、轨迹长度、抓取评分等可选指标

“选择原因”由 ROS 消息提供，前端不得编造真实系统的推理结论。Mock 模式可使用固定演示数据，但需要标识为演示模式。

#### 6. 右下：视觉伺服闭环

使用 ECharts 展示最近 10 秒或配置窗口内的误差曲线：

- X、Y、Z，单位 mm
- Rx、Ry、Rz，单位 °
- 平移误差范数
- 当前阈值
- `INACTIVE / ALIGNING / CONVERGED / FAILED` 状态

突出展示误差逐步收敛的过程，例如 `18.6 mm → 0.9 mm`。图表采用滚动窗口并限制更新频率，防止高频重绘。

#### 7. 底部：具身智能闭环与任务时间线

展示可动态点亮的阶段：

```text
感知 → 理解 → 规划 → 执行 → 反馈
```

下方显示带时间戳的事件时间线，例如：发现目标、选择目标、生成抓取位姿、规划成功、视觉伺服收敛、抓取成功、放置完成、结果验证。日志应支持自动滚动、暂停滚动、级别筛选和最多条数限制。

### 五、前端工程结构

如果当前项目结构允许，按职责组织为：

```text
src/
├── components/
│   ├── layout/
│   │   └── SystemHeader.vue
│   ├── vision/
│   │   ├── RobotVision.vue
│   │   └── DetectionOverlay.vue
│   ├── digital-twin/
│   │   └── DigitalTwin.vue
│   ├── world-model/
│   │   └── SceneUnderstanding.vue
│   ├── task/
│   │   ├── TaskDecision.vue
│   │   ├── EmbodiedLoop.vue
│   │   └── TaskTimeline.vue
│   └── servo/
│       └── VisualServoChart.vue
├── three/
│   ├── sceneManager.ts
│   ├── robotModel.ts
│   ├── pointCloud.ts
│   ├── cameraFrustum.ts
│   ├── objectMarkers.ts
│   ├── trajectory.ts
│   └── rosCoordinates.ts
├── ros/
│   ├── rosClient.ts
│   ├── topicRegistry.ts
│   ├── messageAdapters.ts
│   └── commandService.ts
├── services/
│   ├── dataSource.ts
│   ├── mockDataSource.ts
│   └── rosDataSource.ts
├── stores/
│   ├── connection.ts
│   ├── robot.ts
│   ├── vision.ts
│   ├── worldModel.ts
│   └── task.ts
├── types/
│   ├── robot.ts
│   ├── vision.ts
│   ├── worldModel.ts
│   └── task.ts
├── config/
│   └── runtime.ts
└── views/
    └── DashboardView.vue
```

可以结合已有项目调整，但必须维持数据源、状态、渲染和 UI 的分层。

### 六、ROS 2 接口约定

不要假设以下 Topic 已经存在。先将接口集中放入配置文件，并提供 `.env.example`。若真实消息类型尚未确定，前端通过适配器转换成统一内部类型，以便后续替换。

#### 必须接入或预留的 Topic

| 数据 | 默认 Topic | ROS 消息建议 | 前端用途 |
|---|---|---|---|
| 关节状态 | `/joint_states` | `sensor_msgs/msg/JointState` | FR3 姿态 |
| TF | `/tf`、`/tf_static` | `tf2_msgs/msg/TFMessage` | 相机、目标、末端位姿 |
| 彩色图像 | `/camera/camera/color/image_raw` | 视频服务转换 | 手腕视角 |
| 深度图 | `/camera/camera/aligned_depth_to_color/image_raw` | 视频服务转换 | 深度视图 |
| 点云 | `/camera/camera/depth/color/points` | `sensor_msgs/msg/PointCloud2` | 降采样后展示 |
| 检测结果 | `/detected_objects` | 自定义消息或 JSON | 2D 框、类别、置信度 |
| 世界模型 | `/world_model` | 自定义消息或 JSON | 目标和槽位状态 |
| 当前目标 | `/grasp_target` | 自定义消息或 JSON | 目标高亮、抓取位姿 |
| 规划轨迹 | `/display_planned_path` | `moveit_msgs/msg/DisplayTrajectory` | 三维轨迹 |
| 伺服误差 | `/visual_servo/error` | 自定义消息或 JSON | 收敛曲线 |
| 任务状态 | `/task_state` | 自定义消息或 JSON | 阶段、进度、决策说明 |
| 任务事件 | `/task_events` | 自定义消息或 JSON | 时间线 |

对于第一版自定义数据，可以使用 `std_msgs/msg/String` 承载 JSON，但代码中必须保留 schema 校验和错误处理；正式版本建议定义 ROS 2 interface package。

#### 内部统一数据模型示例

```ts
type TaskStage =
  | 'IDLE'
  | 'PERCEPTION'
  | 'TARGET_SELECTION'
  | 'MOTION_PLANNING'
  | 'APPROACH'
  | 'VISUAL_SERVO'
  | 'GRASP'
  | 'LIFT'
  | 'TRANSPORT'
  | 'PLACE'
  | 'VERIFY'
  | 'FINISH'
  | 'PAUSED'
  | 'ERROR'

interface DetectedObject {
  id: string
  className: string
  confidence: number
  bbox2d?: { x: number; y: number; width: number; height: number }
  pose?: {
    frameId: string
    position: { x: number; y: number; z: number }
    orientation: { x: number; y: number; z: number; w: number }
  }
  state: 'graspable' | 'selected' | 'occluded' | 'unreachable' | 'grasped' | 'placed'
  graspScore?: number
}

interface TaskState {
  taskId: string
  taskName: string
  stage: TaskStage
  targetId?: string
  targetSlotId?: string
  progress: number
  total: number
  reasons: string[]
  message: string
  updatedAt: number
}

interface ServoError {
  timestamp: number
  translationMm: { x: number; y: number; z: number }
  rotationDeg: { x: number; y: number; z: number }
  translationNormMm: number
  thresholdMm: number
  status: 'INACTIVE' | 'ALIGNING' | 'CONVERGED' | 'FAILED'
}
```

使用 Zod 或等价方式对通过 JSON 接收的外部数据做运行时校验。非法消息只记录警告，不得导致页面崩溃。

### 七、视频与点云策略

视频：

- 不通过 rosbridge 传原始 `sensor_msgs/Image`。
- 第一版通过 MJPEG URL 接入；抽象出视频源接口，后续替换 WebRTC。
- 识别结果单独通过 ROS 2 Topic 传输，在浏览器叠加。
- 网络断开时显示最近更新时间、重连状态与清晰占位画面。

点云：

- 不允许将 30 万点级原始 PointCloud2 以 JSON 高频发送到浏览器。
- ROS 侧先进行体素降采样、ROI 裁剪和频率限制。
- 第一版建议 1–3 Hz、约 1 万至 3 万点；使用二进制格式优先。
- Three.js 使用 `BufferGeometry` 和 `Points`，复用缓冲区，避免每帧重新创建对象。
- UI 提供点大小、显示隐藏和着色模式切换。

### 八、交互与可靠性要求

1. rosbridge 支持自动重连、指数退避、手动重连和连接超时提示。
2. 页面必须区分：ROS 已连接、视频已连接、机械臂可用、数据已过期。
3. 对 `/joint_states`、TF、伺服误差等高频数据进行节流或采样。
4. 在状态栏显示最近消息时间；超过阈值时标为 `STALE`。
5. 启动、暂停、继续、停止、复位命令使用统一 command service，并防止短时间重复点击。
6. 真实控制命令发布前提供确认机制的接口；Mock 模式不需要确认。
7. 页面刷新后不应自动触发机械臂任务。
8. 系统错误要以用户可理解的方式展示，同时在开发控制台保留技术细节。
9. 不在前端保存机器人密码、密钥或敏感凭据。
10. 为相机、ROS、URDF 和接口异常提供降级显示，单一模块故障不能拖垮整个 Dashboard。

### 九、Mock 演示模式

必须实现可自动循环的一次完整演示：

```text
发现 6 个目标
→ 更新 World Model
→ 选择 Obj-04 并展示原因
→ 生成并显示规划轨迹
→ FR3 沿轨迹接近
→ 进入视觉伺服，误差从约 20 mm 收敛至 1 mm 内
→ 夹爪闭合并抓取
→ 搬运至 Slot-03
→ 放置并更新槽位占用
→ 验证成功
→ 继续下一目标或进入完成状态
```

Mock 数据必须复用真实数据源的内部接口，不允许在各组件内分别写定时器和随机数。提供“开始演示”“暂停”“重置”和“播放速度”控制。

### 十、分阶段实施

严格按以下顺序推进，每阶段完成后验证再进入下一阶段。

#### 阶段 1：可运行 UI 骨架与 Mock 闭环

- 创建整体 Dashboard 布局和设计变量。
- 完成顶部状态栏、视觉面板、场景理解、任务决策、伺服图表、闭环步骤和时间线。
- 创建 Three.js 简化工作区、简化 FR3 占位模型、目标、区域和轨迹。
- 完成 Pinia 状态模型和 MockDataSource。
- Mock 模式完整走通一次抓取与码放流程。

验收：执行安装和开发命令后，无需 ROS 即可看到完整动画；控制台无持续报错；页面在 1920×1080 和 1366×768 可用。

#### 阶段 2：ROS 2 基础连接

- 接入 rosbridge 和 roslibjs。
- 订阅 `/joint_states`、`/task_state`、`/detected_objects`。
- 实现断线重连、数据时效状态和消息适配器。
- 将 Mock/ROS 切换集中到 DataSource 层。

验收：模拟或真实 Topic 发布时，页面对应状态更新；ROS 不可用时页面仍可打开并提示离线。

#### 阶段 3：FR3 数字孪生

- 加载 FR3 URDF 与 mesh。
- 按 joint name 更新关节。
- 接入 TF、相机视锥、目标 Pose、抓取位姿与规划轨迹。
- 完成坐标系转换和资源释放。

验收：RViz 与 Web 中关键关节、相机和目标位姿视觉一致；长期运行没有明显内存持续增长。

#### 阶段 4：相机、识别叠加与点云

- 接入手腕相机视频。
- 完成检测框坐标映射和当前目标高亮。
- 接入降采样点云。
- 预留全局相机切换入口。

验收：视频缩放时检测框仍正确对齐；点云显示流畅且可关闭；断流时有明确反馈。

#### 阶段 5：任务控制、视觉伺服与部署

- 接入任务控制 Topic、Service 或 Action。
- 完成伺服误差实时图表和任务事件时间线。
- 配置 Nginx 静态部署、WebSocket 代理和视频代理示例。
- 补充正式 README、环境变量文档和 ROS 2 接口文档。

验收：能够通过 Web 发起一次经过确认的任务，状态完全由 ROS 回传驱动；生产构建成功；刷新页面不触发动作。

### 十一、质量与测试标准

至少完成：

- TypeScript 无新增类型错误。
- Vite 生产构建成功。
- ESLint 通过；若项目已有格式化规则，遵循现有规则。
- 为消息适配器、坐标转换、状态机和检测框映射编写单元测试。
- 为 Mock 完整任务流程编写至少一个集成测试。
- 测试 rosbridge 断连、非法 JSON、缺失字段、视频断流、URDF 加载失败和数据过期。
- 三维模块卸载后不残留动画循环、监听器或 WebGL 资源。
- 不修改与任务无关的文件，不提交生成目录和敏感配置。

### 十二、交付文件

最终至少应包含：

- 完整前端源码
- `.env.example`
- `README.md`
- `docs/architecture.md`
- `docs/ros-interfaces.md`
- `docs/deployment.md`
- Nginx 示例配置
- Mock 数据与演示说明
- 必要测试

README 需要明确写出：

1. 环境要求与安装命令。
2. Mock 模式启动方法。
3. ROS 模式启动方法。
4. rosbridge 与视频服务启动示例。
5. Topic 和消息类型配置位置。
6. FR3 URDF、mesh 和静态资源放置方法。
7. 构建与部署方法。
8. 常见故障排查。

### 十三、首轮开发的完成边界

如果当前仓库只是空项目或需求规模无法在一轮内全部完成，首轮只实现“阶段 1 + 阶段 2 的接口骨架”，但必须做到：

- 页面完整且观感接近正式展示系统。
- Mock 闭环可自动演示。
- 数据源接口允许无痛切换到 ROS。
- Three.js 主视图存在并具备目标、区域、轨迹和简化机械臂动画。
- 所有后续功能以明确接口和 TODO 记录，而不是伪装成已接入真实设备。

不要用静态截图代替功能，不要声称未验证的真机能力已经完成。

### 十四、开始执行

现在请：

1. 检查仓库并总结当前技术状态。
2. 给出 5–8 步实施计划。
3. 明确本轮准备完成的阶段与不会完成的部分。
4. 开始编码并持续验证。
5. 完成后给出简洁、可复现的交付说明。

---

## 可选补充信息（使用前按项目实际填写）

```text
项目根目录：
当前前端框架及版本：
ROS 2 主机 IP：
rosbridge 地址：
D435i 彩色视频地址：
深度视频地址：
FR3 URDF 路径：
MoveIt 规划组名称：
末端 Link 名称：
自定义消息包名称：
是否先只做 Mock Demo：是 / 否
是否允许增加 FastAPI：是 / 否
目标物类别与外观：
待抓取区尺寸与坐标：
码放区尺寸、槽位数量与坐标：
品牌名称、Logo 与配色要求：
```

