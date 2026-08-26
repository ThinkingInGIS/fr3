# 煤矿机器人具身智能作业大脑——Codex 代码开发 Prompt

> 用途：将本文件放到目标代码仓库根目录，然后把“主开发指令”部分交给 Codex。Codex 应依据本文件直接创建或改造前端代码，并提供 Mock 演示与 ROS 2 接口骨架。

## 一、主开发指令

你是一名熟悉 Vue 3、TypeScript、Three.js、ROS 2 Jazzy、MoveIt 2、Franka FR3、RealSense D435i 与机器人数字孪生的高级全栈工程师。请在当前仓库中开发一个名为“煤矿机器人具身智能作业大脑”的 Web 可视化系统。

系统面向煤矿机器人钻锚作业演示。页面要根据自然语言指令生成长程任务计划，展示 FR3 机械臂执行前的路径规划、执行中的双相机画面、机械臂实时状态、任务动态信息、设备连接状态和执行日志，并显性呈现以下闭环：

```text
指令交互 → 意图理解 → 作业规划 → 任务执行 → 作业完成
```

产品叙事为：

```text
主动感知 → 推理决策 → 动作执行
```

不得只做静态页面截图。第一版即使没有 ROS、机械臂和相机，也必须通过 Mock 数据完整演示一次任务流程；真实接入时再由 ROS 2 回传数据驱动页面。

## 二、开始编码前的工作要求

1. 检查仓库中的 `AGENTS.md`、`README.md`、`package.json`、锁文件、现有源码、环境变量示例、Git 状态和已有未提交修改。

2. 如果仓库已有 Vue 项目，在现有技术体系内增量实现，不覆盖、不回退、不删除用户已有成果。

3. 如果仓库为空，创建 Vue 3 + TypeScript + Vite 项目。

4. 先汇报当前仓库状态、实施计划和准备修改的文件，然后开始编码。

5. 不要询问已经能从本文件确定的信息；不影响首轮开发的真实 IP、Topic 或模型路径应使用环境变量和 Mock 默认值。

6. 所有模块必须使用真实组件实现，禁止用一张背景图或大量绝对定位文本伪装成页面。

7. 页面数据、ROS 通信、视频、Three.js 渲染和 UI 组件必须解耦。

8. 完成后执行依赖安装、类型检查、Lint、测试和生产构建，并修复本次开发引入的错误。

## 三、确定的技术栈

### 前端

* Vue 3 Composition API

* TypeScript

* Vite

* Pinia

* Element Plus

* Three.js

* `urdf-loader` 或兼容的 Three.js URDFLoader

* ECharts

* roslibjs

* Zod：校验 JSON 消息

### 机器人侧

* Ubuntu 24.04

* ROS 2 Jazzy

* Franka ROS 2

* MoveIt 2

* rosbridge_suite

* Intel RealSense D435i / RealSense ROS 2

* OpenCV 与现有检测、分割、位姿估计节点

### 视频与部署

* 第一版视频：MJPEG，例如 `web_video_server`

* 后续正式视频：预留 WebRTC 适配器

* Nginx：静态资源、WebSocket 和视频反向代理

* FastAPI：可选，仅用于任务历史、配置、统计和文件服务；不要用它替代 ROS 实时状态链路

## 四、页面总体规格

### 4.1 页面尺寸与风格

* 以 1920×1080 大屏为主设计尺寸。

* 适配 1600×900、1440×900 和 1366×768。

* 最小可用宽度 1280 px；低于该宽度可显示缩放提示。

* 深色工业科技风，主背景使用煤黑或深蓝黑。

* 主色建议使用冷蓝/青色，当前执行阶段使用亮青或橙色，成功使用绿色，告警使用橙色，故障使用红色。

* 面板使用轻微半透明、细边框、低强度辉光；避免过度霓虹和无意义动画。

* 默认界面使用简体中文。

* Logo、标题、主题色均通过配置管理。

建议设计变量：

```css
--bg-page: #070b12;
--bg-panel: rgba(17, 25, 39, 0.88);
--bg-panel-strong: #111927;
--border: rgba(83, 156, 255, 0.32);
--primary: #37a7ff;
--active: #2ee6d6;
--warning: #ffb84d;
--success: #39d98a;
--danger: #ff5b6e;
--text-main: #eaf3ff;
--text-secondary: #94a8bf;
```

