import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import URDFLoader, { type URDFRobot } from 'urdf-loader'
import { SimplifiedFr3 } from '@/three/robotModel'
import { rosToThree } from '@/three/rosCoordinates'
import type { MiningPoint, RobotTelemetry } from './types'

export type MiningView = 'default' | 'top' | 'front' | 'side'
export type RobotModelState = 'loading' | 'ready' | 'error'
export type PickPlaceState = 'idle' | 'approach' | 'grasp' | 'transfer' | 'place' | 'complete'

const urJointNames = ['shoulder_pan_joint','shoulder_lift_joint','elbow_joint','wrist_1_joint','wrist_2_joint','wrist_3_joint']
const sourcePosition = new THREE.Vector3(-.28,.12,-.22)
const liftPosition = new THREE.Vector3(-.28,.36,-.22)
const transferPosition = new THREE.Vector3(.35,.36,-.12)
const placePosition = new THREE.Vector3(.35,.12,-.12)
const pickPlacePoses = [
  { time:0, joints:[.45,-1.05,1.25,-1.75,-1.57,0] },
  { time:.18, joints:[2.02,-1.12,1.48,-1.88,-1.57,.35] },
  { time:.30, joints:[2.12,-1.38,1.78,-1.98,-1.57,.42] },
  { time:.46, joints:[2.02,-1.08,1.34,-1.72,-1.57,.36] },
  { time:.72, joints:[.58,-1.08,1.38,-1.82,-1.57,-.58] },
  { time:.88, joints:[.52,-1.34,1.70,-1.96,-1.57,-.64] },
  { time:1, joints:[.52,-1.02,1.28,-1.74,-1.57,-.60] },
]

