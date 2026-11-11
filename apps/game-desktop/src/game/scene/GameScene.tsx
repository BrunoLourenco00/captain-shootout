import type { ShotOutcome } from '@captain/game-protocol';
import { Canvas, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense, useEffect, useState } from 'react';
import { Object3D } from 'three';
import { BRAND } from '../../app/brand';
import { CAMERA, GRAVITY, HOOP } from '../physics/courtGeometry';
import type { HoopMotionTarget } from '../physics/liveHoop';
import type { ActiveBall } from '../state/gameState';
import { Arena } from './Arena';
import { Ball } from './Ball';
import { Confetti } from './Confetti';
import { Court } from './Court';
import { Hoop } from './Hoop';

function CameraRig() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.lookAt(...CAMERA.lookAt);
  }, [camera]);
  return null;
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.45} />
      {/* Fill light for the floor between the shooter and the hoop */}
      <pointLight position={[0, 5, -2]} intensity={25} distance={14} />
      <hemisphereLight args={[BRAND.light, BRAND.dark, 0.5]} />
      <HoopSpotLight />
      <spotLight position={[-6, 7, 3]} angle={0.7} penumbra={1} intensity={60} color={BRAND.blue} />
      <spotLight position={[6, 7, 3]} angle={0.7} penumbra={1} intensity={60} color={BRAND.blue} />
    </>
  );
}

/** Key light aimed at the hoop (a spotlight's target must be an object in the scene). */
function HoopSpotLight() {
  const [target] = useState(() => {
    const o = new Object3D();
    o.position.set(HOOP.center.x, HOOP.center.y - 1, HOOP.center.z);
    return o;
  });
  return (
    <>
      <primitive object={target} />
      <spotLight
        target={target}
        position={[0, 9, -1]}
        angle={0.55}
        penumbra={0.6}
        intensity={140}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
    </>
  );
}

export interface GameSceneProps {
  balls: ActiveBall[];
  onResolve: (shotId: string, outcome: ShotOutcome) => void;
  onRemove: (shotId: string) => void;
  /** A round is on (countdown → buzzer grace): the hoop may move and effects play. */
  roundActive: boolean;
  hoopMotion: HoopMotionTarget;
  onFire: boolean;
  /** Increments on every basket. */
  basketSeq: number;
  /** Increments on every perfect basket (confetti). */
  perfectSeq: number;
}

export function GameScene({
  balls,
  onResolve,
  onRemove,
  roundActive,
  hoopMotion,
  onFire,
  basketSeq,
  perfectSeq,
}: GameSceneProps) {
  return (
    <Canvas
      shadows
      // The kiosk runs for hours: outside a round nothing moves, so the static scene is
      // redrawn on demand instead of every frame, and Retina is capped at 1.5x.
      frameloop={roundActive || balls.length > 0 ? 'always' : 'demand'}
      dpr={[1, 1.5]}
      camera={{ position: CAMERA.position, fov: CAMERA.fov, near: 0.05, far: 80 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[BRAND.dark]} />
      <fog attach="fog" args={[BRAND.dark, 12, 30]} />
      <CameraRig />
      <Lights />
      <Suspense fallback={null}>
        <Arena />
        <Physics gravity={[0, -GRAVITY, 0]} timeStep={1 / 120}>
          <Court />
          <Hoop motion={hoopMotion} active={roundActive} onFire={onFire} basketSeq={basketSeq} />
          {balls.map((ball) => (
            <Ball key={ball.shotId} ball={ball} onResolve={onResolve} onRemove={onRemove} />
          ))}
        </Physics>
        <Confetti seq={perfectSeq} />
      </Suspense>
    </Canvas>
  );
}