### 4.2 页面纵向结构

页面从上到下分为：

1. 顶部品牌与系统状态区。

2. 五阶段作业流程区。

3. 主作业区。

主作业区横向分为：

* 左列：指令交互与长程任务规划看板，约占页面内容宽度 21%。

* 中列：URDF 数字孪生、手腕相机和三类状态信息，约占 49%。

* 右列：全局检测画面与执行日志，约占 26%。

* 列间距约 12–16 px。

不要机械照搬原型中的像素坐标，应使用 CSS Grid 和 Flex 构建响应式布局。

推荐主区域 Grid：

```css
grid-template-columns: minmax(280px, 0.85fr) minmax(620px, 2fr) minmax(320px, 1fr);
```

## 五、页面组件与行为

### 5.1 顶部品牌区 SystemHeader

居中显示：

* 圆形或方形 Logo 占位，后续可替换真实图片。

* 主标题：`煤矿机器人具身智能作业大脑`。

* 副标题：`主动感知 → 推理决策 → 动作执行`。

右侧显示三个状态卡：

1. 连接状态：`在线 / 重连中 / 离线`。

2. 系统时间：按秒更新，格式 `YYYY-MM-DD HH:mm:ss`。

3. 作业模式：`演示模式 / 自动模式 / 手动模式 / 暂停 / 故障`。

连接状态必须综合展示 ROS、手腕相机、全局相机和机械臂；点击状态卡可展开各连接明细。

### 5.2 五阶段流程区 WorkflowStepper

按原型横向显示：

```text
指令交互 → 意图理解 → 作业规划 → 任务执行 → 作业完成
```

每个阶段支持以下状态：

* `pending`：未开始，灰色。

* `active`：当前阶段，发光并带轻微脉冲。

* `completed`：已完成，绿色并显示对勾。

* `error`：失败，红色并显示错误标记。

箭头或连接线需随阶段状态改变颜色。阶段切换由统一任务状态驱动，不允许组件自行猜测。

### 5.3 左上指令交互区 CommandPanel

包含：

* 单行或多行指令输入框。

* 默认演示指令：`开始钻锚作业`。

* `发送`按钮。

* 可选语音输入按钮只保留 UI 和接口，不伪装成已完成语音识别。

* 发送中、成功、拒绝和失败反馈。

行为要求：

* Enter 发送，Shift+Enter 换行。

* 空指令不能发送。

* 防重复点击和命令去重。

* 真实模式发送命令后，只切换到“等待确认”；是否理解成功由 ROS 回传。

* 页面刷新时不得自动发送命令。

* 涉及真机动作时，提供可配置的二次确认开关。

### 5.4 左侧长程任务规划看板 LongHorizonTaskBoard

用树形任务列表展示计划，而不是静态文本。默认 Mock 计划：

```text
1. 钻杆备料
   a. 钻杆检测
   b. 钻杆抓取
   c. 钻杆上料
2. 锚固剂备料
   a. 锚固剂检测
   b. 锚固剂抓取
   c. 锚固剂上料
3. 锚杆备料
   a. 锚杆检测
   b. 锚杆抓取
   c. 锚杆上料
```

每个父任务和子任务需要支持：

* 未开始

* 当前执行

* 已完成

* 跳过

* 失败

* 暂停

显示任务序号、名称、状态图标、进度、开始时间和耗时；当前任务高亮并自动滚动到可视区域。父任务的进度由子任务汇总。

任务内容必须来自数据模型或 ROS 消息，不得硬编码在模板中。上述计划仅用于 Mock 默认值，未来可以更换为其他钻锚工艺。

### 5.5 中上左：URDF 数字孪生与路径预演 RobotDigitalTwin

原型中的“机械臂 urtf 模型显示窗口”统一修正为“机械臂 URDF 模型显示窗口”。

使用 Three.js + URDFLoader 展示：

* Franka FR3 机械臂。

* 夹爪。

* 简化工作台与作业环境。

* 钻杆、锚固剂、锚杆等作业对象的简化几何体或 GLB 模型。

* 机械臂当前姿态。

* 执行动作前的规划路径。

* 当前目标、预抓取位姿、抓取位姿、上料位姿。

* 末端坐标系与可选轨迹采样点。

