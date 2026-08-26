# 系统架构

## 页面与分层

```text
Vue Router
├── /mining-brain  煤矿机器人具身智能作业大脑
└── /fr3           FR3 抓取与码放系统

MiningMockDataSource ─┐
MiningRosDataSource  ─┼─> Mining Pinia Store ─> UI Components
                      │                     ├─> MiningSceneManager
MJPEG / WebRTC adapter┘                     └─> SVG detection overlays
```

煤矿页面代码集中在 `src/mining/`：配置、类型、统一数据源、Pinia、Three.js 场景和职责拆分的 Vue 组件。Mock 模式在顶部明确标识，ROS 模式按钮只发布请求；前端不推断真机完成。

工作流、任务计划、检测、设备和事件 JSON 通过 Zod 校验。REP-103 坐标转换复用 `src/three/rosCoordinates.ts`，关节状态按名称映射。Three.js 组件卸载时释放动画、监听器、几何体、材质、控制器和 renderer；规划路径使用蓝色虚线，实际执行路径使用青色实线。
