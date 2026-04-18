import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Float, Sphere, Torus, MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';

function FloatingOrb({ position, color, scale = 1, speed = 1 }) {
  const mesh = useRef();
  useFrame((state) => {
    mesh.current.rotation.y = state.clock.elapsedTime * 0.4 * speed;
  });
  return (
    <Float speed={speed} rotationIntensity={0.3} floatIntensity={0.6}>
      <mesh ref={mesh} position={position} scale={scale}>
        <Sphere args={[1, 24, 24]}>
          <MeshDistortMaterial
            color={color}
            attach="material"
            distort={0.3}
            speed={1.5}
            roughness={0.2}
            metalness={0.6}
            transparent
            opacity={0.8}
          />
        </Sphere>
      </mesh>
    </Float>
  );
}

function ArtFrame() {
  const group = useRef();
  useFrame((state) => {
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.3;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.25) * 0.1;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.15;
  });

  const frameColor = '#1a0a0a';
  const canvasColor = '#fff5f5';

  return (
    <group ref={group} position={[0, 0, 0]}>
      {/* Frame border */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[3.4, 4.4, 0.15]} />
        <meshStandardMaterial color={frameColor} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Canvas */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3, 4, 0.05]} />
        <meshStandardMaterial color={canvasColor} roughness={0.8} />
      </mesh>
      {/* Abstract art strokes on canvas */}
      <mesh position={[-0.3, 0.4, 0.06]}>
        <boxGeometry args={[1.2, 0.12, 0.02]} />
        <meshStandardMaterial color="#e11d48" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0.5, -0.2, 0.06]} rotation={[0, 0, 0.4]}>
        <boxGeometry args={[1.5, 0.1, 0.02]} />
        <meshStandardMaterial color="#be123c" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[-0.2, -0.8, 0.06]}>
        <boxGeometry args={[0.8, 0.08, 0.02]} />
        <meshStandardMaterial color="#ff6b6b" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0.3, 0.9, 0.06]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[1.0, 0.09, 0.02]} />
        <meshStandardMaterial color="#9f1239" roughness={0.3} metalness={0.2} />
      </mesh>
      {/* Decorative corner accents */}
      {[[-1.5, 2, 0], [1.5, 2, 0], [-1.5, -2, 0], [1.5, -2, 0]].map((pos, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={[0.3, 0.3, 0.2]} />
          <meshStandardMaterial color="#e11d48" metalness={1} roughness={0.05} />
        </mesh>
      ))}
    </group>
  );
}

function FloatingRing({ position, rotation, color }) {
  const mesh = useRef();
  useFrame((state) => {
    mesh.current.rotation.z = state.clock.elapsedTime * 0.25;
  });
  return (
    <mesh ref={mesh} position={position} rotation={rotation}>
      <Torus args={[0.6, 0.06, 8, 48]}>
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} transparent opacity={0.6} />
      </Torus>
    </mesh>
  );
}

function Particles() {
  const count = 60;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return arr;
  }, []);

  const points = useRef();
  useFrame((state) => {
    points.current.rotation.y = state.clock.elapsedTime * 0.02;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#e11d48" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

export default function Hero3D({ interactive = true }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      dpr={1}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={2} color="#ff6b6b" />
      <pointLight position={[-5, -3, 3]} intensity={1.5} color="#e11d48" />
      <pointLight position={[0, 8, 2]} intensity={1} color="#ffffff" />
      <spotLight position={[0, 10, 5]} angle={0.3} penumbra={1} intensity={2} color="#fff" castShadow />

      <Particles />
      <ArtFrame />

      <FloatingOrb position={[-4.5, 2, -2]} color="#e11d48" scale={0.7} speed={0.8} />
      <FloatingOrb position={[4.5, -1.5, -3]} color="#be123c" scale={0.5} speed={1.2} />
      <FloatingOrb position={[-3.5, -2.5, -1]} color="#ff6b6b" scale={0.35} speed={1.5} />

      <FloatingRing position={[3.5, 2.5, -1]} rotation={[0.5, 0.3, 0]} color="#e11d48" />
      <FloatingRing position={[-4, -1, -2]} rotation={[1, 0.5, 0.2]} color="#be123c" />
    </Canvas>
  );
}