交互：

* 旋转、平移、缩放。

* 俯视、正视、侧视、自由视角快捷按钮。

* 路径显示/隐藏。

* 环境显示/隐藏。

* 回到默认视角。

* 规划轨迹动画预演。

关键技术要求：

* joint 状态必须按关节名称映射，不能依赖数组顺序。

* ROS REP-103 与 Three.js 坐标转换集中放在 `rosCoordinates.ts`。

* 通过插值平滑显示机械臂姿态，但不能改变真实状态值。

* 规划路径与实际执行路径分别使用虚线/实线或不同颜色。

* Three.js 动画循环与 ROS 消息接收解耦。

* 组件卸载时释放 renderer、controls、材质、纹理、几何体、监听器和动画循环。

* URDF 或 mesh 加载失败时显示简化机械臂占位，不使页面崩溃。

### 5.6 中上右：手腕相机 WristCameraPanel

显示 D435i 手腕相机实时画面。支持：

* RGB。

* 深度图。

* AI 识别叠加。

* 画面连接状态与最近更新时间。

* 全屏查看。

识别框、目标 ID、置信度、抓取点和抓取方向必须使用 Canvas 或 SVG 独立叠加，不能要求算法侧把标注烧录到视频中。

正确处理视频分辨率、容器比例、`object-fit: contain` 留黑区域和识别框坐标映射。

### 5.7 右上：全局摄像头检测画面 GlobalCameraPanel

原型中“摄像头检测画面”定义为后续全局相机画面，主要用于：

* 全局目标搜索。

* 钻杆、锚固剂和锚杆检测。

* 作业区域检测。

* 障碍物和人员进入检测。

* 目标 2D 框、类别、置信度和状态叠加。

* 当前选择目标高亮。

如果当前尚未接入全局相机，必须显示清晰的 Mock 画面或“等待全局相机接入”占位，保留数据源切换接口。

### 5.8 中部机械臂作业状态 RobotStatusPanel

按原型展示：

* FR3 七个关节角度，单位 ° 或 rad，可切换。

* 末端线速度与角速度。

* 末端位置 X/Y/Z。

* 末端姿态 Rx/Ry/Rz 或四元数，可切换。

* 夹爪开度、夹持力与状态。

* 当前控制器状态。

* 当前规划轨迹与执行轨迹进度。

首屏以紧凑指标卡展示关键数据，点击可展开七关节详情。高频数据使用节流和数值平滑，数据过期时显示 `STALE`，不得继续显示成在线实时数据。

### 5.9 中下系统作业信息 TaskRuntimePanel

显示：

* 总执行时间。

* 当前步骤执行时间。

* “思考时间”或规划耗时。

* 当前任务。

* 当前目标对象。

* 当前决策说明。

* 整体进度。

* 计划剩余任务数。

* 最近一次动作结果。

“思考时间”应定义为意图理解、任务规划或动作规划耗时，由后端/ROS 明确提供；前端不得虚构真实推理时长。

### 5.10 中下系统状态信息 DeviceStatusPanel

显示设备和软件模块的连接状态：

* ROS Bridge。

* Franka FR3。

* MoveIt 2。

* D435i 手腕相机。

* 全局相机。

* 目标检测节点。

* 任务规划节点。

* 视觉伺服节点。

* 视频服务。

状态包括：`ONLINE / OFFLINE / CONNECTING / STALE / ERROR / DISABLED`。展示最近心跳时间、延迟和简要错误。卡片过多时横向滚动或折叠，不能破坏主布局。

### 5.11 右下执行日志 ExecutionLogPanel

显示带时间戳的结构化日志：

```text
08:56:10  INFO   收到指令：开始钻锚作业
08:56:11  THINK  已识别意图：执行钻锚备料流程
08:56:12  PLAN   已生成 3 个父任务、9 个子任务
08:56:14  VISION 发现钻杆目标 Obj-01，置信度 96%
08:56:15  PLAN   MoveIt 路径规划成功，轨迹点 42
08:56:18  ACTION 正在执行钻杆抓取
08:56:21  SUCCESS 钻杆抓取完成
```

要求：

* 支持全部、信息、规划、动作、告警、错误筛选。

* 支持关键词搜索。

* 支持自动滚动开关和清空“页面显示”操作。

