import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';

export function Car3D({ color, isDragging }: { color: string, isDragging?: boolean }) {
  return (
    <Canvas camera={{ position: [0, 3, 6], fov: 40 }} className="pointer-events-none">
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
      
      <group position={[0, -0.5, 0]} rotation={[0, -Math.PI / 4, 0]} scale={isDragging ? 1.2 : 1}>
        {/* Car Body */}
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[1.6, 0.5, 3.6]} />
          <meshStandardMaterial color={color} roughness={0.1} metalness={0.6} />
        </mesh>
        
        {/* Car Cabin */}
        <mesh position={[0, 1.1, -0.2]}>
          <boxGeometry args={[1.2, 0.5, 1.8]} />
          <meshStandardMaterial color="#111" roughness={0.1} metalness={0.9} />
        </mesh>

        {/* Headlights */}
        <mesh position={[0.5, 0.6, 1.81]}>
          <boxGeometry args={[0.3, 0.2, 0.1]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
        </mesh>
        <mesh position={[-0.5, 0.6, 1.81]}>
          <boxGeometry args={[0.3, 0.2, 0.1]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
        </mesh>

        {/* Taillights */}
        <mesh position={[0.5, 0.6, -1.81]}>
          <boxGeometry args={[0.3, 0.2, 0.1]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} />
        </mesh>
        <mesh position={[-0.5, 0.6, -1.81]}>
          <boxGeometry args={[0.3, 0.2, 0.1]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} />
        </mesh>

        {/* Wheels */}
        <mesh position={[0.9, 0.3, 1.1]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.35, 0.35, 0.2, 32]} />
          <meshStandardMaterial color="#222" roughness={0.8} />
        </mesh>
        <mesh position={[-0.9, 0.3, 1.1]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.35, 0.35, 0.2, 32]} />
          <meshStandardMaterial color="#222" roughness={0.8} />
        </mesh>
        <mesh position={[0.9, 0.3, -1.1]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.35, 0.35, 0.2, 32]} />
          <meshStandardMaterial color="#222" roughness={0.8} />
        </mesh>
        <mesh position={[-0.9, 0.3, -1.1]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.35, 0.35, 0.2, 32]} />
          <meshStandardMaterial color="#222" roughness={0.8} />
        </mesh>
      </group>

      <ContactShadows position={[0, -0.49, 0]} opacity={0.5} scale={10} blur={2.5} far={4} />
      <Environment preset="city" />
    </Canvas>
  );
}
