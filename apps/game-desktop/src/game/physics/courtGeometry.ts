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
  // A little above eye height and aimed below the rim, so the floor, the key and the
  // courtside boards stay in view on a 16:9 screen (purely visual: shots launch from
  // LAUNCH_POSITION).
  position: [0, 2.15, 0.9] as [number, number, number],
  lookAt: [0, 2.45, -4.2] as [number, number, number],
  // Wide enough to keep the top of the ball's arc in frame.
  fov: 58,
};

export const GRAVITY = 9.81;
