import React, { useMemo } from 'react'
import * as THREE from 'three'

export type HairStyle = 'SHORT' | 'LONG' | 'SPIKY' | 'BUN' | 'CURLY' | 'HELMET' | 'PONYTAIL' | 'BALD'

interface HairPieceProps {
  style: HairStyle
  color: string
}

export function HairPiece({ style, color }: HairPieceProps) {
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ color }), [color])
  const dark = useMemo(() => new THREE.MeshLambertMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0), 0.2) }), [color])
  const holeMat = useMemo(() => new THREE.MeshLambertMaterial({ color: 0x0a0a12 }), [])

  // Clip base: sits over the head stud
  const ClipBase = () => (
    <group>
      <mesh position={[0, 0.024, 0]}>
        <cylinderGeometry args={[0.268, 0.268, 0.048, 24]} />
        <primitive object={mat} attach="material" />
      </mesh>
      <mesh position={[0, 0.026, 0]}>
        <cylinderGeometry args={[0.098, 0.098, 0.052, 16]} />
        <primitive object={holeMat} attach="material" />
      </mesh>
    </group>
  )

  if (style === 'BALD') return null

  return (
    <group>
      <ClipBase />
      {style === 'SHORT' && (
        <>
          <mesh position={[0, 0.079, 0]}><cylinderGeometry args={[0.262, 0.262, 0.11, 24]} /><primitive object={mat} attach="material" /></mesh>
          {[-1, 1].map(s => (
            <mesh key={s} position={[s * 0.262, -0.055, 0]}><boxGeometry args={[0.09, 0.2, 0.28]} /><primitive object={dark} attach="material" /></mesh>
          ))}
        </>
      )}
      {style === 'LONG' && (
        <>
          <mesh position={[0, 0.069, 0]}><cylinderGeometry args={[0.265, 0.265, 0.09, 24]} /><primitive object={mat} attach="material" /></mesh>
          {[-1, 1].map(s => (
            <mesh key={s} position={[s * 0.268, -0.21, 0]}><boxGeometry args={[0.088, 0.54, 0.27]} /><primitive object={mat} attach="material" /></mesh>
          ))}
          <mesh position={[0, -0.18, -0.218]}><boxGeometry args={[0.52, 0.46, 0.078]} /><primitive object={mat} attach="material" /></mesh>
        </>
      )}
      {style === 'SPIKY' && (
        <>
          <mesh position={[0, 0.059, 0]}><cylinderGeometry args={[0.265, 0.265, 0.07, 24]} /><primitive object={mat} attach="material" /></mesh>
          {[[-0.14, 0.36, 0.02], [0, 0.42, 0.01], [0.14, 0.36, 0.02], [-0.07, 0.32, -0.09], [0.07, 0.32, -0.09]].map(([x, h, z], i) => (
            <mesh key={i} position={[x, 0.048 + h / 2, z]}><coneGeometry args={[0.055, h, 6]} /><primitive object={mat} attach="material" /></mesh>
          ))}
        </>
      )}
      {style === 'BUN' && (
        <>
          <mesh position={[0, 0.069, 0]}><cylinderGeometry args={[0.265, 0.265, 0.09, 24]} /><primitive object={mat} attach="material" /></mesh>
          <mesh position={[0, 0.29, 0]}><sphereGeometry args={[0.178, 16, 12]} /><primitive object={mat} attach="material" /></mesh>
        </>
      )}
      {style === 'CURLY' && (
        <>
          <mesh position={[0, 0.129, 0]}><cylinderGeometry args={[0.308, 0.288, 0.21, 24]} /><primitive object={mat} attach="material" /></mesh>
          {[[0.27,0.1,0.1],[-0.27,0.1,0.1],[0.27,0.1,-0.1],[-0.27,0.1,-0.1],[0,0.3,0.22],[0,0.3,-0.22]].map(([x,y,z],i) => (
            <mesh key={i} position={[x, y, z]}><sphereGeometry args={[0.098, 8, 8]} /><primitive object={mat} attach="material" /></mesh>
          ))}
        </>
      )}
      {style === 'HELMET' && (
        <>
          <mesh position={[0, 0.16, 0]}><cylinderGeometry args={[0.285, 0.275, 0.54, 32]} /><primitive object={mat} attach="material" /></mesh>
          <mesh position={[0, 0.04, 0.276]}>
            <boxGeometry args={[0.44, 0.15, 0.06]} />
            <meshLambertMaterial color={0x111122} transparent opacity={0.82} />
          </mesh>
        </>
      )}
      {style === 'PONYTAIL' && (
        <>
          <mesh position={[0, 0.069, 0]}><cylinderGeometry args={[0.265, 0.265, 0.09, 24]} /><primitive object={mat} attach="material" /></mesh>
          <mesh position={[0, 0.02, -0.3]} rotation={[-0.26, 0, 0]}><cylinderGeometry args={[0.07, 0.04, 0.58, 12]} /><primitive object={mat} attach="material" /></mesh>
        </>
      )}
    </group>
  )
}
