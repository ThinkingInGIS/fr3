#!/usr/bin/env python3
"""ROS1 Noetic dashboard interface demo; replace demo values with real task/controller data."""

import json
import time

import rospy
from std_msgs.msg import String


def epoch_ms():
    return int(time.time() * 1000)


def publish_json(publisher, payload):
    publisher.publish(String(data=json.dumps(payload, ensure_ascii=False, separators=(",", ":"))))


def main():
    rospy.init_node("dashboard_interface_demo")
    workflow_pub = rospy.Publisher("/embodied_brain/workflow_state", String, queue_size=1, latch=True)
    robot_pub = rospy.Publisher("/robot/status", String, queue_size=5, latch=True)
    runtime_pub = rospy.Publisher("/embodied_brain/task_state", String, queue_size=1, latch=True)
    task_plan_pub = rospy.Publisher("/embodied_brain/task_plan", String, queue_size=1, latch=True)
    event_pub = rospy.Publisher("/embodied_brain/events", String, queue_size=100, latch=False)

    task_id = "demo-{}".format(epoch_ms())
    started_at = epoch_ms()
    event_sequence = 0
    rate = rospy.Rate(5)
    parents = [("rod", "钻杆"), ("resin", "锚固剂"), ("bolt", "锚杆")]
    actions = [("检测", "检测"), ("抓取", "抓取"), ("上料", "上料")]
    task_plan = []
    for parent_order, (parent_id, object_name) in enumerate(parents, 1):
        children = []
        for child_order, (title_suffix, description_prefix) in enumerate(actions, 1):
            children.append({
                "id": "{}-{}".format(parent_id, child_order), "parentId": parent_id, "order": child_order,
                "title": "{}{}".format(object_name, title_suffix),
                "description": "{}{}目标".format(description_prefix, object_name), "status": "PENDING", "progress": 0,
            })
        task_plan.append({
            "id": parent_id, "order": parent_order, "title": "{}备料".format(object_name),
            "status": "PENDING", "progress": 0, "children": children,
        })
    publish_json(task_plan_pub, task_plan)

    while not rospy.is_shutdown():
        now = epoch_ms()
        elapsed = now - started_at
        progress = min(100.0, elapsed / 300.0)
        completed = min(9, int(progress * 9 / 100))
        stage = "COMPLETED" if progress >= 100 else "TASK_EXECUTION"
        running = progress < 100

        publish_json(workflow_pub, {
            "taskId": task_id, "command": "开始钻锚作业", "recognizedIntent": "执行钻锚备料流程",
            "stage": stage, "previousStage": "TASK_PLANNING", "currentTaskId": "rod-grasp",
            "currentObjectId": "DrillRod-01", "progress": progress,
            "message": "作业完成" if not running else "正在执行：钻杆抓取",
            "decisionReasons": ["目标位姿可达", "碰撞检查通过"], "startedAt": started_at,
            "updatedAt": now, "planningDurationMs": 186,
        })
        publish_json(robot_pub, {
            "timestamp": now, "controllerState": "IDLE" if not running else "EXECUTING",
            "tcpPosition": {"x": 0.421, "y": -0.103, "z": 0.386},
            "tcpOrientation": {"x": 0.0, "y": 0.707, "z": 0.0, "w": 0.707},
            "tcpLinearSpeed": 0.0 if not running else 0.12, "tcpAngularSpeed": 0.0 if not running else 0.18,
            "gripperWidth": 0.021, "gripperForce": 24.6,
            "gripperState": "CLOSED" if not running else "GRASPING",
            "plannedProgress": 100.0, "executedProgress": progress,
        })
        publish_json(runtime_pub, {
            "taskId": task_id, "currentTaskId": "rod-grasp", "currentTaskTitle": "钻杆抓取",
            "currentObjectId": "DrillRod-01", "startedAt": started_at, "elapsedMs": elapsed,
            "planningDurationMs": 186, "totalTaskCount": 9, "completedTaskCount": completed,
            "remainingTaskCount": 9 - completed, "overallProgress": progress,
            "lastActionResult": "钻杆检测完成", "decisionReasons": ["目标可达", "碰撞检查通过"],
            "running": running, "updatedAt": now,
        })

        if elapsed // 5000 > event_sequence:
            event_sequence = elapsed // 5000
            publish_json(event_pub, {
                "id": "{}-evt-{}".format(task_id, event_sequence), "timestamp": now,
                "level": "SUCCESS" if not running else "ACTION", "stage": stage,
                "taskId": "rod-grasp", "message": "作业完成" if not running else "机械臂正在执行轨迹",
                "details": {"progress": progress},
            })
        rate.sleep()


if __name__ == "__main__":
    main()
