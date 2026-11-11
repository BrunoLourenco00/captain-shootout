import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Color, DoubleSide, Object3D, type InstancedMesh } from 'three';
import { BRAND } from '../../app/brand';
import { liveHoopCenter } from '../physics/liveHoop';

const COUNT = 90;
const LIFETIME_S = 1.6;
const GRAVITY = 6;
const COLORS = [BRAND.blue, BRAND.light, '#ff7a1a', '#4f9bff'];

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
}

/** A burst of brand-coloured confetti from the rim, re-fired whenever `seq` changes. */
export function Confetti({ seq }: { seq: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const age = useRef(LIFETIME_S);
  const particles = useMemo<Particle[]>(
    () => Array.from({ length: COUNT }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: 0 })),
    [],
  );
  const dummy = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    const color = new Color();
    for (let i = 0; i < COUNT; i++) {
      mesh.current?.setColorAt(i, color.set(COLORS[i % COLORS.length] ?? BRAND.light));
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      mesh.current?.setMatrixAt(i, dummy.matrix);
    }
    if (mesh.current?.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [dummy]);

  useEffect(() => {
    if (seq === 0) return;
    age.current = 0;
    for (const p of particles) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.2;
      p.x = liveHoopCenter.x;
      p.y = liveHoopCenter.y + 0.1;
      p.z = liveHoopCenter.z;
      p.vx = Math.cos(angle) * speed;
      p.vz = Math.sin(angle) * speed * 0.6;
      p.vy = 2 + Math.random() * 2.5;
      p.spin = (Math.random() - 0.5) * 20;
    }
  }, [seq, particles]);

  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m || age.current >= LIFETIME_S) return;
    const dt = Math.min(delta, 0.05);
    age.current += dt;
    const fade = Math.max(0, 1 - age.current / LIFETIME_S);
    particles.forEach((p, i) => {
      p.vy -= GRAVITY * dt;
      p.vx *= 0.985;
      p.vz *= 0.985;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(age.current * p.spin, age.current * p.spin * 0.7, 0);
      dummy.scale.setScalar(fade);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <planeGeometry args={[0.07, 0.04]} />
      <meshBasicMaterial side={DoubleSide} toneMapped={false} />
    </instancedMesh>
  );
}
