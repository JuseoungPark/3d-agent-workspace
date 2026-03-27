import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { AgentState, getRoleConfig } from '../types'
import { LegoCharacter } from './LegoCharacter'

interface AgentBlockProps {
  agent: AgentState
}

export function AgentBlock({ agent }: AgentBlockProps) {
  const groupRef = useRef<THREE.Group>(null)
  const posRef = useRef({ x: agent.pos.x, z: agent.pos.z })
  const targetRef = useRef({ x: agent.target.x, z: agent.target.z })
  const scaleRef = useRef(agent.status === 'spawning' ? 0 : 1)
  const { color } = getRoleConfig(agent.type)

  // Sync target when agent.target changes
  useEffect(() => {
    targetRef.current = { x: agent.target.x, z: agent.target.z }
  }, [agent.target.x, agent.target.z])

  // Spawn scale-in
  useEffect(() => {
    if (agent.status === 'spawning') {
      scaleRef.current = 0
    }
  }, [agent.status])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const dt = Math.min(delta, 0.05)

    // Lerp toward target
    const dx = targetRef.current.x - posRef.current.x
    const dz = targetRef.current.z - posRef.current.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    if (dist > 0.04) {
      const speed = 2.2 * dt
      const step = Math.min(dist, speed)
      posRef.current.x += (dx / dist) * step
      posRef.current.z += (dz / dist) * step
      groupRef.current.rotation.y = Math.atan2(dx, dz)
    }

    groupRef.current.position.x = posRef.current.x
    groupRef.current.position.z = posRef.current.z

    // Spawn scale-in
    if (scaleRef.current < 1) {
      scaleRef.current = Math.min(1, scaleRef.current + dt * 2.5)
      groupRef.current.scale.setScalar(scaleRef.current)
    }
  })

  const walking = (() => {
    const dx = agent.target.x - agent.pos.x
    const dz = agent.target.z - agent.pos.z
    return Math.sqrt(dx * dx + dz * dz) > 0.06
  })()

  return (
    <group ref={groupRef} position={[agent.pos.x, 0, agent.pos.z]}>
      <LegoCharacter
        color={color}
        walking={walking}
        hairStyle="SHORT"
        hairColor="#1a1a1a"
      />
    </group>
  )
}
