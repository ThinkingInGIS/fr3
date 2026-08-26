import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { DetectedObject } from '@/types/vision'
import type { TrajectoryPoint } from '@/types/robot'
import { SimplifiedFr3 } from './robotModel'
import { ObjectMarkers } from './objectMarkers'
import { TrajectoryRenderer } from './trajectory'
import { createCameraFrustum } from './cameraFrustum'

export class SceneManager {
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(42, 1, .01, 20)
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  private readonly controls: OrbitControls
  private readonly robot = new SimplifiedFr3()
  private readonly markers = new ObjectMarkers()
  private readonly trajectory = new TrajectoryRenderer()
  private readonly clock = new THREE.Clock()
  private readonly resizeObserver: ResizeObserver
  private frame = 0

  constructor(private readonly container: HTMLElement) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.container.appendChild(this.renderer.domElement)
    this.camera.position.set(1.22, .9, -1.42)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.target.set(0, .24, 0); this.controls.enableDamping = true; this.controls.enablePan = false
    this.controls.minDistance = .75; this.controls.maxDistance = 2.8
    this.buildScene()
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container)
    this.resize(); this.render()
  }

  updateRobot(joints: Record<string, number>, gripperWidth: number) { this.robot.update(joints, gripperWidth) }
  updateObjects(objects: DetectedObject[], selectedId?: string) { this.markers.update(objects, selectedId) }
  updateTrajectory(points: TrajectoryPoint[]) { this.trajectory.update(points) }

  dispose() {
    cancelAnimationFrame(this.frame); this.resizeObserver.disconnect(); this.controls.dispose()
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments) {
        object.geometry?.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => material?.dispose())
      }
    })
    this.renderer.dispose(); this.renderer.domElement.remove()
  }

  private buildScene() {
    this.scene.fog = new THREE.FogExp2(0x071013, .42)
    this.scene.add(new THREE.HemisphereLight(0xa9e8dc, 0x10181a, 2.2))
    const key = new THREE.DirectionalLight(0xffffff, 3.1); key.position.set(1.2, 1.8, -1); this.scene.add(key)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.65), new THREE.MeshStandardMaterial({ color: 0x10191b, roughness: .78, metalness: .08 }))
    floor.rotation.x = -Math.PI / 2; this.scene.add(floor)
    const grid = new THREE.GridHelper(2.4, 24, 0x29514a, 0x172b28); grid.position.y = .002; this.scene.add(grid)
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.25, .07, .82), new THREE.MeshStandardMaterial({ color: 0x273234, roughness: .44, metalness: .25 }))
    table.position.set(.02, .035, 0); this.scene.add(table)
    this.scene.add(this.zone(.52, .5, 0x3bcba8, -.21), this.zone(.45, .5, 0xf0b44d, .36))
    const frustum = createCameraFrustum(); frustum.position.set(.18, .55, .15); frustum.rotation.x = -.52; this.scene.add(frustum)
    const axes = new THREE.AxesHelper(.12); axes.position.set(0, .62, .05); this.scene.add(axes)
    this.scene.add(this.robot.group, this.markers.group, this.trajectory.group)
  }

  private zone(width: number, depth: number, color: number, x: number) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .08, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material); mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, .075, .05)
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color, transparent: true, opacity: .7 }))
    mesh.add(edges); return mesh
  }

  private resize() {
    const { clientWidth: width, clientHeight: height } = this.container
    if (!width || !height) return
    this.camera.aspect = width / height; this.camera.updateProjectionMatrix(); this.renderer.setSize(width, height, false)
  }

  private render = () => {
    this.frame = requestAnimationFrame(this.render); this.controls.update()
    const pulse = .68 + Math.sin(this.clock.getElapsedTime() * 3) * .25
    this.trajectory.group.children.forEach((item) => { if (item instanceof THREE.Line) (item.material as THREE.LineBasicMaterial).opacity = pulse })
    this.renderer.render(this.scene, this.camera)
  }
}
