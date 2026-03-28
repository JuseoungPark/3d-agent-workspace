import React, { useRef, useEffect, useMemo, useState } from 'react'
import { useFrame, ThreeEvent, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { AgentState, getRoleConfig } from '../types'
import { useWorkspaceStore } from '../store/workspace'
import { LegoCharacter } from './LegoCharacter'
import { SpeechBubble } from './SpeechBubble'
import { playHit, playHeld, playDrop } from '../utils/sounds'
import { playTTS } from '../utils/tts'
import { posRegistry } from './posRegistry'

const QUIRKY = ['...응?', '뭐야.', '찹츄?', '왜 불러요', '바빠요', '니옹스?', '...', '으잉?', '야!', '헉', '살살 좀']
const DROP_LINES = ["D'oh.", '아이고', '살았다!', '으악', '괜찮아요']
const BUMP_LINES = ['어이쿠!', '아야!', '이런!', '헉!', '앗!']
const SORRY_LINES = ['미안해요...', '죄송합니다', '아이고 미안', '괜찮아요?']

const MOVEMENT_THRESHOLD = 0.06
const ZONE_HALF = 3.0  // wander radius within zone

// Patrol points per zone center
function randomPatrolPoint(cx: number, cz: number) {
  return {
    x: cx + (Math.random() - 0.5) * ZONE_HALF * 2,
    z: cz + (Math.random() - 0.5) * ZONE_HALF * 2,
  }
}

const ROLE_ZONES: Record<string, { cx: number; cz: number }> = {
  analyst: { cx: -3, cz: -3 }, writer: { cx: 0, cz: -3 },
  executor: { cx: 3, cz: -3 }, debugger: { cx: -3, cz: 0 },
  reviewer: { cx: 3, cz: 0 }, planner: { cx: -3, cz: 3 },
  architect: { cx: 0, cz: 3 }, default: { cx: 0, cz: 0 },
}

interface AgentBlockProps {
  agent: AgentState
}

export function AgentBlock({ agent }: AgentBlockProps) {
  const groupRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const { camera } = useThree()

  const posRef = useRef({ x: agent.pos.x, z: agent.pos.z })
  const targetRef = useRef({ x: agent.target.x, z: agent.target.z })
  const scaleRef = useRef(agent.status === 'spawning' ? 0 : 1)
  const liftYRef = useRef(0)       // current lift height above ground
  const dropVelRef = useRef(0)     // velocity when falling
  const isHeldRef = useRef(false)
  const canLiftRef = useRef(false) // only true after 150ms hold
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const patrolTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const arrivedRef = useRef(false)

  const hitTimerRef = useRef(0)
  const collisionCooldownRef = useRef(0)
  const [isBowing, setIsBowing] = useState(false)

  const { color, face: defaultFace } = getRoleConfig(agent.type)
  const selectedAgentId = useWorkspaceStore(s => s.selectedAgentId)
  const cameraMode = useWorkspaceStore(s => s.cameraMode)
  const selectAgent = useWorkspaceStore(s => s.selectAgent)
  const setAgentTarget = useWorkspaceStore(s => s.setAgentTarget)
  const setAgentChatMessage = useWorkspaceStore(s => s.setAgentChatMessage)
  const setAgentPos = useWorkspaceStore(s => s.setAgentPos)
  const avatarOverride = useWorkspaceStore(s => s.avatarOverrides[agent.id])
  const isSelected = selectedAgentId === agent.id

  const face = avatarOverride?.face ?? defaultFace
  const hairStyle = avatarOverride?.hairStyle ?? 'SHORT'
  const hairColor = avatarOverride?.hairColor ?? '#1a1a1a'

  // Sync target from store
  useEffect(() => {
    targetRef.current = { x: agent.target.x, z: agent.target.z }
    arrivedRef.current = false
  }, [agent.target.x, agent.target.z])

  // Spawn scale-in reset
  useEffect(() => {
    if (agent.status === 'spawning') scaleRef.current = 0
  }, [agent.status])

  // External hit trigger (from keyboard spacebar punch)
  useEffect(() => {
    if (!agent.hitAt) return
    playHit()
    hitTimerRef.current = 0.55
  }, [agent.hitAt])

  // TTS on celebrate if voice enabled
  useEffect(() => {
    if (agent.status !== 'celebrating') return
    if (avatarOverride?.voiceEnabled === false) return
    if (!agent.voiceId) return
    playTTS('', agent.voiceId)
  }, [agent.status])

  // Cleanup posRegistry on unmount
  useEffect(() => {
    return () => { posRegistry.delete(agent.id) }
  }, [agent.id])

  // Idle patrol: when idle and arrived, schedule next wander
  const statusRef = useRef(agent.status)
  statusRef.current = agent.status
  const isSelectedRef = useRef(isSelected)
  isSelectedRef.current = isSelected

  const schedulePatrol = () => {
    if (patrolTimerRef.current) clearTimeout(patrolTimerRef.current)
    patrolTimerRef.current = setTimeout(() => {
      if (statusRef.current !== 'idle' || isSelectedRef.current) return
      const zone = ROLE_ZONES[agent.type] ?? ROLE_ZONES.default
      const pt = randomPatrolPoint(zone.cx, zone.cz)
      setAgentTarget(agent.id, pt.x, pt.z)
    }, 900 + Math.random() * 1400)
  }

  // Start patrol on mount if idle
  useEffect(() => {
    if (agent.status === 'idle') schedulePatrol()
    return () => { if (patrolTimerRef.current) clearTimeout(patrolTimerRef.current) }
  }, [])

  // Reschedule patrol when status becomes idle
  useEffect(() => {
    if (agent.status === 'idle') schedulePatrol()
    else if (patrolTimerRef.current) clearTimeout(patrolTimerRef.current)
  }, [agent.status])

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return
    const dt = Math.min(delta, 0.05)
    const t = clock.getElapsedTime()

    // Spawn scale-in
    if (scaleRef.current < 1) {
      scaleRef.current = Math.min(1, scaleRef.current + dt * 2.5)
      groupRef.current.scale.setScalar(scaleRef.current)
    }

    // Lift/drop physics
    if (isHeldRef.current && canLiftRef.current) {
      liftYRef.current = THREE.MathUtils.lerp(liftYRef.current, 3.0, dt * 6)
      dropVelRef.current = 0
    } else if (liftYRef.current > 0.01) {
      dropVelRef.current += 18 * dt  // gravity
      liftYRef.current = Math.max(0, liftYRef.current - dropVelRef.current * dt)
      if (liftYRef.current <= 0) {
        // bounce
        dropVelRef.current = -dropVelRef.current * 0.35
        if (Math.abs(dropVelRef.current) < 0.5) dropVelRef.current = 0
      }
    }

    // XZ movement — only freeze while held (drag mode)
    if (!isHeldRef.current) {
      const dx = targetRef.current.x - posRef.current.x
      const dz = targetRef.current.z - posRef.current.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist > MOVEMENT_THRESHOLD) {
        const step = Math.min(dist, 2.2 * dt)
        posRef.current.x += (dx / dist) * step
        posRef.current.z += (dz / dist) * step
        groupRef.current.rotation.y = Math.atan2(dx, dz)
        arrivedRef.current = false
      } else if (!arrivedRef.current && statusRef.current === 'idle') {
        arrivedRef.current = true
        setAgentPos(agent.id, posRef.current.x, posRef.current.z)
        schedulePatrol()
      }
    }

    // Face camera when selected in face mode (not compact)
    if (isSelectedRef.current && cameraMode === 'face' && !isHeldRef.current && window.innerWidth >= 600) {
      const dx = camera.position.x - posRef.current.x
      const dz = camera.position.z - posRef.current.z
      const targetAngle = Math.atan2(dx, dz)
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetAngle, dt * 5)
    }

    groupRef.current.position.x = posRef.current.x
    groupRef.current.position.z = posRef.current.z
    groupRef.current.position.y = liftYRef.current

    // Update live position registry
    posRegistry.set(agent.id, { x: posRef.current.x, z: posRef.current.z })

    // Collision detection (with cooldown)
    if (collisionCooldownRef.current > 0) {
      collisionCooldownRef.current -= dt
    } else if (!isHeldRef.current && liftYRef.current < 0.5) {
      for (const [otherId, otherPos] of posRegistry) {
        if (otherId === agent.id) continue
        const cdx = otherPos.x - posRef.current.x
        const cdz = otherPos.z - posRef.current.z
        const cdist = Math.sqrt(cdx * cdx + cdz * cdz)
        if (cdist < 0.82) {
          collisionCooldownRef.current = 3.5
          playHit()
          hitTimerRef.current = 0.4
          // Show bump + sorry messages
          const bump = BUMP_LINES[Math.floor(Math.random() * BUMP_LINES.length)]
          const sorry = SORRY_LINES[Math.floor(Math.random() * SORRY_LINES.length)]
          setAgentChatMessage(agent.id, bump)
          setTimeout(() => setAgentChatMessage(agent.id, sorry), 900)
          setTimeout(() => setAgentChatMessage(agent.id, null), 2000)
          // Bow
          setIsBowing(true)
          setTimeout(() => setIsBowing(false), 2200)
          // Bounce away from the other agent
          const pushLen = cdist > 0.01 ? cdist : 0.01
          const bounceX = posRef.current.x - (cdx / pushLen) * 1.6
          const bounceZ = posRef.current.z - (cdz / pushLen) * 1.6
          setAgentTarget(agent.id, bounceX, bounceZ)
          break
        }
      }
    }

    // Hit shake animation
    if (hitTimerRef.current > 0) {
      hitTimerRef.current -= dt
      groupRef.current.rotation.z = Math.sin(hitTimerRef.current * 22) * 0.35 * Math.max(0, hitTimerRef.current / 0.55)
      if (hitTimerRef.current <= 0) groupRef.current.rotation.z = 0
    }

    // Ring pulse
    if (ringRef.current && ringMatRef.current && isSelected) {
      const pulse = 0.92 + Math.sin(t * 4) * 0.08
      ringRef.current.scale.set(pulse, 1, pulse)
      ringMatRef.current.opacity = 0.6 + Math.sin(t * 4) * 0.25
    }
  })

  const walking = useMemo(() => {
    const dx = agent.target.x - agent.pos.x
    const dz = agent.target.z - agent.pos.z
    return Math.sqrt(dx * dx + dz * dz) > MOVEMENT_THRESHOLD
  }, [agent.target.x, agent.target.z, agent.pos.x, agent.pos.z])

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    isHeldRef.current = true
    canLiftRef.current = false
    holdTimerRef.current = setTimeout(() => {
      if (isHeldRef.current) {
        canLiftRef.current = true
        playHeld()
      }
    }, 150)
  }

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isHeldRef.current) return
    e.stopPropagation()
    const point = e.point
    targetRef.current = { x: point.x, z: point.z }
    posRef.current = { x: point.x, z: point.z }
    setAgentTarget(agent.id, point.x, point.z)
  }

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    ;(e.target as Element).releasePointerCapture(e.pointerId)
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null }
    if (liftYRef.current > 1.0) {
      // Dropped from height — play sound + drop line
      playDrop()
      const line = DROP_LINES[Math.floor(Math.random() * DROP_LINES.length)]
      setAgentChatMessage(agent.id, line)
      setTimeout(() => setAgentChatMessage(agent.id, null), 1800)
    }
    isHeldRef.current = false
    canLiftRef.current = false
    dropVelRef.current = 0
  }

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (!canLiftRef.current) {
      // Hit reaction + quirky text
      playHit()
      hitTimerRef.current = 0.55
      const quirk = QUIRKY[Math.floor(Math.random() * QUIRKY.length)]
      setAgentChatMessage(agent.id, quirk)
      setTimeout(() => setAgentChatMessage(agent.id, null), 1400)
      selectAgent(isSelected ? null : agent.id)
    }
  }

  return (
    <group ref={groupRef} position={[agent.pos.x, 0, agent.pos.z]}>
      {/* Hitbox: click + drag */}
      <mesh
        position={[0, 1.0, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
      >
        <cylinderGeometry args={[0.6, 0.6, 2.0, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Selection ring (torus, pulsing) */}
      {isSelected && (
        <mesh ref={ringRef} position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.52, 0.045, 8, 32]} />
          <meshBasicMaterial ref={ringMatRef} color={color} transparent opacity={0.85} />
        </mesh>
      )}

      <LegoCharacter
        color={color}
        face={face}
        walking={walking}
        celebrating={agent.status === 'celebrating'}
        bowing={isBowing}
        hairStyle={hairStyle}
        hairColor={hairColor}
      />

      {/* Name tag */}
      <Html position={[0, -0.15, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(2,6,23,0.85)',
          color: color,
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 11,
          fontFamily: 'monospace',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          border: `1px solid ${color}44`,
          backdropFilter: 'blur(4px)',
        }}>
          {agent.type}
        </div>
      </Html>

      {(agent.currentTool || agent.lastMessage) && (
        <SpeechBubble
          text={agent.currentTool ? `${agent.currentTool}...` : agent.lastMessage === '__typing__' ? '' : agent.lastMessage ?? ''}
          isTyping={agent.lastMessage === '__typing__'}
          type={agent.status === 'meeting' ? 'meeting' : 'solo'}
        />
      )}
    </group>
  )
}
