# ROS1 Noetic 页面接口约定

页面通过 rosbridge WebSocket 订阅 ROS1 Topic。除高频关节角使用标准消息外，业务状态统一使用 `std_msgs/String`，其 `data` 字段为 JSON 字符串。这样无需先编译自定义消息包，适合当前联调阶段。

## Topic 总览

| 页面模块 | Topic | ROS1 类型 | 建议频率 | 发布规则 |
|---|---|---|---|---|
| Workflow | `/embodied_brain/workflow_state` | `std_msgs/String` | 状态变化时 + 1 Hz | 全量快照，建议 latch |
| 机械臂关节/模型 | `/joint_states` | `sensor_msgs/JointState` | 10–30 Hz | 标准关节状态 |
| 机械臂作业状态 | `/robot/status` | `std_msgs/String` | 5–10 Hz | 全量快照，建议 latch |
| 规划 TCP 路径 | `/embodied_brain/planned_path` | `std_msgs/String` | 每段规划成功时 | 点列 JSON，建议 latch |
| 系统作业信息 | `/embodied_brain/task_state` | `std_msgs/String` | 2–5 Hz | 全量快照，建议 latch |
| 执行日志 | `/embodied_brain/events` | `std_msgs/String` | 事件发生时 | 单条事件，不 latch |
| 长程任务计划 | `/embodied_brain/task_plan` | `std_msgs/String` | 计划生成/变化时 | 全量数组，建议 latch |
| Web 指令（页面发布） | `/embodied_brain/command` | `std_msgs/String` | 按请求 | ROS 节点订阅 |
| 开始行动触发（页面发布） | `/embodied_brain/action_trigger` | `std_msgs/String` | 点击发送指令成功时 | 单条 JSON，不 latch |

所有时间字段统一为 Unix epoch **毫秒**，进度统一为 `0–100`。JSON 字段名区分大小写。状态快照必须发送完整字段；缺字段或枚举非法时，页面会丢弃该条消息并在浏览器控制台警告。

## 点击“发送指令”的开始行动触发

ROS 模式下，页面发送自然语言到 `/embodied_brain/command` 后，会立即向 `/embodied_brain/action_trigger` 发布 `std_msgs/String` JSON：

```json
{
  "event": "START_ACTION",
  "requestId": "web-<uuid>",
  "command": "开始钻锚作业",
  "source": "web-dashboard",
  "requestedAt": 1787700000000
}
```

该 Topic 仅代表 Web 请求，订阅节点必须先校验 `event`、任务状态和硬件安全条件，再启动规划或执行；不要把它接到机械臂底层运动控制或急停逻辑。每个 `requestId` 只处理一次，避免浏览器重发造成重复启动。

ROS1 订阅骨架：

```python
import json
import rospy
from std_msgs.msg import String

handled = set()

def on_action_trigger(message):
    try:
        payload = json.loads(message.data)
    except ValueError:
        rospy.logwarn('忽略非法 action_trigger JSON')
        return
    request_id = payload.get('requestId')
    if payload.get('event') != 'START_ACTION' or not request_id or request_id in handled:
        return
    # 在这里检查：机器人非急停、无活动任务、互锁满足、目标可达等。
    if not robot_is_safe_and_idle():
        rospy.logwarn('拒绝开始请求：机器人未就绪')
        return
    handled.add(request_id)
    start_task_planner(payload['command'], request_id)

rospy.Subscriber('/embodied_brain/action_trigger', String, on_action_trigger, queue_size=10)
```

## Workflow

```json
{
  "taskId": "task-001",
  "command": "开始钻锚作业",
  "recognizedIntent": "执行钻锚备料流程",
  "stage": "TASK_EXECUTION",
  "previousStage": "TASK_PLANNING",
  "currentTaskId": "rod-grasp",
  "currentObjectId": "DrillRod-01",
  "progress": 48,
  "message": "正在执行：钻杆抓取",
  "decisionReasons": ["目标置信度满足阈值", "目标位姿可达"],
  "startedAt": 1787700000000,
  "updatedAt": 1787700012000,
  "planningDurationMs": 186
}
```

`stage` 只允许：`IDLE`、`COMMAND`、`INTENT_UNDERSTANDING`、`TASK_PLANNING`、`TASK_EXECUTION`、`COMPLETED`、`PAUSED`、`ERROR`。暂停或错误时用 `previousStage` 指明流程条原来所在阶段。