* 限制内存中的最大日志数量，默认 500 条。

* 清空页面日志不得删除 ROS 或后端历史数据。

* 错误日志点击后可查看详细信息。

## 六、页面数据流与状态机

### 6.1 顶层任务阶段

```ts
type WorkflowStage =
  | 'IDLE'
  | 'COMMAND'
  | 'INTENT_UNDERSTANDING'
  | 'TASK_PLANNING'
  | 'TASK_EXECUTION'
  | 'COMPLETED'
  | 'PAUSED'
  | 'ERROR'
```

映射关系：

| 内部状态                   | 页面阶段        |
| ---------------------- | ----------- |
| `IDLE`、`COMMAND`       | 指令交互        |
| `INTENT_UNDERSTANDING` | 意图理解        |
| `TASK_PLANNING`        | 作业规划        |
| `TASK_EXECUTION`       | 任务执行        |
| `COMPLETED`            | 作业完成        |
| `PAUSED`               | 保持当前阶段并显示暂停 |
| `ERROR`                | 当前阶段显示错误    |

### 6.2 子任务状态

```ts
type TaskNodeStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'PAUSED'
  | 'FAILED'
```

### 6.3 内部数据类型

```ts
interface TaskNode {
  id: string
  parentId?: string
  order: number
  title: string
  description?: string
  status: TaskNodeStatus
  progress: number
  startTime?: number
  endTime?: number
  durationMs?: number
  children?: TaskNode[]
}

interface WorkflowState {
  taskId: string
  command: string
  recognizedIntent?: string
  stage: WorkflowStage
  currentTaskId?: string
  currentObjectId?: string
  progress: number
  message: string
  decisionReasons: string[]
  startedAt?: number
  updatedAt: number
}

interface RobotTelemetry {
  timestamp: number
  jointNames: string[]
  jointPosition: number[]
  jointVelocity: number[]
  jointEffort: number[]
  tcpPosition: { x: number; y: number; z: number }
  tcpOrientation: { x: number; y: number; z: number; w: number }
  tcpLinearSpeed: number
  tcpAngularSpeed: number
  gripperWidth?: number
  gripperForce?: number
  gripperState?: 'OPEN' | 'CLOSED' | 'GRASPING' | 'ERROR'
}

interface Detection {
  id: string
  className: string
  confidence: number
  source: 'WRIST' | 'GLOBAL'
  imageWidth: number
  imageHeight: number
  bbox: { x: number; y: number; width: number; height: number }
  selected: boolean
  state: 'VISIBLE' | 'OCCLUDED' | 'GRASPABLE' | 'UNREACHABLE' | 'HANDLED'
  pose?: {
    frameId: string
    position: { x: number; y: number; z: number }
    orientation: { x: number; y: number; z: number; w: number }
  }
}

interface DeviceStatus {
  id: string
  name: string
  status: 'ONLINE' | 'OFFLINE' | 'CONNECTING' | 'STALE' | 'ERROR' | 'DISABLED'
  latencyMs?: number
  lastHeartbeat?: number
  message?: string
}

interface ExecutionEvent {
  id: string
  timestamp: number
  level: 'INFO' | 'THINK' | 'PLAN' | 'VISION' | 'ACTION' | 'WARNING' | 'ERROR' | 'SUCCESS'
  stage?: WorkflowStage
  taskId?: string
  message: string
  details?: Record<string, unknown>
}
```

所有外部 JSON 消息使用 Zod 校验。非法消息记录警告并丢弃，不能导致页面崩溃。

## 七、ROS 2 与视频接口约定

所有 Topic、Service、Action、消息类型和 URL 必须集中配置，并可由 `.env` 覆盖。若真实接口尚未实现，先提供适配器和 Mock 数据，不要假装已接入。

### 7.1 订阅接口

