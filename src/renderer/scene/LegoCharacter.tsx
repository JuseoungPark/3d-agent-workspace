import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HairPiece, HairStyle } from './HairPiece'

interface LegoCharacterProps {
  color: string                  // torso + arms color (role color)
  hairStyle?: HairStyle
  hairColor?: string
  walking?: boolean
  scale?: number
}

function makeFaceTexture(emoji = '😐'): THREE.CanvasTexture {
  const W = 256, H = 256
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = '#ffd700'
  ctx.fillRect(0, 0, W, H)
  // Draw eyes
  ctx.fillStyle = '#1a1a2e'
  ;[[75, 100], [181, 100]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.ellipse(x, y, 22, 26, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(x - 7, y - 7, 8, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#1a1a2e'
  })
  // Smile
  ctx.beginPath()
  ctx.arc(128, 155, 38, 0.15, Math.PI - 0.15)
  ctx.strokeStyle = '#3a2200'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke()
  return new THREE.CanvasTexture(cv)
}

export function LegoCharacter({
  color,
  hairStyle = 'SHORT',
  hairColor = '#1a1a1a',
  walking = false,
  scale = 1,
}: LegoCharacterProps) {
  const groupRef = useRef<THREE.Group>(null)
  const armLRef = useRef<THREE.Group>(null)
  const armRRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Group>(null)
  const phaseRef = useRef(Math.random() * Math.PI * 2)

  const skinMat = useMemo(() => new THREE.MeshLambertMaterial({ color: 0xffd700 }), [])
  const roleMat = useMemo(() => new THREE.MeshLambertMaterial({ color }), [color])
  const darkMat = useMemo(() => new THREE.MeshLambertMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0), 0.25) }), [color])
  const legMat  = useMemo(() => new THREE.MeshLambertMaterial({ color: 0x1a1a2e }), [])
  const faceTex = useMemo(() => makeFaceTexture(), [])
  const faceMat = useMemo(() => new THREE.MeshLambertMaterial({ map: faceTex, side: THREE.DoubleSide }), [faceTex])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const ph = t * 8 + phaseRef.current
    if (walking) {
      if (armLRef.current) armLRef.current.rotation.x = -Math.sin(ph) * 0.42
      if (armRRef.current) armRRef.current.rotation.x =  Math.sin(ph) * 0.42
      if (groupRef.current) groupRef.current.position.y = Math.abs(Math.sin(ph * 0.5)) * 0.05
    } else {
      if (armLRef.current) armLRef.current.rotation.x *= 0.88
      if (armRRef.current) armRRef.current.rotation.x *= 0.88
      if (groupRef.current) groupRef.current.position.y = Math.sin(t * 1.8 + phaseRef.current) * 0.024
      if (headRef.current) headRef.current.rotation.y = Math.sin(t * 0.62 + phaseRef.current) * 0.12
    }
  })

  return (
    <group ref={groupRef} scale={scale}>
      {/* Legs */}
      <group position={[0, 0.38, 0]}>
        <mesh position={[0, 0.01, 0]}><boxGeometry args={[0.65, 0.1, 0.33]} /><primitive object={darkMat} attach="material" /></mesh>
        <mesh position={[0, -0.16, 0]}><boxGeometry args={[0.1, 0.28, 0.31]} /><meshLambertMaterial color={0x0d1020} /></mesh>
        {[-1, 1].map(s => (
          <group key={s}>
            <mesh position={[s * 0.19, -0.28, 0]} castShadow><boxGeometry args={[0.265, 0.46, 0.31]} /><primitive object={legMat} attach="material" /></mesh>
            <mesh position={[s * 0.19, -0.52, 0.045]} castShadow><boxGeometry args={[0.265, 0.115, 0.38]} /><meshLambertMaterial color={0x0f0f1e} /></mesh>
          </group>
        ))}
      </group>

      {/* Torso */}
      <group position={[0, 0.92, 0]}>
        <mesh castShadow><boxGeometry args={[0.65, 0.52, 0.32]} /><primitive object={roleMat} attach="material" /></mesh>
        <mesh position={[0, 0.295, 0]}><boxGeometry args={[0.72, 0.07, 0.35]} /><primitive object={darkMat} attach="material" /></mesh>
        <mesh position={[0, 0.31, 0]}><cylinderGeometry args={[0.115, 0.115, 0.1, 16]} /><meshLambertMaterial color={new THREE.Color(color).lerp(new THREE.Color(0xffd700), 0.5).getHex()} /></mesh>
        {[-0.165, 0.165].map((x, i) => (
          <mesh key={i} position={[x, 0.345, 0]}><cylinderGeometry args={[0.078, 0.078, 0.065, 12]} /><primitive object={roleMat} attach="material" /></mesh>
        ))}
        <mesh position={[0, -0.325, 0]}><boxGeometry args={[0.63, 0.13, 0.33]} /><primitive object={darkMat} attach="material" /></mesh>
        {[-1, 1].map(s => (
          <group key={s}>
            <mesh position={[s * 0.38, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.1, 0.1, 0.14, 16]} /><primitive object={darkMat} attach="material" /></mesh>
          </group>
        ))}
      </group>

      {/* Arms */}
      {[-1, 1].map((s, i) => (
        <group key={i} ref={i === 0 ? armLRef : armRRef} position={[s * 0.425, 1.04, 0]}>
          <mesh><sphereGeometry args={[0.098, 10, 8]} /><primitive object={roleMat} attach="material" /></mesh>
          <mesh position={[0, -0.17, 0]}><cylinderGeometry args={[0.095, 0.085, 0.3, 14]} /><primitive object={roleMat} attach="material" /></mesh>
          <mesh position={[0, -0.38, 0]}><cylinderGeometry args={[0.08, 0.07, 0.2, 12]} /><primitive object={roleMat} attach="material" /></mesh>
          <mesh position={[0, -0.46, 0]}><cylinderGeometry args={[0.055, 0.06, 0.06, 10]} /><primitive object={skinMat} attach="material" /></mesh>
          {/* C-shaped hand */}
          <mesh position={[0, -0.51, 0]} rotation={[Math.PI / 2, Math.PI * 0.08, 0]}>
            <torusGeometry args={[0.078, 0.034, 10, 18, Math.PI * 1.55]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* Head */}
      <group ref={headRef} position={[0, 1.52, 0]}>
        {/* Cylinder with face texture on front (+Z after PI rotation) */}
        <mesh rotation={[0, Math.PI, 0]}>
          <cylinderGeometry args={[0.24, 0.25, 0.46, 32, 1, true]} />
          <primitive object={faceMat} attach="material" />
        </mesh>
        {/* Caps */}
        <mesh position={[0, 0.23, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.24, 32]} /><primitive object={skinMat} attach="material" /></mesh>
        <mesh position={[0, -0.23, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.25, 32]} /><primitive object={skinMat} attach="material" /></mesh>
        {/* Dome */}
        <mesh position={[0, 0.2, 0]}><sphereGeometry args={[0.24, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.1]} /><primitive object={skinMat} attach="material" /></mesh>
        {/* Neck peg */}
        <mesh position={[0, -0.31, 0]}><cylinderGeometry args={[0.105, 0.105, 0.16, 16]} /><primitive object={skinMat} attach="material" /></mesh>
        {/* Stud */}
        <mesh position={[0, 0.345, 0]}><cylinderGeometry args={[0.098, 0.098, 0.09, 16]} /><primitive object={skinMat} attach="material" /></mesh>
      </group>

      {/* Hair */}
      <group position={[0, 1.755, 0]}>
        <HairPiece style={hairStyle} color={hairColor} />
      </group>
    </group>
  )
}
