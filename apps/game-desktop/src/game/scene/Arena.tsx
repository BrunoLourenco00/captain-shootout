import { useLoader } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, Color, ImageLoader, Object3D, type InstancedMesh } from 'three';
import { BRAND } from '../../app/brand';
import { BACKBOARD } from '../physics/courtGeometry';
import { LOGO_URLS, ledBoardTexture, sponsorBannerTexture } from './textures';

/** Baseline is 1.2 m behind the backboard face (see Court). */
const BASELINE_Z = BACKBOARD.z - 1.2;
const LED_Z = BASELINE_Z - 2.4;
const LED_HEIGHT = 0.8;
const STANDS_FRONT_Z = LED_Z - 0.8;
const ROWS = 9;
const ROW_DEPTH = 0.85;
const ROW_RISE = 0.55;
const SEATS_PER_ROW = 46;
const SEAT_SPACING = 0.55;

/** Courtside LED boards along the baseline and both sidelines. */
function LedBoards() {
  const [captain, dhika] = useLoader(ImageLoader, [LOGO_URLS.captain, LOGO_URLS.dhika]);
  const [baseline, side] = useMemo(() => {
    if (!captain || !dhika) return [null, null];
    return [ledBoardTexture(captain, dhika, 9), ledBoardTexture(captain, dhika, 6)];
  }, [captain, dhika]);
  if (!baseline || !side) return null;

  const sideLength = 9;
  const sideZ = BASELINE_Z + sideLength / 2 - 0.4;
  return (
    <group>
      <mesh position={[0, LED_HEIGHT / 2, LED_Z]}>
        <planeGeometry args={[16, LED_HEIGHT]} />
        <meshBasicMaterial map={baseline} toneMapped={false} />
      </mesh>
      {[-1, 1].map((side_) => (
        <mesh
          key={side_}
          position={[side_ * 7.6, LED_HEIGHT / 2, sideZ]}
          rotation-y={-side_ * (Math.PI / 2)}
        >
          <planeGeometry args={[sideLength, LED_HEIGHT]} />
          <meshBasicMaterial map={side} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Tiered stands behind the baseline filled with simple crowd silhouettes. */
function Stands() {
  const bodies = useRef<InstancedMesh>(null);
  const heads = useRef<InstancedMesh>(null);
  const count = ROWS * SEATS_PER_ROW;

  useLayoutEffect(() => {
    const dummy = new Object3D();
    const color = new Color();
    // Mostly dark clothing, some brand blue and white "fan" shirts.
    const palette = ['#1b2436', '#232e44', '#141b29', '#2b364d', '#1c4f9c', '#6f7d94'];
    let seed = 11;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    let i = 0;
    for (let row = 0; row < ROWS; row++) {
      for (let seat = 0; seat < SEATS_PER_ROW; seat++, i++) {
        const empty = rand() < 0.12;
        const x = (seat - (SEATS_PER_ROW - 1) / 2) * SEAT_SPACING + (rand() - 0.5) * 0.12;
        const y = row * ROW_RISE + 0.55;
        const z = STANDS_FRONT_Z - row * ROW_DEPTH - 0.3;
        const scale = empty ? 0 : 0.9 + rand() * 0.2;
        dummy.position.set(x, y, z);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        bodies.current?.setMatrixAt(i, dummy.matrix);
        dummy.position.set(x, y + 0.45 * scale, z);
        dummy.updateMatrix();
        heads.current?.setMatrixAt(i, dummy.matrix);
        const pick = rand();
        color.set(palette[pick < 0.08 ? 4 : pick < 0.13 ? 5 : Math.floor(rand() * 4)] ?? '#1b2436');
        bodies.current?.setColorAt(i, color);
      }
    }
    for (const mesh of [bodies.current, heads.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, []);

  return (
    <group>
      {/* Steps */}
      {Array.from({ length: ROWS }, (_, row) => (
        <mesh key={row} position={[0, row * ROW_RISE + 0.12, STANDS_FRONT_Z - row * ROW_DEPTH]}>
          <boxGeometry args={[SEATS_PER_ROW * SEAT_SPACING + 2, 0.25, ROW_DEPTH]} />
          <meshStandardMaterial color="#121a2a" roughness={0.9} />
        </mesh>
      ))}
      <instancedMesh ref={bodies} args={[undefined, undefined, count]}>
        <capsuleGeometry args={[0.17, 0.3, 4, 8]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color="#2a2f3a" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

/** Sponsor banners hung above the stands, left and right so they never sit behind the hoop. */
function SponsorBanners() {
  const [dhika] = useLoader(ImageLoader, [LOGO_URLS.dhika]);
  const texture = useMemo(() => (dhika ? sponsorBannerTexture(dhika) : null), [dhika]);
  if (!texture) return null;
  const z = STANDS_FRONT_Z - ROWS * ROW_DEPTH * 0.6;
  return (
    <group>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 5.6, 6.2, z]} rotation-y={-side * 0.25}>
          <planeGeometry args={[4.4, 1.1]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Ceiling fixtures with soft light beams (no extra real lights: cheap to render). */
function CeilingLights() {
  const fixtures = useMemo(() => {
    const list: [number, number][] = [];
    for (const x of [-6, -2, 2, 6]) for (const z of [-11, -5.5, 0]) list.push([x, z]);
    return list;
  }, []);
  return (
    <group>
      {fixtures.map(([x, z]) => (
        <group key={`${x}:${z}`} position={[x, 10, z]}>
          <mesh rotation-x={Math.PI / 2}>
            <circleGeometry args={[0.35, 24]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
          <mesh position={[0, -3, 0]}>
            <coneGeometry args={[1.6, 6, 24, 1, true]} />
            <meshBasicMaterial
              color="#9cc2ff"
              transparent
              opacity={0.045}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Arena() {
  return (
    <group>
      <LedBoards />
      <Stands />
      <SponsorBanners />
      <CeilingLights />
      {/* Back wall behind the stands */}
      <mesh position={[0, 7, STANDS_FRONT_Z - ROWS * ROW_DEPTH - 0.6]}>
        <planeGeometry args={[40, 16]} />
        <meshStandardMaterial color={BRAND.dark} roughness={0.95} />
      </mesh>
    </group>
  );
}