| 功能          | 默认接口                             | 建议类型                                | 页面用途              |
| ----------- | -------------------------------- | ----------------------------------- | ----------------- |
| 关节状态        | `/joint_states`                  | `sensor_msgs/msg/JointState`        | 关节角、速度、力矩、URDF 姿态 |
| TF          | `/tf`、`/tf_static`               | `tf2_msgs/msg/TFMessage`            | 末端、相机、目标位姿        |
| MoveIt 规划轨迹 | `/display_planned_path`          | `moveit_msgs/msg/DisplayTrajectory` | 执行前路径预演           |
| 当前执行轨迹      | `/executed_trajectory`           | 自定义或 JSON                           | 实际路径显示            |
| 工作流状态       | `/embodied_brain/workflow_state` | 自定义或 `std_msgs/msg/String` JSON     | 顶部五阶段             |
| 长程任务计划      | `/embodied_brain/task_plan`      | 自定义或 JSON                           | 左侧任务树             |
| 当前任务状态      | `/embodied_brain/task_state`     | 自定义或 JSON                           | 当前步骤与进度           |
| 检测结果        | `/detected_objects`              | 自定义或 JSON                           | 双相机检测叠加           |
| 设备状态        | `/system/device_status`          | 自定义或 JSON                           | 底部连接状态            |
| 执行事件        | `/embodied_brain/events`         | 自定义或 JSON                           | 执行日志              |
| 夹爪状态        | `/franka_gripper/joint_states`   | `sensor_msgs/msg/JointState`        | 夹爪开度              |

### 7.2 命令接口

优先使用 ROS 2 Action 表达长时间任务。若当前系统尚未定义 Action，可在第一版使用以下临时接口：

| 功能       | 默认接口                      | 建议类型                   |
| -------- | ------------------------- | ---------------------- |
| 发送自然语言指令 | `/embodied_brain/command` | `std_msgs/msg/String`  |
| 暂停任务     | `/embodied_brain/pause`   | `std_srvs/srv/Trigger` |
| 继续任务     | `/embodied_brain/resume`  | `std_srvs/srv/Trigger` |
| 取消任务     | `/embodied_brain/cancel`  | `std_srvs/srv/Trigger` |
| 复位显示状态   | `/embodied_brain/reset`   | `std_srvs/srv/Trigger` |

真实机械臂的急停必须由符合安全要求的硬件和机器人控制系统实现。Web 中的“停止/取消”只能作为任务取消请求，不得标注为安全急停。

### 7.3 视频接口

* 手腕相机 RGB 默认 URL：由 `VITE_WRIST_RGB_URL` 配置。

* 手腕相机深度默认 URL：由 `VITE_WRIST_DEPTH_URL` 配置。

* 全局相机默认 URL：由 `VITE_GLOBAL_CAMERA_URL` 配置。

* 视频不能通过 rosbridge 发送原始高频 `sensor_msgs/Image`。

* 第一版可使用 MJPEG；代码中定义 `VideoSource` 接口，为 WebRTC 留出实现空间。

### 7.4 推荐环境变量

```dotenv
VITE_APP_TITLE=煤矿机器人具身智能作业大脑
VITE_DATA_SOURCE=mock
VITE_THEME=coal-blue
VITE_ROSBRIDGE_URL=ws://127.0.0.1:9090
VITE_WRIST_RGB_URL=http://127.0.0.1:8080/stream?topic=/camera/camera/color/image_raw
VITE_WRIST_DEPTH_URL=http://127.0.0.1:8080/stream?topic=/camera/camera/aligned_depth_to_color/image_raw
VITE_GLOBAL_CAMERA_URL=
VITE_FR3_URDF_URL=/models/fr3/fr3.urdf
VITE_COMMAND_CONFIRM=true
VITE_STALE_TIMEOUT_MS=3000
VITE_MAX_LOG_COUNT=500
```

同时提交 `.env.example`，不得提交真实密码、Token 或敏感地址。

## 八、Mock 演示流程

创建统一的 `MockDataSource`，完整模拟一次“开始钻锚作业”：

1. 初始状态：连接在线、演示模式、等待指令。

2. 用户发送“开始钻锚作业”。

3. “指令交互”完成，“意图理解”激活，日志显示收到指令。

4. 约 1 秒后返回意图：执行钻锚备料流程。

5. “作业规划”激活，动态生成 3 个父任务和 9 个子任务。

6. “任务执行”激活，从“钻杆检测”开始。

7. 全局相机出现检测框并选择钻杆目标。

8. Three.js 生成规划路径并播放预演。

9. FR3 沿轨迹运动，关节角、末端速度和位置连续更新。

10. 接近目标后切换到手腕相机，显示局部检测叠加。

11. 完成抓取和上料，更新任务状态与日志。

