// The Midnight Vault — the whole simulation: the thief, three patrolling guards,
// three sweeping cameras, loot, the alarm and the coin-toss distraction.
// Screens live here too (title / play / paused / win / caught) so a screenshot
// can stage any of them from one state object.
import {
  ALARM, CAMERAS, COIN_RANGE, COLOURS, EXIT_ZONE, FIELD, FURNITURE, GUARD,
  GUARDS, LOOT, LOOT_TARGET, SHADOWS, START_COINS, THIEF, THIEF_START, VISION, WALLS,
} from './config.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_CAUGHT = 'caught';

const BLOCKERS = [...WALLS, ...FURNITURE];

function circleHitsRect(x, y, r, rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy < r * r;
}

function hitsAnyBlocker(x, y, r) {
  for (const b of BLOCKERS) if (circleHitsRect(x, y, r, b)) return true;
  return false;
}

/** Move a circle, sliding along walls: x first, then y. */
function moveCircle(e, dx, dy, r) {
  if (dx !== 0 && !hitsAnyBlocker(e.x + dx, e.y, r)) e.x += dx;
  if (dy !== 0 && !hitsAnyBlocker(e.x, e.y + dy, r)) e.y += dy;
}

function segHitsRect(x0, y0, x1, y1, rect) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  let tmin = 0;
  let tmax = 1;
  for (let i = 0; i < 2; i++) {
    const d = i === 0 ? dx : dy;
    const o = i === 0 ? x0 : y0;
    const lo = i === 0 ? rect.x : rect.y;
    const hi = i === 0 ? rect.x + rect.w : rect.y + rect.h;
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return false;
    } else {
      let t1 = (lo - o) / d;
      let t2 = (hi - o) / d;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
  }
  return true;
}

