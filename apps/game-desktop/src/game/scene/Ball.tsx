import type { ShotOutcome } from '@captain/game-protocol';
import { useFrame } from '@react-three/fiber';
import { BallCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { useEffect, useMemo, useRef } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { BRAND } from '../../app/brand';
import { crossedHoopDownward } from '../physics/basketDetection';
import { BALL_RADIUS, HOOP, LAUNCH_POSITION, type Vec3 } from '../physics/courtGeometry';
import { calculateShotVelocity } from '../physics/shotVelocity';
import type { ActiveBall } from '../state/gameState';
import { RIM_BODY_NAME } from './Hoop';

/** Ball centre must cross the rim plane within this horizontal distance of the rim centre. */
const SCORING_ZONE = { center: HOOP.center, radius: HOOP.rimRadius - BALL_RADIUS * 0.4 };
/** A ball that touches the floor before scoring is a miss. */
const FLOOR_MISS_Y = BALL_RADIUS + 0.03;
/** Keep the ball in the scene for a moment after it resolves, then remove it. */
const LINGER_AFTER_RESOLVE_MS = 1200;
const MAX_LIFETIME_MS = 4000;

let sharedTexture: CanvasTexture | null = null;

/** Procedural basketball texture: orange with dark seams. Created once and shared. */
function ballTexture(): CanvasTexture {
  if (sharedTexture) return sharedTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = BRAND.ball;
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#1b0f08';
  ctx.lineWidth = 6;
  for (const x of [0, 128, 256, 384]) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, 128);
  ctx.lineTo(512, 128);
  ctx.stroke();
  sharedTexture = new CanvasTexture(canvas);
  sharedTexture.colorSpace = SRGBColorSpace;
  return sharedTexture;
}

export interface BallProps {
  ball: ActiveBall;
  onResolve: (shotId: string, outcome: ShotOutcome) => void;
  onRemove: (shotId: string) => void;
}

export function Ball({ ball, onResolve, onRemove }: BallProps) {
  const body = useRef<RapierRigidBody>(null);
  const prev = useRef<Vec3>({ ...LAUNCH_POSITION });
  const touchedRim = useRef(false);
  const settled = useRef(false);
  const texture = useMemo(ballTexture, []);

  const velocity = useMemo(
    () => calculateShotVelocity(ball, LAUNCH_POSITION, HOOP.center),
    // The shot never changes for a given ball.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ball.shotId],
  );

  // Remove the ball after it has resolved (or after a hard maximum lifetime).
  useEffect(() => {
    const delay = ball.resolved ? LINGER_AFTER_RESOLVE_MS : MAX_LIFETIME_MS;
    const timer = setTimeout(() => onRemove(ball.shotId), delay);
    return () => clearTimeout(timer);
  }, [ball.resolved, ball.shotId, onRemove]);

  useFrame(() => {
    const rb = body.current;
    if (!rb || settled.current) return;
    const t = rb.translation();
    const curr = { x: t.x, y: t.y, z: t.z };
    if (crossedHoopDownward(prev.current, curr, SCORING_ZONE)) {
      settled.current = true;
      onResolve(ball.shotId, touchedRim.current ? 'scored' : 'perfect');
    } else if (curr.y < FLOOR_MISS_Y) {
      settled.current = true;
      onResolve(ball.shotId, 'missed');
    }
    prev.current = curr;
  });

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={[LAUNCH_POSITION.x, LAUNCH_POSITION.y, LAUNCH_POSITION.z]}
      linearVelocity={[velocity.x, velocity.y, velocity.z]}
      // Light backspin, mostly cosmetic.
      angularVelocity={[-6, 0, 0]}
      ccd
      restitution={0.72}
      friction={0.6}
      onCollisionEnter={({ other }) => {
        if (other.rigidBodyObject?.name === RIM_BODY_NAME) touchedRim.current = true;
      }}
    >
      <BallCollider args={[BALL_RADIUS]} density={600} />
      <mesh castShadow>
        <sphereGeometry args={[BALL_RADIUS, 32, 24]} />
        <meshStandardMaterial map={texture} roughness={0.75} />
      </mesh>
    </RigidBody>
  );
}
