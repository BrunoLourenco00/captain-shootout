import { useFrame, useThree } from '@react-three/fiber';
import { BallCollider, CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { useEffect, useMemo, useRef } from 'react';
import type { Group, MeshStandardMaterial } from 'three';
import { BRAND } from '../../app/brand';
import { BACKBOARD, HOOP } from '../physics/courtGeometry';
import {
  liveHoopCenter,
  stepHoopMotion,
  type HoopMotion,
  type HoopMotionTarget,
} from '../physics/liveHoop';

/** Name used by balls to detect rim contact (a basket without rim contact is "perfect"). */
export const RIM_BODY_NAME = 'rim';

const RIM_SEGMENTS = 32;
const RIM_RING_RADIUS = HOOP.rimRadius + HOOP.rimTube;
const BOARD_CENTER_Y = BACKBOARD.bottomY + BACKBOARD.height / 2;
const RIM_COLOR = '#ff5a1f';

export interface HoopProps {
  /** Motion of the current level (amplitude 0 = still). */
  motion: HoopMotionTarget;
  /** False outside a round: the hoop snaps back to the regulation position. */
  active: boolean;
  /** Rim glows while the next basket is multiplied by the streak. */
  onFire: boolean;
  /** Increments on every basket: the net swishes. */
  basketSeq: number;
}

export function Hoop({ motion, active, onFire, basketSeq }: HoopProps) {
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

  const rim = useRef<RapierRigidBody>(null);
  const board = useRef<RapierRigidBody>(null);
  const visuals = useRef<Group>(null);
  const net = useRef<Group>(null);
  const rimMaterial = useRef<MeshStandardMaterial>(null);
  const state = useRef<HoopMotion>({ phase: 0, sway: 0, bob: 0 });
  const swish = useRef(0);
  const invalidate = useThree((s) => s.invalidate);

  const place = (dx: number, dy: number) => {
    liveHoopCenter.x = x + dx;
    liveHoopCenter.y = y + dy;
    rim.current?.setNextKinematicTranslation({ x: x + dx, y: y + dy, z });
    board.current?.setNextKinematicTranslation({ x: dx, y: dy, z: 0 });
    visuals.current?.position.set(dx, dy, 0);
  };

  // Back to the regulation spot between rounds (the scene may not be animating then).
  useEffect(() => {
    if (active) return;
    state.current = { phase: 0, sway: 0, bob: 0 };
    place(0, 0);
    if (rimMaterial.current) rimMaterial.current.emissiveIntensity = 0;
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (basketSeq > 0) swish.current = 1;
  }, [basketSeq]);

  useFrame((frame, delta) => {
    const dt = Math.min(delta, 0.05);
    if (active) {
      const offset = stepHoopMotion(state.current, motion, dt);
      place(offset.x, offset.y);
    }

    // Net swish: stretch down and narrow, then settle.
    const s = swish.current;
    if (net.current) {
      net.current.scale.set(1 - 0.18 * s, 1 + 0.4 * s, 1 - 0.18 * s);
      net.current.rotation.y = 0.25 * s * Math.sin(frame.clock.elapsedTime * 30);
    }
    swish.current = Math.max(0, s - dt * 2.5);

    if (rimMaterial.current) {
      rimMaterial.current.emissiveIntensity =
        active && onFire ? 0.9 + 0.6 * Math.sin(frame.clock.elapsedTime * 10) : 0;
    }
  });

  return (
    <group>
      {/* Rim (moves with the level, so it is kinematic) */}
      <RigidBody
        ref={rim}
        type="kinematicPosition"
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
          <meshStandardMaterial
            ref={rimMaterial}
            color={RIM_COLOR}
            emissive={RIM_COLOR}
            emissiveIntensity={0}
            metalness={0.6}
            roughness={0.35}
          />
        </mesh>
      </RigidBody>

      {/* Backboard */}
      <RigidBody
        ref={board}
        type="kinematicPosition"
        name="backboard"
        colliders={false}
        restitution={0.6}
      >
        <CuboidCollider
          args={[BACKBOARD.width / 2, BACKBOARD.height / 2, BACKBOARD.depth / 2]}
          position={[0, BOARD_CENTER_Y, BACKBOARD.z - BACKBOARD.depth / 2]}
        />
      </RigidBody>

      {/* Everything else that moves with the hoop (visual only) */}
      <group ref={visuals}>
        {/* Bracket between rim and board */}
        <mesh position={[x, y - 0.03, BACKBOARD.z + (HOOP.boardOffset - HOOP.rimRadius) / 2]}>
          <boxGeometry args={[0.18, 0.05, HOOP.boardOffset - HOOP.rimRadius]} />
          <meshStandardMaterial color="#c9471a" metalness={0.5} roughness={0.4} />
        </mesh>

        {/* Net, pivoting from the rim so the swish stretches it downwards */}
        <group ref={net} position={[x, y, z]}>
          <mesh position={[0, -0.22, 0]}>
            <cylinderGeometry args={[HOOP.rimRadius, HOOP.rimRadius * 0.6, 0.42, 16, 4, true]} />
            <meshBasicMaterial color={BRAND.light} wireframe transparent opacity={0.75} />
          </mesh>
        </group>

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

        {/* Ceiling-hung supports, kept off-centre so they don't split the view */}
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
