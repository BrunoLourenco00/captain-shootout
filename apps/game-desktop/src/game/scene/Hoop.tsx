import { BallCollider, CuboidCollider, RigidBody } from '@react-three/rapier';
import { useMemo } from 'react';
import { BRAND } from '../../app/brand';
import { BACKBOARD, HOOP } from '../physics/courtGeometry';

/** Name used by balls to detect rim contact (a basket without rim contact is "perfect"). */
export const RIM_BODY_NAME = 'rim';

const RIM_SEGMENTS = 32;
const RIM_RING_RADIUS = HOOP.rimRadius + HOOP.rimTube;
const BOARD_CENTER_Y = BACKBOARD.bottomY + BACKBOARD.height / 2;

export function Hoop() {
  // Rapier has no torus collider: approximate the rim with a ring of small spheres.
  const rimPoints = useMemo(
    () =>
      Array.from({ length: RIM_SEGMENTS }, (_, i) => {
        const a = (i / RIM_SEGMENTS) * Math.PI * 2;
        return [Math.cos(a) * RIM_RING_RADIUS, 0, Math.sin(a) * RIM_RING_RADIUS] as const;
      }),
    [],
  );
  const { x, y, z } = HOOP.center;

  return (
    <group>
      {/* Rim */}
      <RigidBody
        type="fixed"
        name={RIM_BODY_NAME}
        colliders={false}
        position={[x, y, z]}
        restitution={0.55}
      >
        {rimPoints.map((p, i) => (
          <BallCollider key={i} args={[HOOP.rimTube * 1.5]} position={[p[0], p[1], p[2]]} />
        ))}
        <mesh rotation-x={Math.PI / 2} castShadow>
          <torusGeometry args={[RIM_RING_RADIUS, HOOP.rimTube, 12, 48]} />
          <meshStandardMaterial color="#ff5a1f" metalness={0.6} roughness={0.35} />
        </mesh>
      </RigidBody>

      {/* Bracket between rim and board (visual only) */}
      <mesh position={[x, y - 0.03, BACKBOARD.z + (HOOP.boardOffset - HOOP.rimRadius) / 2]}>
        <boxGeometry args={[0.18, 0.05, HOOP.boardOffset - HOOP.rimRadius]} />
        <meshStandardMaterial color="#c9471a" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Net (visual only) */}
      <mesh position={[x, y - 0.22, z]}>
        <cylinderGeometry args={[HOOP.rimRadius, HOOP.rimRadius * 0.6, 0.42, 16, 4, true]} />
        <meshBasicMaterial color={BRAND.light} wireframe transparent opacity={0.75} />
      </mesh>

      {/* Backboard */}
      <RigidBody type="fixed" name="backboard" colliders={false} restitution={0.6}>
        <CuboidCollider
          args={[BACKBOARD.width / 2, BACKBOARD.height / 2, BACKBOARD.depth / 2]}
          position={[0, BOARD_CENTER_Y, BACKBOARD.z - BACKBOARD.depth / 2]}
        />
      </RigidBody>
      <mesh position={[0, BOARD_CENTER_Y, BACKBOARD.z - BACKBOARD.depth / 2]} castShadow>
        <boxGeometry args={[BACKBOARD.width, BACKBOARD.height, BACKBOARD.depth]} />
        <meshPhysicalMaterial
          color={BRAND.light}
          transparent
          opacity={0.28}
          roughness={0.05}
          metalness={0}
        />
      </mesh>
      {/* Board frame + target square */}
      <BoardOutline
        width={BACKBOARD.width}
        height={BACKBOARD.height}
        y={BOARD_CENTER_Y}
        stroke={0.05}
        color={BRAND.light}
      />
      <BoardOutline
        width={0.59}
        height={0.45}
        y={BACKBOARD.bottomY + 0.15 + 0.225}
        stroke={0.05}
        color={BRAND.blue}
      />

      {/* Ceiling-hung supports (visual only), kept off-centre so they don't split the view */}
      {[-0.75, 0.75].map((sx) => (
        <mesh
          key={sx}
          position={[sx, (BACKBOARD.bottomY + BACKBOARD.height + 10) / 2, BACKBOARD.z - 0.15]}
        >
          <boxGeometry args={[0.06, 10 - BACKBOARD.bottomY - BACKBOARD.height, 0.06]} />
          <meshStandardMaterial color={BRAND.secondary} metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function BoardOutline({
  width,
  height,
  y,
  stroke,
  color,
}: {
  width: number;
  height: number;
  y: number;
  stroke: number;
  color: string;
}) {
  const z = BACKBOARD.z + 0.002;
  const bars: [number, number, number, number][] = [
    [0, y + height / 2 - stroke / 2, width, stroke],
    [0, y - height / 2 + stroke / 2, width, stroke],
    [-width / 2 + stroke / 2, y, stroke, height],
    [width / 2 - stroke / 2, y, stroke, height],
  ];
  return (
    <group>
      {bars.map(([bx, by, w, h], i) => (
        <mesh key={i} position={[bx, by, z]}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
        </mesh>
      ))}
    </group>
  );
}