function lineOfSight(x0, y0, x1, y1) {
  for (const b of BLOCKERS) {
    // A blocker the eye stands inside never blocks its own view.
    if (x0 > b.x && x0 < b.x + b.w && y0 > b.y && y0 < b.y + b.h) continue;
    if (segHitsRect(x0, y0, x1, y1, b)) return false;
  }
  return true;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function inShadow(x, y) {
  return SHADOWS.some((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function createWorld(seed) {
  const random = createRandom(seed);
  const loot = LOOT.map((l) => ({ ...l, taken: false }));
  const guards = GUARDS.map((g, i) => ({
    name: g.name,
    waypoints: g.waypoints,
    baseSpeed: g.speed,
    x: g.waypoints[0][0],
    y: g.waypoints[0][1],
    angle: 0,
    wpIndex: 1,
    wait: 0,
    state: 'patrol',
    target: null,
    lookTimer: 0,
    lostTimer: 0,
    lastSeen: null,
    index: i,
  }));
  const cameras = CAMERAS.map((c, i) => ({ ...c, angle: c.baseAngle, phase: i * 1.7 }));

  return {
    random,
    screen: SCREEN_TITLE,
    time: 0,
    alarm: 0,
    maxAlarm: 0,
    loot,
    lootValue: 0,
    coins: START_COINS,
    coinFlight: null,
    coinLanded: null,
    thief: { x: THIEF_START.x, y: THIEF_START.y, vx: 0, vy: 0, angle: -Math.PI / 2 },
    guards,
    cameras,
    particles: [],
    sirenTimer: 0,
    spottedFlash: 0,
    caughtBy: null,
    winStats: null,
    best: 0,
    heat: 1,
  };
}

function spawnParticles(world, x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = world.random.next() * Math.PI * 2;
    const sp = 40 + world.random.next() * 120;
    world.particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.5 + world.random.next() * 0.4,
      maxLife: 0.9,
      color,
      size: 2 + world.random.next() * 3,
    });
  }
}

function canSee(world, eyeX, eyeY, eyeAngle, range, halfAngle) {
  const t = world.thief;
  const d = dist(eyeX, eyeY, t.x, t.y);
  if (d > range) return false;
  if (d < 55) return lineOfSight(eyeX, eyeY, t.x, t.y); // bumping into someone gives you away
  const ang = Math.atan2(t.y - eyeY, t.x - eyeX);
  if (Math.abs(angleDiff(ang, eyeAngle)) > halfAngle) return false;
  return lineOfSight(eyeX, eyeY, t.x, t.y);
}

function guardSeesThief(world, guard) {
  return canSee(world, guard.x, guard.y, guard.angle, VISION.range, VISION.halfAngle);
}

function updateGuard(world, guard, dt, audio) {
  const t = world.thief;
  const sees = guardSeesThief(world, guard);
  const speedMul = world.heat;

  if (sees) {
    guard.lastSeen = { x: t.x, y: t.y };
    guard.lostTimer = 0;
    if (guard.state !== 'chase') {
      guard.state = 'chase';
      if (world.alarm < ALARM.spottedAt) world.alarm = ALARM.spottedAt;
      world.spottedFlash = 1;
      audio.spotted();
    }
    const rate = ALARM.guardPerSec * (inShadow(t.x, t.y) ? ALARM.shadowFactor : 1);
    world.alarm = Math.min(100, world.alarm + rate * dt);
  }

  const chasing = guard.state === 'chase' && (sees || world.alarm >= ALARM.spottedAt);
  if (guard.state === 'chase' && !chasing) {
    guard.lostTimer += dt;
    if (guard.lostTimer > 2) {
      guard.state = 'patrol';
      guard.target = null;
      // resume at the nearest waypoint
      let best = 0;
      let bestD = Infinity;
      guard.waypoints.forEach((w, i) => {
        const d = dist(guard.x, guard.y, w[0], w[1]);
        if (d < bestD) { bestD = d; best = i; }
      });
      guard.wpIndex = best;
    }
  }

  let speed = 0;
  let tx = null;
  let ty = null;
  if (guard.state === 'chase' && guard.lastSeen) {
    speed = GUARD.chaseSpeed * speedMul;
    tx = guard.lastSeen.x;
    ty = guard.lastSeen.y;
    if (dist(guard.x, guard.y, tx, ty) < 12) guard.lastSeen = null;
  } else if (guard.state === 'investigate' && guard.target) {
    speed = GUARD.investigateSpeed * speedMul;
    tx = guard.target.x;
    ty = guard.target.y;
    if (dist(guard.x, guard.y, tx, ty) < 10) {
      guard.wait += dt;
      if (guard.wait > 3) {
        guard.state = 'patrol';
        guard.target = null;
        guard.wait = 0;
      }
    }
  } else {
    if (guard.wait > 0) {
      guard.wait -= dt;
      if (guard.wait <= 0) {
        guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
      }
    } else {
      const w = guard.waypoints[guard.wpIndex];
      speed = guard.baseSpeed * speedMul;
      tx = w[0];
      ty = w[1];
      if (dist(guard.x, guard.y, tx, ty) < 8) guard.wait = 0.9;
    }
  }

  if (tx !== null && speed > 0) {
    const a = Math.atan2(ty - guard.y, tx - guard.x);
    guard.angle = a;
    moveCircle(guard, Math.cos(a) * speed * dt, Math.sin(a) * speed * dt, GUARD.radius);
  } else if (guard.state === 'investigate' && guard.wait > 0) {
    guard.angle += dt * 0.8; // look around while investigating
  }

  // Caught: a chasing guard lays a hand on the thief.
  if (guard.state === 'chase' && dist(guard.x, guard.y, t.x, t.y) < GUARD.catchDist) {
    world.screen = SCREEN_CAUGHT;
    world.caughtBy = guard.name;
    audio.caught();
  }
  // Walked straight into a patrolling guard: instant spot.
  if (guard.state !== 'chase' && dist(guard.x, guard.y, t.x, t.y) < GUARD.catchDist) {
    guard.state = 'chase';
    guard.lastSeen = { x: t.x, y: t.y };
    world.alarm = Math.max(world.alarm, ALARM.spottedAt + 10);
    world.spottedFlash = 1;
    audio.spotted();
  }
}

function updateCamera(world, cam, dt, audio) {
  cam.angle = cam.baseAngle + Math.sin(world.time * cam.speed + cam.phase) * cam.sweep;
  if (canSee(world, cam.x, cam.y, cam.angle, VISION.camRange, VISION.camHalfAngle)) {
    const rate = ALARM.camPerSec * (inShadow(world.thief.x, world.thief.y) ? ALARM.shadowFactor : 1);
    const before = world.alarm;
    world.alarm = Math.min(100, world.alarm + rate * dt);
    if (before < ALARM.spottedAt && world.alarm >= ALARM.spottedAt) {
      world.spottedFlash = 1;
      audio.spotted();
    }
  }
}

export function updateWorld(world, dt, input, audio) {
  if (world.screen !== SCREEN_PLAY) return;
  world.time += dt;
  const thief = world.thief;

  // --- thief movement ---
  const mv = input.moveVector();
  const targetVx = mv.x * THIEF.speed;
  const targetVy = mv.y * THIEF.speed;
  thief.vx += (targetVx - thief.vx) * Math.min(1, THIEF.accel * dt);
  thief.vy += (targetVy - thief.vy) * Math.min(1, THIEF.accel * dt);
  if (Math.abs(thief.vx) > 4 || Math.abs(thief.vy) > 4) {
    thief.angle = Math.atan2(thief.vy, thief.vx);
  }
  moveCircle(thief, thief.vx * dt, thief.vy * dt, THIEF.radius);
  thief.x = Math.max(16 + THIEF.radius, Math.min(FIELD.width - 16 - THIEF.radius, thief.x));
  thief.y = Math.max(16 + THIEF.radius, Math.min(FIELD.height - 16 - THIEF.radius, thief.y));

  // --- coin toss (mouse click) ---
  for (const click of input.takeClicks()) {
    if (world.coins > 0 && !world.coinFlight) {
      let dx = click.x - thief.x;
      let dy = click.y - thief.y;
      const d = Math.hypot(dx, dy);
      if (d > COIN_RANGE) {
        dx = (dx / d) * COIN_RANGE;
        dy = (dy / d) * COIN_RANGE;
      }
      world.coinFlight = { x0: thief.x, y0: thief.y, x1: thief.x + dx, y1: thief.y + dy, t: 0, dur: 0.35 };
      world.coins -= 1;
    }
  }
  if (world.coinFlight) {
    const f = world.coinFlight;
    f.t += dt;
    if (f.t >= f.dur) {
      world.coinLanded = { x: f.x1, y: f.y1, ttl: 4 };
      world.coinFlight = null;
      audio.coin();
      spawnParticles(world, f.x1, f.y1, '#f2c230', 6);
      let best = null;
      let bestD = 320;
      for (const g of world.guards) {
        const d = dist(g.x, g.y, f.x1, f.y1);
        if (d < bestD) { bestD = d; best = g; }
      }
      if (best && best.state !== 'chase') {
        best.state = 'investigate';
        best.target = { x: f.x1, y: f.y1 };
        best.wait = 0;
      }
    }
  }
  if (world.coinLanded) {
    world.coinLanded.ttl -= dt;
    if (world.coinLanded.ttl <= 0) world.coinLanded = null;
  }

  // --- loot pickup ---
  for (const item of world.loot) {
    if (!item.taken && dist(thief.x, thief.y, item.x, item.y) < 34) {
      item.taken = true;
      world.lootValue += item.value;
      world.heat = 1 + 0.05 * world.loot.filter((l) => l.taken).length;
      spawnParticles(world, item.x, item.y, item.kind === 'diamond' ? COLOURS.lootDiamond : COLOURS.lootGold, 14);
      if (item.kind === 'diamond') audio.diamond();
      else audio.pickup();
    }
  }

  // --- guards and cameras ---
  let anyoneSees = false;
  for (const g of world.guards) {
    const before = world.screen;
    updateGuard(world, g, dt, audio);
    if (world.screen === SCREEN_CAUGHT) return;
    if (guardSeesThief(world, g)) anyoneSees = true;
    if (before !== world.screen) return;
  }
  for (const cam of world.cameras) updateCamera(world, cam, dt, audio);

  // --- alarm decay + siren ---
  if (!anyoneSees) {
    let camSees = false;
    for (const cam of world.cameras) {
      if (canSee(world, cam.x, cam.y, cam.angle, VISION.camRange, VISION.camHalfAngle)) { camSees = true; break; }
    }
    if (!camSees) world.alarm = Math.max(0, world.alarm - ALARM.decayPerSec * dt);
  }
  world.maxAlarm = Math.max(world.maxAlarm, world.alarm);
  if (world.alarm >= ALARM.spottedAt) {
    world.sirenTimer += dt;
    if (world.sirenTimer > 0.55) {
      world.sirenTimer = 0;
      audio.sirenTick();
    }
  }
  if (world.spottedFlash > 0) world.spottedFlash = Math.max(0, world.spottedFlash - dt * 1.4);

  // --- particles ---
  for (const p of world.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);

  // --- win: target loot in hand, reach the exit ---
  if (world.lootValue >= LOOT_TARGET
    && thief.x >= EXIT_ZONE.x && thief.x <= EXIT_ZONE.x + EXIT_ZONE.w
    && thief.y >= EXIT_ZONE.y && thief.y <= EXIT_ZONE.y + EXIT_ZONE.h) {
    world.screen = SCREEN_WIN;
    const rating = world.time <= 150 && world.maxAlarm < 80 ? 'S'
      : world.time <= 240 ? 'A' : 'B';
    world.winStats = { time: world.time, loot: world.lootValue, rating, maxAlarm: world.maxAlarm };
    audio.win();
  }

  audio.update(dt, world.alarm);
}

export function resetWorld(world, seed) {
  const fresh = createWorld(seed);
  fresh.best = world.best;
  Object.keys(fresh).forEach((k) => { world[k] = fresh[k]; });
}