12. 依次模拟锚固剂备料和锚杆备料。

13. 所有任务完成，“作业完成”点亮，系统显示耗时和成功结果。

演示控制：

* 开始。

* 暂停。

* 继续。

* 重置。

* 0.5×、1×、2× 播放速度。

* 可选“触发模拟故障”按钮，用于验证错误状态和恢复逻辑。

Mock 数据必须从统一数据源进入 Pinia，组件不得分别创建定时器和随机业务状态。

## 九、推荐工程结构

```text
src/
├── assets/
├── components/
│   ├── header/
│   │   ├── SystemHeader.vue
│   │   └── ConnectionDetails.vue
│   ├── workflow/
│   │   └── WorkflowStepper.vue
│   ├── command/
│   │   └── CommandPanel.vue
│   ├── tasks/
│   │   └── LongHorizonTaskBoard.vue
│   ├── twin/
│   │   └── RobotDigitalTwin.vue
│   ├── camera/
│   │   ├── CameraPanel.vue
│   │   └── DetectionOverlay.vue
│   ├── status/
│   │   ├── RobotStatusPanel.vue
│   │   ├── TaskRuntimePanel.vue
│   │   └── DeviceStatusPanel.vue
│   └── logs/
│       └── ExecutionLogPanel.vue
├── config/
│   ├── runtime.ts
│   └── rosTopics.ts
├── data-sources/
│   ├── DataSource.ts
│   ├── MockDataSource.ts
│   └── RosDataSource.ts
├── ros/
│   ├── rosClient.ts
│   ├── messageAdapters.ts
│   ├── subscriptions.ts
│   └── commandClient.ts
├── three/
│   ├── sceneManager.ts
│   ├── robotModel.ts
│   ├── trajectoryRenderer.ts
│   ├── objectRenderer.ts
│   └── rosCoordinates.ts
├── stores/
│   ├── connection.ts
│   ├── workflow.ts
│   ├── tasks.ts
│   ├── robot.ts
│   ├── perception.ts
│   └── logs.ts
├── types/
│   ├── workflow.ts
│   ├── robot.ts
│   ├── perception.ts
│   └── system.ts
├── views/
│   └── DashboardView.vue
└── App.vue
```

可结合现有项目结构调整，但必须保持组件、业务状态、外部数据源和 Three.js 渲染分层。

## 十、实现阶段与验收标准

### 阶段 1：页面布局与 Mock 状态机

实现：

* 与原型一致的三列主布局。

* 顶部系统标题、状态卡和五阶段流程。

* 指令输入、任务树、日志、三类状态面板。

* Mock 指令到完成的完整状态机。

* 响应式布局。

验收：无 ROS 环境可运行；输入“开始钻锚作业”后流程自动推进；暂停、继续、重置有效；刷新页面不自动执行。

### 阶段 2：Three.js 与双相机 Mock

实现：

* 简化 FR3 模型或可加载 URDF 的占位方案。

* 工作台、对象、规划轨迹和机械臂动画。

* 手腕与全局相机 Mock 画面。

* 检测框坐标正确叠加。

验收：路径预演和实际执行视觉可区分；视频缩放后检测框仍对齐；Three.js 组件反复挂载不泄漏资源。

### 阶段 3：ROS 2 基础接入

实现：

* rosbridge 连接、自动重连与退避。

* `/joint_states`、工作流、任务计划、检测结果、设备状态、执行事件订阅。

* 命令发布或服务/Action 接口骨架。

* Mock 与 ROS 模式切换。

验收：ROS 断开时页面不崩溃；数据过期显示 `STALE`；消息字段异常可被校验和隔离。

### 阶段 4：真实 URDF、TF、MoveIt 与视频

实现：

* FR3 URDF 与 mesh 加载。

* TF 坐标更新。

* MoveIt 规划轨迹显示。

* 手腕相机视频接入。

* 全局相机预留或接入。

验收：Web 与 RViz 中机械臂、相机和关键目标位姿一致；规划轨迹可正确显示；视频断流有明确提示。

### 阶段 5：部署与系统验证

实现：

* Nginx 静态部署。

* rosbridge WebSocket 反向代理。

* 视频代理示例。

* README、接口文档和部署文档。

* 单元测试与集成测试。