export class MiningSceneManager {
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(48, 1, .01, 20)
  private renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  private controls: OrbitControls
  private fallbackRobot = new SimplifiedFr3()
  private urRobot?: URDFRobot
  private latestTelemetry?: RobotTelemetry
  private environment = new THREE.Group()
  private pathGroup = new THREE.Group()
  private plannedLine?: THREE.Line
  private executedLine?: THREE.Line
  private previewMarker = new THREE.Mesh(new THREE.SphereGeometry(.014, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffb84d }))
  private pickPlaceCurve = new THREE.CatmullRomCurve3([sourcePosition,liftPosition,transferPosition,placePosition])
  private demoPathLine?: THREE.Line
  private workpiece?: THREE.Mesh<THREE.CylinderGeometry,THREE.MeshStandardMaterial>
  private graspIndicator = new THREE.Mesh(new THREE.TorusGeometry(.038,.004,8,24),new THREE.MeshBasicMaterial({color:0xffb84d,transparent:true,opacity:.9}))
  private previewing = false
  private previewStartedAt = 0
  private previewState: PickPlaceState = 'idle'
  private frame = 0
  private observer: ResizeObserver
  private clock = new THREE.Clock()

  constructor(private host: HTMLElement, private onRobotModelState?: (state: RobotModelState) => void, private onPickPlaceState?: (state: PickPlaceState) => void) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.42; host.appendChild(this.renderer.domElement)
    this.camera.position.set(1.1, .86, -1.38)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement); this.controls.target.set(0, .18, -.12); this.controls.enableDamping = true; this.controls.minDistance = .65; this.controls.maxDistance = 3.2
    this.build(); this.loadUr12e(); this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host); this.resize(); this.render()
  }

  updateRobot(telemetry: RobotTelemetry) {
    this.latestTelemetry = telemetry
    const values=Object.fromEntries(telemetry.jointNames.map((name,index)=>[name,telemetry.jointPosition[index]??0]))
    this.fallbackRobot.update(values,telemetry.gripperWidth)
    if(this.previewing)return
    if(!this.urRobot)return
    urJointNames.forEach((jointName,index)=>{
      const sourceName=telemetry.jointNames.find(name=>name===jointName||name.endsWith(jointName))
      const value=sourceName?values[sourceName]:values[`fr3_joint${index+1}`]??telemetry.jointPosition[index]??0
      this.urRobot?.setJointValue(jointName,value)
    })
  }

  updatePaths(planned: MiningPoint[], executed: MiningPoint[]) {
    this.plannedLine = this.replaceLine(this.plannedLine, planned, true, 0x37a7ff)
    this.executedLine = this.replaceLine(this.executedLine, executed, false, 0x2ee6d6)
  }

  setView(view: MiningView) {
    const positions: Record<MiningView, THREE.Vector3> = { default: new THREE.Vector3(1.1,.86,-1.38), top: new THREE.Vector3(0,1.7,-.12), front: new THREE.Vector3(0,.52,-1.55), side: new THREE.Vector3(1.55,.52,-.12) }
    this.camera.position.copy(positions[view]); this.controls.target.set(0,.18,-.12); this.controls.update()
  }
  setPathVisible(visible: boolean) { this.pathGroup.visible = visible }
  setEnvironmentVisible(visible: boolean) { this.environment.visible = visible }
  preview() {
    if(!this.workpiece)return
    this.previewing=true;this.previewStartedAt=this.clock.getElapsedTime()
    this.workpiece.position.copy(sourcePosition);this.workpiece.rotation.set(0,0,Math.PI/2);this.workpiece.material.emissive.setHex(0x000000)
    this.graspIndicator.visible=false;this.previewMarker.visible=true;this.previewMarker.position.copy(sourcePosition)
    this.setPickPlaceState('approach')
  }

  dispose() {
    cancelAnimationFrame(this.frame); this.observer.disconnect(); this.controls.dispose()
    this.scene.traverse((object) => { if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments) { object.geometry?.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => material?.dispose()) } })
    this.renderer.dispose(); this.renderer.domElement.remove()
  }

  private build() {
    this.scene.fog = new THREE.FogExp2(0x08111c, .3)
    this.scene.add(new THREE.HemisphereLight(0xb8dcf3, 0x111923, 3.1))
    this.scene.add(new THREE.AmbientLight(0x8fb7d3, .85))
    const key = new THREE.DirectionalLight(0xe5f4ff, 4.3); key.position.set(1.2, 1.8, -1.1); this.scene.add(key)
    const fill = new THREE.DirectionalLight(0x65bfff, 2.1); fill.position.set(-1.1, .85, .9); this.scene.add(fill)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.7), new THREE.MeshStandardMaterial({ color: 0x101722, roughness: .86, metalness: .1 })); floor.rotation.x = -Math.PI / 2; this.environment.add(floor)
    const grid = new THREE.GridHelper(2.4, 24, 0x254969, 0x17283a); grid.position.y = .002; this.environment.add(grid)
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.25,.075,.76), new THREE.MeshStandardMaterial({color:0x1c2a38,roughness:.55,metalness:.35})); table.position.set(.02,.04,-.12); this.environment.add(table)
    const zone = (x:number,color:number) => { const mesh = new THREE.Mesh(new THREE.PlaneGeometry(.46,.52),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.09,side:THREE.DoubleSide})); mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.081,-.12); const edge=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color,transparent:true,opacity:.75}));mesh.add(edge);return mesh }
    this.environment.add(zone(-.28,0x37a7ff),zone(.35,0xffb84d))
    const rodMaterial = new THREE.MeshStandardMaterial({color:0x6b879d,metalness:.72,roughness:.25}); const resinMaterial = new THREE.MeshStandardMaterial({color:0xe0a53e,roughness:.38}); const boltMaterial = new THREE.MeshStandardMaterial({color:0x43d6c6,metalness:.6,roughness:.3})
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.45,18),rodMaterial); rod.rotation.z=Math.PI/2;rod.position.copy(sourcePosition);this.workpiece=rod
    const resin = new THREE.Mesh(new THREE.CylinderGeometry(.026,.026,.22,18),resinMaterial); resin.rotation.z=Math.PI/2;resin.position.set(-.25,.12,.02)
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,.52,14),boltMaterial); bolt.rotation.z=Math.PI/2;bolt.position.set(-.23,.12,-.03)
    this.environment.add(rod,resin,bolt); this.scene.add(this.environment)
    this.fallbackRobot.group.position.set(.36,.08,.18); this.fallbackRobot.group.scale.setScalar(.72); this.scene.add(this.fallbackRobot.group)
    this.graspIndicator.rotation.y=Math.PI/2;this.graspIndicator.visible=false;this.environment.add(this.graspIndicator)
    const demoGeometry=new THREE.BufferGeometry().setFromPoints(this.pickPlaceCurve.getPoints(56)),demoMaterial=new THREE.LineDashedMaterial({color:0x37a7ff,dashSize:.035,gapSize:.018,transparent:true,opacity:.78})
    this.demoPathLine=new THREE.Line(demoGeometry,demoMaterial);this.demoPathLine.computeLineDistances();this.pathGroup.add(this.demoPathLine)
    this.previewMarker.visible=false; this.pathGroup.add(this.previewMarker); this.scene.add(this.pathGroup)
    const axes=new THREE.AxesHelper(.1);axes.position.set(.48,.2,-.25);this.environment.add(axes)
  }

  private loadUr12e() {
    this.onRobotModelState?.('loading')
    const loader=new URDFLoader()
    loader.packages={ur_description:'/ur_description'}
    loader.load('/ur_description/urdf/ur12e.urdf',robot=>{
      robot.rotation.x=-Math.PI/2
      robot.position.set(.36,.08,.18)
      robot.scale.setScalar(.58)
      robot.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=true}})
      this.scene.remove(this.fallbackRobot.group)
      this.urRobot=robot
      this.scene.add(robot)
      if(this.latestTelemetry)this.updateRobot(this.latestTelemetry)
      this.onRobotModelState?.('ready')
    },undefined,()=>this.onRobotModelState?.('error'))
  }

  private replaceLine(current: THREE.Line | undefined, points: MiningPoint[], dashed: boolean, color: number) {
    if (current) { this.pathGroup.remove(current); current.geometry.dispose(); (current.material as THREE.Material).dispose() }
    if (points.length < 2) return undefined
    const curve = new THREE.CatmullRomCurve3(points.map(rosToThree)), geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(56))
    const material = dashed ? new THREE.LineDashedMaterial({color,dashSize:.035,gapSize:.018,transparent:true,opacity:.85}) : new THREE.LineBasicMaterial({color,transparent:true,opacity:.95})
    const line = new THREE.Line(geometry,material); if (dashed) line.computeLineDistances(); this.pathGroup.add(line); return line
  }

  private setPickPlaceState(state: PickPlaceState) {
    if(this.previewState===state)return
    this.previewState=state;this.onPickPlaceState?.(state)
  }

  private samplePreviewPose(progress:number) {
    const nextIndex=Math.max(1,pickPlacePoses.findIndex(frame=>frame.time>=progress))
    const previous=pickPlacePoses[nextIndex-1],next=pickPlacePoses[nextIndex]??pickPlacePoses.at(-1)!
    const span=Math.max(.001,next.time-previous.time),local=THREE.MathUtils.smoothstep((progress-previous.time)/span,0,1)
    return previous.joints.map((value,index)=>THREE.MathUtils.lerp(value,next.joints[index],local))
  }

  private applyPreviewPose(joints:number[]) {
    urJointNames.forEach((name,index)=>this.urRobot?.setJointValue(name,joints[index]))
    this.fallbackRobot.update(Object.fromEntries(joints.map((value,index)=>[`fr3_joint${index+1}`,value])),.035)
  }

  private updatePickPlace(time:number) {
    const progress=Math.min(1,(time-this.previewStartedAt)/7.2);this.applyPreviewPose(this.samplePreviewPose(progress))
    if(progress<.28){this.setPickPlaceState('approach');this.workpiece?.position.copy(sourcePosition);this.graspIndicator.visible=false}
    else if(progress<.42){
      this.setPickPlaceState('grasp');this.workpiece?.position.lerpVectors(sourcePosition,liftPosition,THREE.MathUtils.smoothstep((progress-.28)/.14,0,1));this.graspIndicator.visible=true
    } else if(progress<.78){
      this.setPickPlaceState('transfer');this.workpiece?.position.lerpVectors(liftPosition,transferPosition,THREE.MathUtils.smoothstep((progress-.42)/.36,0,1));this.graspIndicator.visible=true
    } else if(progress<.91){
      this.setPickPlaceState('place');this.workpiece?.position.lerpVectors(transferPosition,placePosition,THREE.MathUtils.smoothstep((progress-.78)/.13,0,1));this.graspIndicator.visible=true
    } else {this.workpiece?.position.copy(placePosition);this.graspIndicator.visible=false}
    if(this.workpiece){this.graspIndicator.position.copy(this.workpiece.position);this.workpiece.material.emissive.setHex(progress>=.28&&progress<.91?0x123b55:0x000000)}
    this.previewMarker.position.copy(this.pickPlaceCurve.getPoint(THREE.MathUtils.smoothstep(progress,0,1)))
    if(progress>=1){this.previewing=false;this.previewMarker.visible=false;this.setPickPlaceState('complete')}
  }

  private resize() { const width=this.host.clientWidth,height=this.host.clientHeight;if(!width||!height)return;this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.renderer.setSize(width,height,false) }
  private render = () => {
    this.frame=requestAnimationFrame(this.render);this.controls.update();const t=this.clock.getElapsedTime()
    if(this.previewing)this.updatePickPlace(t)
    if(this.plannedLine)(this.plannedLine.material as THREE.LineDashedMaterial).opacity=.68+Math.sin(t*3)*.16
    if(this.demoPathLine)(this.demoPathLine.material as THREE.LineDashedMaterial).opacity=.56+Math.sin(t*3)*.14
    this.renderer.render(this.scene,this.camera)
  }
}
