import React, { Suspense, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useWorkspaceStore } from '../store/workspace'
import { AgentBlock } from './AgentBlock'

function Floor() {
  const tiles = []
  for (let x = -7; x <= 7; x++) {
    for (let z = -7; z <= 7; z++) {
      tiles.push(
        <mesh key={`${x}-${z}`} position={[x, -0.05, z]} receiveShadow>
          <boxGeometry args={[0.97, 0.1, 0.97]} />
          <meshLambertMaterial color={(x + z) % 2 === 0 ? 0x0b1728 : 0x0d1e35} />
        </mesh>
      )
    }
  }
  return <>{tiles}</>
}

const DEFAULT_CAM_POS = new THREE.Vector3(10, 13, 10)
const DEFAULT_CAM_TARGET = new THREE.Vector3(0, 0, 0)

function CameraFollow() {
  const { camera, controls } = useThree()
  const agents = useWorkspaceStore(s => s.agents)
  const selectedAgentId = useWorkspaceStore(s => s.selectedAgentId)
  const cameraMode = useWorkspaceStore(s => s.cameraMode)
  useFrame((_, delta) => {
    const ctrl = controls as any
    if (!ctrl) return
    const selected = selectedAgentId ? agents[selectedAgentId] : null
    const isCompact = window.innerWidth < 600

    if (selected && cameraMode === 'face' && !isCompact) {
      const destPos = new THREE.Vector3(selected.pos.x + 1.8, 2.8, selected.pos.z + 1.8)
      const destTarget = new THREE.Vector3(selected.pos.x, 1.5, selected.pos.z)
      camera.position.lerp(destPos, delta * 3.5)
      ctrl.target.lerp(destTarget, delta * 3.5)
    } else if (selected) {
      const destPos = new THREE.Vector3(selected.pos.x + 5, 8, selected.pos.z + 5)
      const destTarget = new THREE.Vector3(selected.pos.x, 0, selected.pos.z)
      camera.position.lerp(destPos, delta * 2.5)
      ctrl.target.lerp(destTarget, delta * 2.5)
    } else {
      camera.position.lerp(DEFAULT_CAM_POS, delta * 2.0)
      ctrl.target.lerp(DEFAULT_CAM_TARGET, delta * 2.0)
    }
    ctrl.update()
  })
  return null
}

export function Scene() {
  const agents = useWorkspaceStore(s => s.agents)
  const selectedAgentId = useWorkspaceStore(s => s.selectedAgentId)
  const selectAgent = useWorkspaceStore(s => s.selectAgent)
  const bgOpacity = useWorkspaceStore(s => s.bgOpacity)
  const bg = `rgba(2,6,23,${bgOpacity})`

  return (
    <div style={{ flex: 1, position: 'relative', minHeight: 0, background: bg }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        shadows
        camera={{ position: [10, 13, 10], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => gl.setClearAlpha(0)}
        onPointerMissed={() => selectAgent(null)}
      >
        <fog attach="fog" args={['#020617', 30, 80]} />
        <ambientLight intensity={2.5} color={0x1a2a4a} />
        <directionalLight
          position={[8, 18, 8]}
          intensity={3.5}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.1}
          shadow-camera-far={60}
          shadow-camera-left={-16}
          shadow-camera-right={16}
          shadow-camera-top={16}
          shadow-camera-bottom={-16}
          shadow-bias={-0.001}
        />
        <directionalLight position={[-4, 5, -6]} intensity={1.0} color={0x3355bb} />

        <OrbitControls
          makeDefault
          maxPolarAngle={Math.PI / 2.2}
          minDistance={4}
          maxDistance={40}
        />
        <CameraFollow />

        <Suspense fallback={null}>
          <Floor />
          {Object.values(agents ?? {}).map(agent => (
            <AgentBlock key={agent.id} agent={agent} />
          ))}
        </Suspense>
      </Canvas>
    </div>
  )
}