验收：生产构建成功；目标机器可访问；断线重连、非法消息、URDF 加载失败、视频断流和任务失败均有降级处理。

## 十一、质量要求

1. 使用严格 TypeScript，避免无理由使用 `any`。

2. Vue 组件职责清晰，单组件不承载整个系统逻辑。

3. 高频数据存储和渲染需要节流，避免每条消息触发整个页面重绘。

4. 日志、轨迹点和图表数据必须设置数量上限。

5. 页面需处理加载、空数据、离线、过期、错误和权限不足状态。

6. 为状态机、消息适配器、坐标转换、检测框映射编写单元测试。

7. 为 Mock 完整任务流程编写至少一个集成测试。

8. 生产构建不得包含敏感配置。

9. 不修改与任务无关的文件，不重置用户现有 Git 修改。

10. 不用静态图片冒充三维模型、视频、检测框或动态状态。

## 十二、安全与真实性约束

* Web“停止”是任务取消请求，不是硬件安全急停。

* 真机动作的最终状态必须由 ROS 返回，不得仅根据前端按钮点击判断成功。

* 未连接的相机、机械臂、MoveIt 或算法节点必须显示未连接，不得用模拟数据冒充真实数据。

* Mock 模式必须在顶部明确显示“演示模式”。

* 页面加载或刷新不得自动启动机械臂任务。

* 真实模式的动作命令预留二次确认和操作权限接口。

* 任何网络故障、消息超时或数据过期都必须有清晰提示。

## 十三、必须交付的文件

至少包括：

* 完整 Vue 前端源码。

* `.env.example`。

* `README.md`。

* `docs/architecture.md`。

* `docs/ros-interfaces.md`。

* `docs/mock-demo.md`。

* `docs/deployment.md`。

* `deploy/nginx.conf.example`。

* 必要的测试代码。

README 必须写明：

1. 环境要求。

2. 安装和启动命令。

3. Mock 模式使用方法。

4. ROS 模式配置方法。

5. rosbridge 和视频服务的启动示例。

6. Topic 与消息类型的配置位置。

7. FR3 URDF 和 mesh 的放置方法。

8. 构建、Nginx 部署和常见故障排查。

## 十四、本轮首要完成边界

若当前仓库为空，或一轮无法完成全部真实设备接入，本轮优先完成：

1. 阶段 1 的全部功能。

2. 阶段 2 的可演示版本。

3. 阶段 3 的接口骨架和环境变量。

必须达到以下结果：

* 页面结构和信息层级与原型一致。

* 视觉风格达到可用于大屏演示的完成度。

* 输入“开始钻锚作业”可完整演示五阶段流程。

* 左侧任务树逐步执行并更新状态。

* Three.js 显示简化机械臂、作业对象和路径预演。

* 双相机窗口具有 Mock 画面和独立检测叠加层。

* 机械臂状态、任务信息、设备状态和执行日志动态更新。

* 未来接 ROS 时无需重写 UI 组件。

不得声称尚未验证的真机、视觉算法或 ROS 接口已经完成。

## 十五、最终执行指令

现在开始执行以下工作：

1. 检查当前仓库，说明已有技术栈和可复用代码。

2. 输出 5–8 步实施计划和预计修改文件。

3. 明确本轮要实现的阶段及暂不实现的真实设备能力。

4. 开始编码，不要停留在方案说明。

5. 在关键阶段运行检查和构建，及时修复问题。

6. 最终汇报实现内容、文件变化、运行命令、配置方法、验证结果、已知限制和下一步接入 ROS 的具体位置。

## 十六、项目实际参数填写区

使用前可按真实环境补充；未填写时 Codex 应使用 Mock 和环境变量占位，不得阻塞首轮开发。

```text
项目根目录：
当前 Vue/Node 版本：
ROS 2 主机 IP：
rosbridge 地址：
FR3 URDF 路径：
FR3 mesh 路径：
MoveIt 规划组名称：
末端 Link 名称：
手腕相机 RGB Topic：
手腕相机深度 Topic：
全局相机 Topic：
检测结果 Topic 和消息类型：
任务规划 Topic 和消息类型：
任务状态 Topic 和消息类型：
执行日志 Topic 和消息类型：
指令发送方式（Topic / Service / Action）：
钻杆、锚固剂、锚杆模型路径：
Logo 文件：
品牌色：
```

