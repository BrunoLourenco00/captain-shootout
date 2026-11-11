/** Scene dimensions in metres (regulation hoop, free-throw distance). -Z points towards the hoop. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const BALL_RADIUS = 0.12;

export const HOOP = {
  /** Centre of the rim ring. */
  center: { x: 0, y: 3.05, z: -4.2 } satisfies Vec3,
  /** Inner radius of the rim (45 cm diameter). */
  rimRadius: 0.225,
  /** Thickness radius of the rim tube. */
  rimTube: 0.012,
  /** Rim centre to backboard face. */
  boardOffset: 0.375,
} as const;

export const BACKBOARD = {
  width: 1.8,
  height: 1.05,
  depth: 0.04,
  /** Bottom edge height. */
  bottomY: 2.9,
  z: HOOP.center.z - HOOP.boardOffset,
} as const;

/** Where every ball spawns, slightly below and in front of the camera. */
export const LAUNCH_POSITION: Vec3 = { x: 0, y: 1.55, z: -0.35 };

export const CAMERA = {
  position: [0, 1.75, 0.6] as [number, number, number],
  lookAt: [0, 2.55, -4.2] as [number, number, number],
  fov: 50,
};

export const GRAVITY = 9.81;
