import { useLoader } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useMemo } from 'react';
import { SRGBColorSpace, TextureLoader } from 'three';
import { BRAND } from '../../app/brand';
import { BACKBOARD, HOOP } from '../physics/courtGeometry';
import { LOGO_URLS, woodTexture } from './textures';

const LINE = 0.05;
/** Free-throw line is 4.6 m from the backboard face; baseline 1.2 m behind it. */
const FREE_THROW_Z = BACKBOARD.z + 4.6;
const BASELINE_Z = BACKBOARD.z - 1.2;
const LANE_WIDTH = 4.9;
const LANE_LENGTH = FREE_THROW_Z - BASELINE_Z;
const THREE_POINT_RADIUS = 6.75;
const FLOOR_Y = 0.001;
/** Half court: baseline to the half-court line, sideline to sideline. */
const COURT_WIDTH = 15;
const COURT_LENGTH = 14;
/** Metres of floor covered by one repeat of the wood texture. */
const WOOD_TILE_M = 3.8;
/** CAPTAIN wordmark painted in the key, in front of the hoop, where the camera sees it. */
const LANE_LOGO_WIDTH = 3.4;
const LANE_LOGO_Z = -3.6;

function Line({ x, z, w, d }: { x: number; z: number; w: number; d: number }) {
  return (
    <mesh position={[x, FLOOR_Y * 2, z]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color={BRAND.light} roughness={0.6} />
    </mesh>
  );
}

function Arc({
  radius,
  z,
  start,
  length,
}: {
  radius: number;
  z: number;
  start: number;
  length: number;
}) {
  return (
    <mesh position={[0, FLOOR_Y * 2, z]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[radius - LINE / 2, radius + LINE / 2, 96, 1, start, length]} />
      <meshStandardMaterial color={BRAND.light} roughness={0.6} />
    </mesh>
  );
}

function WoodFloor() {
  const texture = useMemo(() => {
    const t = woodTexture();
    t.repeat.set(COURT_WIDTH / WOOD_TILE_M, COURT_LENGTH / WOOD_TILE_M);
    return t;
  }, []);
  return (
    <mesh
      position={[0, FLOOR_Y / 2, BASELINE_Z + COURT_LENGTH / 2]}
      rotation-x={-Math.PI / 2}
      receiveShadow
    >
      <planeGeometry args={[COURT_WIDTH, COURT_LENGTH]} />
      <meshStandardMaterial map={texture} roughness={0.32} metalness={0.05} />
    </mesh>
  );
}

function LaneLogo() {
  const texture = useLoader(TextureLoader, LOGO_URLS.captain);
  texture.colorSpace = SRGBColorSpace;
  const image = texture.image as { width: number; height: number } | undefined;
  const aspect = image ? image.height / image.width : 0.22;
  return (
    <mesh position={[0, FLOOR_Y * 3, LANE_LOGO_Z]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[LANE_LOGO_WIDTH, LANE_LOGO_WIDTH * aspect]} />
      <meshStandardMaterial map={texture} transparent opacity={0.9} roughness={0.4} />
    </mesh>
  );
}

export function Court() {
  return (
    <group>
      {/* Floor (physics + visual) */}
      <RigidBody type="fixed" name="floor" colliders={false} restitution={0.7} friction={0.8}>
        <CuboidCollider args={[20, 0.1, 20]} position={[0, -0.1, 0]} />
      </RigidBody>
      {/* Dark apron around the court, maple boards on it */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#141c2c" roughness={0.6} />
      </mesh>
      <WoodFloor />

      {/* Painted lane */}
      <mesh
        position={[0, FLOOR_Y, BASELINE_Z + LANE_LENGTH / 2]}
        rotation-x={-Math.PI / 2}
        receiveShadow
      >
        <planeGeometry args={[LANE_WIDTH, LANE_LENGTH]} />
        <meshStandardMaterial color={BRAND.blue} roughness={0.35} transparent opacity={0.88} />
      </mesh>
      <LaneLogo />

      {/* Lines */}
      <Line x={0} z={FREE_THROW_Z} w={LANE_WIDTH} d={LINE} />
      <Line x={-LANE_WIDTH / 2} z={BASELINE_Z + LANE_LENGTH / 2} w={LINE} d={LANE_LENGTH} />
      <Line x={LANE_WIDTH / 2} z={BASELINE_Z + LANE_LENGTH / 2} w={LINE} d={LANE_LENGTH} />
      <Line x={0} z={BASELINE_Z} w={15} d={LINE} />
      {/* Free-throw circle (half towards the shooter) */}
      <Arc radius={1.8} z={FREE_THROW_Z} start={Math.PI} length={Math.PI} />
      {/* Three-point arc around the hoop */}
      <Arc
        radius={THREE_POINT_RADIUS}
        z={HOOP.center.z}
        start={Math.PI * 1.07}
        length={Math.PI * 0.86}
      />
    </group>
  );
}