## 机械臂作业状态

`/joint_states` 继续负责驱动 URDF。`/robot/status` 负责状态卡片中无法从关节角可靠推导的数据：

```json
{
  "timestamp": 1787700012500,
  "controllerState": "EXECUTING",
  "tcpPosition": {"x": 0.421, "y": -0.103, "z": 0.386},
  "tcpOrientation": {"x": 0.0, "y": 0.707, "z": 0.0, "w": 0.707},
  "tcpLinearSpeed": 0.12,
  "tcpAngularSpeed": 0.18,
  "gripperWidth": 0.021,
  "gripperForce": 24.6,
  "gripperState": "GRASPING",
  "plannedProgress": 100,
  "executedProgress": 63
}
```

- 位置、夹爪开度：米；速度：m/s、rad/s；力：N；四元数顺序为 x/y/z/w。
- `controllerState`：`IDLE | PLANNING | EXECUTING | PAUSED | ERROR`。
- `gripperState`：`OPEN | CLOSED | GRASPING | ERROR`。
- 页面超过 `VITE_STALE_TIMEOUT_MS` 未收到新 `timestamp` 会显示 `STALE`。

## 轨迹规划与动态执行路径

规划节点在每段 MoveIt 路径成功后，向 `/embodied_brain/planned_path` 发布 TCP 路径点数组。页面将其绘制为**蓝色虚线**，并清空上一段的执行轨迹：

```json
[
  {"x": 0.20, "y": 0.05, "z": 0.52},
  {"x": 0.32, "y": -0.03, "z": 0.46},
  {"x": 0.44, "y": -0.12, "z": 0.32},
  {"x": 0.55, "y": -0.18, "z": 0.18}
]
```

每个点使用 ROS 坐标系的米单位，至少要有两个点。执行期间，`/robot/status` 必须以 5–10 Hz 连续发布 `controllerState: "EXECUTING"` 和实时 `tcpPosition`。页面以不高于 20 Hz 的频率采样 TCP 点并绘制为**青色实线**，从而随机械臂运动动态延长；暂停、空闲或新的规划路径到达时，不再追加旧执行线。

仓库中的 `scripts/ros1_trajectory_status_bridge.py` 可在 ROS1 Noetic 中完成这两个转换：`/joint_states + TF(base_link→tool0)` 生成 `/robot/status`，MoveIt 的 `DisplayTrajectory` 经 `/compute_fk` 生成 `/embodied_brain/planned_path`。该节点只读取状态和规划消息，不控制机械臂。

若使用 `pose_control` 回放 YAML 轨迹，且 YAML 的 `samples[*].position` 已是 `base_frame` 下的 TCP 位置，则不需要 MoveIt 或 FK。启动桥接节点时传入 `~trajectory_yaml`，它会直接读取位置点列并以 latch 发布规划虚线。

桥接节点也会订阅 `/embodied_brain/task_state` 的 `currentTaskId`，并根据以下默认映射自动切换规划虚线：

| 当前任务 ID | YAML 文件 |
|---|---|
| `rod-01` / `rod-1` | `zuangan_pick_01.yaml` |
| `rod-02` / `rod-2` | `zuangan_pick_02.yaml` |
| `rod-03` / `rod-3` | `zuangan_pick_03.yaml` |
| `resin-01` / `resin-1` | `maoguji_pick_02.yaml` |
| `resin-02` / `resin-2` | `maoguji_pick_03.yaml` |
| `resin-03` / `resin-3` | `maoguji_pick_04.yaml` |
| `bolt-01` / `bolt-1` | `maogan_pick_01.yaml` |
| `bolt-02` / `bolt-2` | `maogan_pick_02.yaml` |
| `bolt-03` / `bolt-3` | `maogan_pick_03.yaml` |

默认 YAML 目录为 `/home/w/.ros/pose_control_19/trajectories`，可通过 `~trajectory_directory` 覆盖。
桥接节点会在标准文件名不存在时自动尝试 `_pick_` 替换为 `__pick_`，兼容已有的 `maoguji__pick_02.yaml` 命名。

## 系统作业信息

