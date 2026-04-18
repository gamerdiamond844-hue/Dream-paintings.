import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshDistortMaterial, Float, Torus, Sphere, MeshWobbleMaterial, Environment } from '@react-three/drei';

function AbstractSculpture() {
  const group = useRef();
  const { mouse } = useThree();

  useFrame((state) => {
    group.current.rotation.y += 0.005;
    group.current.rotation.x += (mouse.y * 0.3 - group.current.rotation.x) * 0.05;
    group.current.rotation.z += (mouse.x * 0.2 - group.current.rotation.z) * 0.05;
  });

  return (
    <group ref={group}>
      {/* Core sphere */}
      <mesh>
        <Sphere args={[1.2, 128, 128]}>
          <MeshDistortMaterial
            color="#e11d48"
            distort={0.5}
            speed={3}
            roughness={0}
            metalness={1}
            envMapIntensity={2}
          />
        </Sphere>
      </mesh>

      {/* Orbiting rings */}
      <Float speed={2} rotationIntensity={1}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <Torus args={[2, 0.05, 16, 200]}>
            <meshStandardMaterial color="#ff6b6b" metalness={1} roughness={0} transparent opacity={0.8} />
          </Torus>
        </mesh>
      </Float>

      <Float speed={1.5} rotationIntensity={0.8}>
        <mesh rotation={[Math.PI / 3, Math.PI / 4, 0]}>
          <Torus args={[2.5, 0.04, 16, 200]}>
            <meshStandardMaterial color="#be123c" metalness={1} roughness={0} transparent opacity={0.6} />
          </Torus>
        </mesh>
      </Float>

      <Float speed={2.5} rotationIntensity={1.2}>
        <mesh rotation={[0, Math.PI / 3, Math.PI / 5]}>
          <Torus args={[1.8, 0.03, 16, 200]}>
            <meshStandardMaterial color="#fecdd3" metalness={0.8} roughness={0.1} transparent opacity={0.5} />
          </Torus>
        </mesh>
      </Float>

      {/* Satellite orbs */}
      {[0, 1, 2, 3].map((i) => (
        <Float key={i} speed={1 + i * 0.3} floatIntensity={0.5}>
          <mesh position={[
            Math.cos((i / 4) * Math.PI * 2) * 2.8,
            Math.sin((i / 4) * Math.PI * 2) * 0.5,
            Math.sin((i / 4) * Math.PI * 2) * 2.8,
          ]}>
            <Sphere args={[0.15, 32, 32]}>
              <meshStandardMaterial color="#e11d48" metalness={1} roughness={0} emissive="#e11d48" emissiveIntensity={0.5} />
            </Sphere>
          </mesh>
        </Float>
      ))}
    </group>
  );
}

export default function Interactive3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 45 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={3} color="#ff6b6b" />
      <pointLight position={[-5, -5, -5]} intensity={2} color="#e11d48" />
      <pointLight position={[0, 5, -5]} intensity={1.5} color="#ffffff" />
      <Environment preset="city" />
      <AbstractSculpture />
    </Canvas>
  );
}
