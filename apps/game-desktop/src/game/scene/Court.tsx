import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { BACKBOARD, HOOP } from '../physics/courtGeometry';
import { BRAND } from '../../app/brand';

const LINE = 0.05;
/** Free-throw line is 4.6 m from the backboard face; baseline 1.2 m behind it. */
const FREE_THROW_Z = BACKBOARD.z + 4.6;
const BASELINE_Z = BACKBOARD.z - 1.2;
const LANE_WIDTH = 4.9;
const LANE_LENGTH = FREE_THROW_Z - BASELINE_Z;
const THREE_POINT_RADIUS = 6.75;
const FLOOR_Y = 0.001;

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

export function Court() {
  return (
    <group>
      {/* Floor (physics + visual) */}
      <RigidBody type="fixed" name="floor" colliders={false} restitution={0.7} friction={0.8}>
        <CuboidCollider args={[20, 0.1, 20]} position={[0, -0.1, 0]} />
      </RigidBody>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#22304d" roughness={0.35} metalness={0.15} />
      </mesh>

      {/* Painted lane */}
      <mesh
        position={[0, FLOOR_Y, BASELINE_Z + LANE_LENGTH / 2]}
        rotation-x={-Math.PI / 2}
        receiveShadow
      >
        <planeGeometry args={[LANE_WIDTH, LANE_LENGTH]} />
        <meshStandardMaterial color={BRAND.blue} roughness={0.5} />
      </mesh>

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

      {/* Back wall */}
      <mesh position={[0, 6, BASELINE_Z - 4]}>
        <planeGeometry args={[40, 12]} />
        <meshStandardMaterial color={BRAND.dark} roughness={0.9} />
      </mesh>
      {/* Blue accent band on the back wall */}
      <mesh position={[0, 1.2, BASELINE_Z - 3.99]}>
        <planeGeometry args={[40, 0.25]} />
        <meshStandardMaterial color={BRAND.blue} emissive={BRAND.blue} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}
