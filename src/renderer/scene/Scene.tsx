import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
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

export function Scene() {
  const agents = useWorkspaceStore(s => s.agents)

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [10, 13, 10], fov: 40 }}
        gl={{ antialias: true }}
        style={{ background: '#020617' }}
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
