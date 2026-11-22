// The Midnight Vault — every tuning number, colour and the whole map in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the window,
// so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const COLOURS = {
  floorA: '#20242f',
  floorB: '#1b1e29',
  carpet: '#4a1d22',
  carpetEdge: '#6b2a2e',
  wall: '#333a52',
  wallTrim: '#8a6d2f',
  vaultWall: '#3d3350',
  caseGlass: '#9fc4d8',
  caseFrame: '#8a6d2f',
  safe: '#3a3f4a',
  desk: '#5d4126',
  plant: '#2f6b34',
  pillar: '#4a5068',
  shadow: '#10131c',
  lootGold: '#f2c230',
  lootDiamond: '#7fe3f0',
  lootPaint: '#c96a3b',
  guard: '#2b3f6e',
  guardCap: '#1c2a4a',
  cone: 'rgba(242, 194, 48, 0.16)',
  coneHot: 'rgba(242, 120, 48, 0.28)',
  coneChase: 'rgba(230, 60, 50, 0.30)',
  camCone: 'rgba(230, 60, 60, 0.14)',
  camConeHot: 'rgba(230, 60, 60, 0.30)',
  thief: '#14161d',
  thiefTrim: '#e8e8e8',
  exit: '#2fae5f',
  exitGlow: '#7dffab',
  hud: '#12141d',
  text: '#e8e4d8',
  dim: '#9a94a3',
};

export const THIEF = { radius: 14, speed: 205, accel: 14 };
export const GUARD = { radius: 14, patrolSpeed: 68, chaseSpeed: 138, investigateSpeed: 96, catchDist: 27 };
export const VISION = { range: 195, halfAngle: 0.56, camRange: 225, camHalfAngle: 0.42 };
export const ALARM = {
  guardPerSec: 46,
  camPerSec: 34,
  decayPerSec: 13,
  spottedAt: 50,
  lockdownAt: 100,
  shadowFactor: 0.45,
};
export const LOOT_TARGET = 4000;
export const START_COINS = 3;
export const COIN_RANGE = 430;

/** Rects that block movement and line of sight: {x, y, w, h, kind}. */
export const WALLS = [
  // outer shell
  { x: 0, y: 0, w: 1280, h: 16, kind: 'wall' },
  { x: 0, y: 704, w: 1280, h: 16, kind: 'wall' },
  { x: 0, y: 0, w: 16, h: 720, kind: 'wall' },
  { x: 1264, y: 0, w: 16, h: 720, kind: 'wall' },
  // gallery | hall divider (door gap y 300..380)
  { x: 420, y: 16, w: 16, h: 284, kind: 'wall' },
  { x: 420, y: 380, w: 16, h: 324, kind: 'wall' },
  // hall | vault divider (door gaps y 200..280 and y 520..600)
  { x: 860, y: 16, w: 16, h: 184, kind: 'wall' },
  { x: 860, y: 280, w: 16, h: 240, kind: 'wall' },
  { x: 860, y: 600, w: 16, h: 104, kind: 'wall' },
  // vault | corridor divider (door gap x 1000..1080)
  { x: 876, y: 420, w: 124, h: 16, kind: 'vault' },
  { x: 1080, y: 420, w: 184, h: 16, kind: 'vault' },
];

/** Furniture: blocks movement and sight, drawn with its kind. */
export const FURNITURE = [
  // hall display cases
  { x: 520, y: 180, w: 80, h: 46, kind: 'case' },
  { x: 700, y: 180, w: 80, h: 46, kind: 'case' },
  // hall pillars
  { x: 560, y: 380, w: 32, h: 32, kind: 'pillar' },
  { x: 688, y: 380, w: 32, h: 32, kind: 'pillar' },
  // hall desk
  { x: 580, y: 560, w: 120, h: 40, kind: 'desk' },
  // hall plants
  { x: 470, y: 500, w: 34, h: 34, kind: 'plant' },
  { x: 776, y: 500, w: 34, h: 34, kind: 'plant' },
  // gallery safe + case
  { x: 120, y: 500, w: 84, h: 60, kind: 'safe' },
  { x: 200, y: 120, w: 100, h: 50, kind: 'case' },
  // vault safe + desk
  { x: 1150, y: 250, w: 84, h: 60, kind: 'safe' },
  { x: 900, y: 300, w: 80, h: 40, kind: 'desk' },
  // corridor bench
  { x: 1150, y: 560, w: 90, h: 34, kind: 'desk' },
];

/** Dark carpet zones where the thief is spotted more slowly. */
export const SHADOWS = [
  { x: 440, y: 470, w: 400, h: 150 },
  { x: 900, y: 470, w: 340, h: 170 },
];

/** Loot: {id, x, y, value, name, kind}. */
export const LOOT = [
  { id: 'p1', x: 58, y: 120, value: 500, name: 'Portrait of a Lady', kind: 'painting' },
  { id: 'p2', x: 58, y: 340, value: 500, name: 'The Blue Valley', kind: 'painting' },
  { id: 'p3', x: 58, y: 560, value: 500, name: 'Sunset over Delft', kind: 'painting' },
  { id: 'g1', x: 250, y: 145, value: 1000, name: 'Gold bars', kind: 'gold' },
  { id: 'g2', x: 740, y: 203, value: 1000, name: 'Gold bars', kind: 'gold' },
  { id: 'd1', x: 1050, y: 170, value: 2500, name: 'The Midnight Diamond', kind: 'diamond' },
];

/** Guards: {name, waypoints, speed}. */
export const GUARDS = [
  { name: 'Marco', waypoints: [[500, 300], [780, 300], [780, 480], [500, 480]], speed: 70 },
  { name: 'Rosa', waypoints: [[150, 200], [350, 200], [350, 620], [150, 620]], speed: 60 },
  { name: 'Vince', waypoints: [[950, 250], [1200, 250], [1200, 620], [950, 620]], speed: 66 },
];

/** Cameras: {x, y, baseAngle, sweep, speed, range}. baseAngle is the centre of the sweep. */
export const CAMERAS = [
  { x: 640, y: 24, baseAngle: Math.PI / 2, sweep: 1.05, speed: 0.55, range: 225 },
  { x: 220, y: 24, baseAngle: Math.PI / 2, sweep: 0.9, speed: 0.7, range: 200 },
  { x: 1256, y: 200, baseAngle: Math.PI, sweep: 0.85, speed: 0.6, range: 210 },
];

export const EXIT_ZONE = { x: 590, y: 660, w: 100, h: 44 };
export const THIEF_START = { x: 640, y: 630 };
