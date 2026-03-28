import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { HairPiece, HairStyle } from './HairPiece'

interface LegoCharacterProps {
  color: string                  // torso + arms color (role color)
  face?: string                  // face emoji (e.g. '😐', '😤', '🥳')
  hairStyle?: HairStyle
  hairColor?: string
  walking?: boolean
  celebrating?: boolean
  bowing?: boolean
  scale?: number
}

function makeFaceTexture(face = '😐'): THREE.CanvasTexture {
  const W = 256, H = 256
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')!
  // Transparent background — face is a flat plane decal on front of RoundedBox head
  ctx.clearRect(0, 0, W, H)

  // Wider eye positions suited for flat (non-cylindrical) face display
  const EYE_POSITIONS: [number, number][] = [[80, 100], [176, 100]]
  const DARK = '#1a1a2e'
  const STROKE = '#3a2200'

  function drawEye(x: number, y: number, w = 15, h = 19, squint = false) {
    ctx.fillStyle = DARK
    ctx.beginPath()
    ctx.ellipse(x, y, w, squint ? h * 0.45 : h, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'white'
    ctx.beginPath(); ctx.arc(x - 5, y - 6, 5, 0, Math.PI * 2); ctx.fill()
  }

  function drawAngryBrows() {
    ctx.strokeStyle = STROKE; ctx.lineWidth = 9; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(48, 68); ctx.lineTo(103, 82); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(208, 68); ctx.lineTo(153, 82); ctx.stroke()
  }

  function drawRaisedBrows() {
    ctx.strokeStyle = STROKE; ctx.lineWidth = 8; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(48, 74); ctx.quadraticCurveTo(80, 58, 112, 70); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(144, 70); ctx.quadraticCurveTo(176, 58, 208, 74); ctx.stroke()
  }

  switch (face) {
    case '🙂': {
      EYE_POSITIONS.forEach(([x, y]) => drawEye(x, y))
      ctx.beginPath(); ctx.arc(128, 175, 38, 0.2, Math.PI - 0.2)
      ctx.strokeStyle = STROKE; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke()
      break
    }
    case '😐': {
      EYE_POSITIONS.forEach(([x, y]) => drawEye(x, y))
      ctx.beginPath(); ctx.moveTo(88, 178); ctx.lineTo(168, 178)
      ctx.strokeStyle = STROKE; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke()
      break
    }
    case '🤔': {
      drawRaisedBrows()
      EYE_POSITIONS.forEach(([x, y]) => drawEye(x, y))
      ctx.beginPath(); ctx.moveTo(86, 178); ctx.quadraticCurveTo(128, 165, 170, 172)
      ctx.strokeStyle = STROKE; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke()
      ctx.fillStyle = STROKE; ctx.beginPath(); ctx.arc(128, 198, 8, 0, Math.PI * 2); ctx.fill()
      break
    }
    case '😤': {
      drawAngryBrows()
      EYE_POSITIONS.forEach(([x, y]) => drawEye(x, y, 17, 18))
      ctx.beginPath(); ctx.arc(128, 196, 36, Math.PI + 0.2, -0.2)
      ctx.strokeStyle = STROKE; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke()
      ctx.strokeStyle = '#cc4400'; ctx.lineWidth = 5
      ;[[52, 50], [204, 50]].forEach(([sx, sy]) => {
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 18); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(sx + 10, sy - 8); ctx.lineTo(sx + 10, sy - 24); ctx.stroke()
      })
      break
    }
    case '😡': {
      drawAngryBrows()
      EYE_POSITIONS.forEach(([x, y]) => drawEye(x, y, 15, 17))
      ctx.beginPath(); ctx.arc(128, 198, 38, Math.PI + 0.12, -0.12)
      ctx.strokeStyle = STROKE; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.stroke()
      break
    }
    case '😎': {
      EYE_POSITIONS.forEach(([x, y]) => drawEye(x, y, 17, 19))
      ctx.fillStyle = '#111'
      ;[EYE_POSITIONS[0], EYE_POSITIONS[1]].forEach(([x, y]) => {
        ctx.beginPath(); ctx.ellipse(x, y, 28, 20, 0, 0, Math.PI * 2); ctx.fill()
      })
      ;[EYE_POSITIONS[0], EYE_POSITIONS[1]].forEach(([x, y]) => {
        ctx.fillStyle = 'rgba(80,200,255,0.3)'
        ctx.beginPath(); ctx.ellipse(x, y, 23, 16, 0, 0, Math.PI * 2); ctx.fill()
      })
      ctx.strokeStyle = '#111'; ctx.lineWidth = 5
      ctx.beginPath(); ctx.moveTo(108, 100); ctx.lineTo(148, 100); ctx.stroke()
      ctx.beginPath(); ctx.arc(128, 175, 36, 0.2, Math.PI - 0.2)
      ctx.strokeStyle = STROKE; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke()
      break
    }
    case '🧐': {
      drawRaisedBrows()
      EYE_POSITIONS.forEach(([x, y]) => drawEye(x, y))
      ctx.strokeStyle = '#8B7355'; ctx.lineWidth = 5
      ctx.beginPath(); ctx.ellipse(176, 100, 32, 36, 0, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(208, 100); ctx.lineTo(224, 132); ctx.stroke()
      ctx.beginPath(); ctx.arc(128, 190, 28, Math.PI + 0.3, -0.3)
      ctx.strokeStyle = STROKE; ctx.lineWidth = 7; ctx.stroke()
      break
    }
    case '🥳': {
      EYE_POSITIONS.forEach(([x, y]) => drawEye(x, y, 20, 24))
      ctx.beginPath(); ctx.arc(128, 168, 42, 0.1, Math.PI - 0.1)
      ctx.strokeStyle = STROKE; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.stroke()
      ;[[52, 152], [204, 152]].forEach(([x, y]) => {
        ctx.fillStyle = 'rgba(255,100,100,0.35)'
        ctx.beginPath(); ctx.ellipse(x, y, 22, 13, 0, 0, Math.PI * 2); ctx.fill()
      })
      break
    }
    case '😈': {
      drawAngryBrows()
      EYE_POSITIONS.forEach(([x, y]) => drawEye(x, y, 17, 19))
      ctx.beginPath(); ctx.arc(128, 168, 38, 0.1, Math.PI - 0.1)
      ctx.strokeStyle = STROKE; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke()
      ctx.fillStyle = '#cc2255'
      ;[[66, 28], [190, 28]].forEach(([x, y]) => {
        ctx.beginPath(); ctx.moveTo(x - 11, y + 20); ctx.lineTo(x, y); ctx.lineTo(x + 11, y + 20); ctx.fill()
      })
      break
    }
    case '😴': {
      ctx.strokeStyle = DARK; ctx.lineWidth = 7; ctx.lineCap = 'round'
      EYE_POSITIONS.forEach(([x, y]) => {
        ctx.beginPath(); ctx.arc(x, y, 20, Math.PI + 0.2, -0.2); ctx.stroke()
      })
      ctx.beginPath(); ctx.moveTo(88, 180); ctx.quadraticCurveTo(128, 188, 168, 180)
      ctx.strokeStyle = STROKE; ctx.lineWidth = 7; ctx.stroke()
      ctx.fillStyle = STROKE; ctx.font = 'bold 28px monospace'
      ctx.fillText('z', 196, 76); ctx.font = 'bold 20px monospace'; ctx.fillText('z', 218, 56)
      break
    }
    default: {
      EYE_POSITIONS.forEach(([x, y]) => drawEye(x, y))
      ctx.beginPath(); ctx.arc(128, 175, 38, 0.2, Math.PI - 0.2)
      ctx.strokeStyle = STROKE; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke()
    }
  }

  return new THREE.CanvasTexture(cv)
}

export function LegoCharacter({
  color,
  face = '😐',
  hairStyle = 'BALD',
  hairColor = '#1a1a1a',
  walking = false,
  celebrating = false,
  bowing = false,
  scale = 1,
}: LegoCharacterProps) {
  const groupRef = useRef<THREE.Group>(null)
  const armLRef = useRef<THREE.Group>(null)
  const armRRef = useRef<THREE.Group>(null)
  const legLRef = useRef<THREE.Group>(null)
  const legRRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Group>(null)
  const phaseRef = useRef(Math.random() * Math.PI * 2)
  const celebratingRef = useRef(celebrating)
  const walkingRef = useRef(walking)
  const bowingRef = useRef(bowing)
  celebratingRef.current = celebrating
  walkingRef.current = walking
  bowingRef.current = bowing

  const skinMat = useMemo(() => new THREE.MeshLambertMaterial({ color: 0xffd700 }), [])
  const roleMat = useMemo(() => new THREE.MeshLambertMaterial({ color }), [color])
  const darkMat = useMemo(() => new THREE.MeshLambertMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0), 0.25) }), [color])
  const legMat  = useMemo(() => new THREE.MeshLambertMaterial({ color: 0x1a3a5c }), [])
  const faceTex = useMemo(() => makeFaceTexture(face), [face])
  const faceMat = useMemo(() => new THREE.MeshLambertMaterial({ map: faceTex, transparent: true, alphaTest: 0.01 }), [faceTex])
  // Trapezoid body: NARROWER at shoulders (top), WIDER at waist (bottom) — 11:15 ratio
  const bodyGeo = useMemo(() => {
    const topHW = 0.33, botHW = 0.45, h = 0.64, d = 0.27
    const shape = new THREE.Shape()
    shape.moveTo(-botHW, -h / 2)
    shape.lineTo(botHW, -h / 2)
    shape.lineTo(topHW, h / 2)
    shape.lineTo(-topHW, h / 2)
    shape.closePath()
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: d, bevelEnabled: true,
      bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2,
    })
    geo.translate(0, 0, -d / 2)
    return geo
  }, [])

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = clock.getElapsedTime()
    const ph = t * 8 + phaseRef.current

    if (bowingRef.current) {
      // Bow: head tilts forward, arms spread apologetically
      if (headRef.current) {
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0.55, dt * 5)
        headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, 0, dt * 4)
      }
      if (armLRef.current) {
        armLRef.current.rotation.x = THREE.MathUtils.lerp(armLRef.current.rotation.x, -0.28, dt * 4)
        armLRef.current.rotation.z = THREE.MathUtils.lerp(armLRef.current.rotation.z, 0.48, dt * 4)
      }
      if (armRRef.current) {
        armRRef.current.rotation.x = THREE.MathUtils.lerp(armRRef.current.rotation.x, -0.28, dt * 4)
        armRRef.current.rotation.z = THREE.MathUtils.lerp(armRRef.current.rotation.z, -0.48, dt * 4)
      }
      if (legLRef.current) legLRef.current.rotation.x *= 0.9
      if (legRRef.current) legRRef.current.rotation.x *= 0.9
      if (groupRef.current) groupRef.current.position.y = 0
    } else if (celebratingRef.current) {
      const wave = Math.sin(t * 12) * 0.35
      if (armLRef.current) {
        armLRef.current.rotation.x = -Math.PI * 0.75 + wave
        armLRef.current.rotation.z =  0.3
      }
      if (armRRef.current) {
        armRRef.current.rotation.x = -Math.PI * 0.75 - wave
        armRRef.current.rotation.z = -0.3
      }
      if (groupRef.current) groupRef.current.position.y = Math.abs(Math.sin(t * 6)) * 0.12
      if (headRef.current) {
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0, dt * 4)
        headRef.current.rotation.y = Math.sin(t * 4) * 0.25
      }
    } else if (walkingRef.current) {
      if (armLRef.current) { armLRef.current.rotation.x = -Math.sin(ph) * 0.42; armLRef.current.rotation.z = 0 }
      if (armRRef.current) { armRRef.current.rotation.x =  Math.sin(ph) * 0.42; armRRef.current.rotation.z = 0 }
      if (legLRef.current) legLRef.current.rotation.x =  Math.sin(ph) * 0.38
      if (legRRef.current) legRRef.current.rotation.x = -Math.sin(ph) * 0.38
      if (groupRef.current) groupRef.current.position.y = Math.abs(Math.sin(ph * 0.5)) * 0.05
      if (headRef.current) {
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0, dt * 4)
        headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, 0, dt * 4)
      }
    } else {
      if (armLRef.current) { armLRef.current.rotation.x *= 0.88; armLRef.current.rotation.z *= 0.88 }
      if (armRRef.current) { armRRef.current.rotation.x *= 0.88; armRRef.current.rotation.z *= 0.88 }
      if (legLRef.current) legLRef.current.rotation.x *= 0.85
      if (legRRef.current) legRRef.current.rotation.x *= 0.85
      if (groupRef.current) groupRef.current.position.y = Math.sin(t * 1.8 + phaseRef.current) * 0.024
      if (headRef.current) {
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0, dt * 3)
        headRef.current.rotation.y = Math.sin(t * 0.62 + phaseRef.current) * 0.12
      }
    }
  })

  // Derived from LEGO minifig blueprint (scaled to ~2 THREE units total height)
  // sf = 0.05 units/mm, figure ground = y=-0.20, stud top ≈ y=1.77
  return (
    <group ref={groupRef} scale={scale}>

      {/* ── LEGS (pivot at hip joint y=0.40) ── */}
      <group ref={legLRef} position={[-0.187, 0.40, 0]}>
        <mesh position={[0, -0.19, 0]} castShadow>
          <boxGeometry args={[0.34, 0.38, 0.27]} />
          <primitive object={legMat} attach="material" />
        </mesh>
        {/* Shoe — sticks forward per blueprint */}
        <mesh position={[0, -0.49, 0.055]} castShadow>
          <boxGeometry args={[0.34, 0.22, 0.40]} />
          <meshLambertMaterial color={0x0f0f1e} />
        </mesh>
      </group>

      <group ref={legRRef} position={[0.187, 0.40, 0]}>
        <mesh position={[0, -0.19, 0]} castShadow>
          <boxGeometry args={[0.34, 0.38, 0.27]} />
          <primitive object={legMat} attach="material" />
        </mesh>
        <mesh position={[0, -0.49, 0.055]} castShadow>
          <boxGeometry args={[0.34, 0.22, 0.40]} />
          <meshLambertMaterial color={0x0f0f1e} />
        </mesh>
      </group>

      {/* ── HIP / PELVIS ── */}
      <group position={[0, 0.47, 0]}>
        <mesh>
          <boxGeometry args={[0.73, 0.14, 0.27]} />
          <primitive object={darkMat} attach="material" />
        </mesh>
        {/* Leg divider */}
        <mesh position={[0, -0.055, 0]}>
          <boxGeometry args={[0.055, 0.09, 0.27]} />
          <meshLambertMaterial color={0x0d1020} />
        </mesh>
      </group>

      {/* ── TORSO — trapezoid prism: narrow shoulders, wide waist ── */}
      <group position={[0, 0.86, 0]}>
        <mesh castShadow geometry={bodyGeo}>
          <primitive object={roleMat} attach="material" />
        </mesh>
        {/* Waist panel — flush on top of hip connector */}
        <mesh position={[0, -0.29, 0]}>
          <boxGeometry args={[0.84, 0.07, 0.30]} />
          <primitive object={darkMat} attach="material" />
        </mesh>
        {/* Hip bottom connector */}
        <mesh position={[0, -0.375, 0]}>
          <boxGeometry args={[0.82, 0.10, 0.28]} />
          <primitive object={darkMat} attach="material" />
        </mesh>
      </group>

      {/* ── NECK — short visible connector (ratio ~1.21 to head-peg 1.86) ── */}
      <mesh position={[0, 1.32, 0]}>
        <cylinderGeometry args={[0.118, 0.118, 0.065, 16]} />
        <primitive object={skinMat} attach="material" />
      </mesh>

      {/* ── ARMS (blueprint: R1.96 shoulder ball) ── */}
      {[-1, 1].map((s, i) => (
        <group key={i} ref={i === 0 ? armLRef : armRRef} position={[s * 0.455, 1.03, 0]}>
          <mesh><sphereGeometry args={[0.098, 10, 8]} /><primitive object={roleMat} attach="material" /></mesh>
          <mesh position={[0, -0.17, 0]}><cylinderGeometry args={[0.095, 0.085, 0.30, 14]} /><primitive object={roleMat} attach="material" /></mesh>
          <mesh position={[0, -0.38, 0]}><cylinderGeometry args={[0.08, 0.07, 0.20, 12]} /><primitive object={roleMat} attach="material" /></mesh>
          <mesh position={[0, -0.46, 0]}><cylinderGeometry args={[0.055, 0.06, 0.06, 10]} /><primitive object={skinMat} attach="material" /></mesh>
          {/* C-shaped hand — faces forward, opening at bottom */}
          <mesh position={[0, -0.52, 0]} rotation={[0, 0, -1.05]}>
            <torusGeometry args={[0.100, 0.046, 12, 22, Math.PI * 1.65]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* ── HEAD (blueprint: 10.12mm wide × 8.5mm tall, R0.75 corners) ── */}
      <group ref={headRef} position={[0, 1.47, 0]}>
        {/* Rounded-rectangle head body — more aggressively rounded corners */}
        <RoundedBox args={[0.506, 0.425, 0.46]} radius={0.090} smoothness={6}>
          <primitive object={skinMat} attach="material" />
        </RoundedBox>
        {/* Face decal — flat plane on front face, transparent overlay */}
        <mesh position={[0, -0.005, 0.232]}>
          <planeGeometry args={[0.44, 0.40]} />
          <primitive object={faceMat} attach="material" />
        </mesh>
        {/* Neck peg */}
        <mesh position={[0, -0.30, 0]}>
          <cylinderGeometry args={[0.105, 0.105, 0.16, 16]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
        {/* Stud (blueprint: ø4.8mm × 1.86mm) */}
        <mesh position={[0, 0.255, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.093, 16]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
      </group>

      {/* ── HAIR ── */}
      <group position={[0, 1.720, 0]}>
        <HairPiece style={hairStyle} color={hairColor} />
      </group>

    </group>
  )
}