```json
{
  "taskId": "task-001",
  "currentTaskId": "rod-grasp",
  "currentTaskTitle": "钻杆抓取",
  "currentObjectId": "DrillRod-01",
  "startedAt": 1787700000000,
  "elapsedMs": 12500,
  "planningDurationMs": 186,
  "totalTaskCount": 9,
  "completedTaskCount": 3,
  "remainingTaskCount": 6,
  "overallProgress": 48,
  "lastActionResult": "钻杆检测完成",
  "decisionReasons": ["目标可达", "碰撞检查通过"],
  "running": true,
  "updatedAt": 1787700012500
}
```

页面在两次消息之间会根据 `elapsedMs + (浏览器当前时间 - updatedAt)` 平滑显示计时；任务暂停或结束时必须把 `running` 设为 `false`。

## 长程任务计划（3 个父任务、9 个子任务）

ROS 节点收到 `/embodied_brain/command` 后，应向 `/embodied_brain/task_plan` 发布一个 JSON 数组。每个父任务的 `children` 放 3 个子任务。页面收到数组后渲染 3×3 任务树；点击“发送指令”成功时会清空折叠状态，自动展开全部父任务。

```json
[
  {
    "id": "rod", "order": 1, "title": "钻杆备料", "status": "PENDING", "progress": 0,
    "children": [
      {"id": "rod-1", "parentId": "rod", "order": 1, "title": "钻杆检测", "description": "检测钻杆目标", "status": "PENDING", "progress": 0},
      {"id": "rod-2", "parentId": "rod", "order": 2, "title": "钻杆抓取", "description": "抓取钻杆目标", "status": "PENDING", "progress": 0},
      {"id": "rod-3", "parentId": "rod", "order": 3, "title": "钻杆上料", "description": "上料钻杆目标", "status": "PENDING", "progress": 0}
    ]
  }
]
```

上面展示一个父任务；另外两个父任务使用同样结构，建议 ID 为 `resin`（锚固剂）和 `bolt`（锚杆）。`status` 允许：`PENDING | RUNNING | COMPLETED | SKIPPED | PAUSED | FAILED`。每次任务状态变化后重新发布完整数组，页面即可同步每个节点的状态和进度。

## 执行日志

每条 ROS 消息只放一个事件：

```json
{
  "id": "task-001-evt-00042",
  "timestamp": 1787700012600,
  "level": "ACTION",
  "stage": "TASK_EXECUTION",
  "taskId": "rod-grasp",
  "message": "夹爪闭合完成，夹持力 24.6 N",
  "details": {"width_m": 0.021, "force_n": 24.6}
}
```

`level`：`INFO | THINK | PLAN | VISION | ACTION | WARNING | ERROR | SUCCESS`。`id` 应全局唯一，页面会按 `id` 去重并最多保留 `VITE_MAX_LOG_COUNT` 条。错误恢复建议放在 `details.recovery`。

## ROS1 启动与联调

```bash
source /opt/ros/noetic/setup.bash
roscore
roslaunch rosbridge_server rosbridge_websocket.launch port:=9090
python3 scripts/ros1_dashboard_interface_demo.py
```

前端 `.env`：

```dotenv
VITE_DATA_SOURCE=ros
VITE_ROS_VERSION=1
VITE_ROSBRIDGE_URL=ws://172.20.161.73:9090
VITE_TOPIC_JOINT_STATES=/joint_states
VITE_TOPIC_WORKFLOW_STATE=/embodied_brain/workflow_state
VITE_TOPIC_ROBOT_STATUS=/robot/status
VITE_TOPIC_PLANNED_PATH=/embodied_brain/planned_path
VITE_TOPIC_MINING_TASK_STATE=/embodied_brain/task_state
VITE_TOPIC_EXECUTION_EVENTS=/embodied_brain/events
```

修改 `.env` 后重启 `npm run dev`。可依次检查：

```bash
rostopic type /embodied_brain/workflow_state
rostopic echo -n 1 /embodied_brain/workflow_state
rostopic hz /robot/status
rostopic echo -n 1 /embodied_brain/task_state
rostopic echo /embodied_brain/events
```

原始相机图像不要通过 rosbridge；继续使用 MJPEG/WebRTC URL。生产阶段建议将这些 JSON 固化为自定义 ROS message，并在 rosbridge 配置 Topic 白名单、鉴权和 TLS。Web 的暂停/取消命令不能替代机械臂安全控制和急停。
