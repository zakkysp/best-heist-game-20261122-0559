// Stage a fixed scene for a screenshot: ?shot=start|play|alarm|end (with &seed=N).
// The scene is painted twice and window.__shotReady is set, exactly like the
// kit's starter. Nothing here changes how the game plays.
import { SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_WIN } from './world.js';

function setGuard(world, i, x, y, angle, state) {
  const g = world.guards[i];
  g.x = x;
  g.y = y;
  g.angle = angle;
  g.state = state;
  g.wait = 0;
  if (state === 'chase') g.lastSeen = { x: world.thief.x, y: world.thief.y };
}

function setCamera(world, i, angle) {
  world.cameras[i].angle = angle;
}

export function stageShot(world, name) {
  const t = world.thief;
  if (name === 'start') {
    // The full room at rest: thief by the exit, guards mid-patrol, cones sweeping.
    world.screen = SCREEN_PLAY;
    t.x = 640; t.y = 630; t.angle = -Math.PI / 2;
    world.guards[0].x = 640; world.guards[0].y = 300; world.guards[0].angle = Math.PI / 2;
    world.guards[1].x = 250; world.guards[1].y = 420; world.guards[1].angle = 0;
    world.guards[2].x = 1050; world.guards[2].y = 480; world.guards[2].angle = -Math.PI / 2;
    setCamera(world, 0, Math.PI / 2 + 0.5);
    setCamera(world, 1, Math.PI / 2 - 0.4);
    setCamera(world, 2, Math.PI - 0.3);
    world.alarm = 0;
    world.time = 0;
    return 'banner';
  }
  if (name === 'play') {
    // Mid-heist: the thief lifts the hall gold while a cone sweeps past.
    world.screen = SCREEN_PLAY;
    t.x = 716; t.y = 250; t.angle = Math.PI / 2;
    world.loot[0].taken = true; // one painting already pocketed
    world.lootValue = 500;
    world.coins = 2;
    world.time = 74;
    world.alarm = 34;
    setGuard(world, 0, 640, 340, Math.PI / 2 + 0.25, 'patrol');
    setGuard(world, 1, 300, 300, Math.PI, 'patrol');
    setGuard(world, 2, 1000, 560, -Math.PI / 2, 'patrol');
    setCamera(world, 0, Math.PI / 2 + 0.6);
    setCamera(world, 1, Math.PI / 2);
    setCamera(world, 2, Math.PI + 0.2);
    return null;
  }
  if (name === 'alarm') {
    // The vault is screaming: Vince is on the thief, alarm at 88.
    world.screen = SCREEN_PLAY;
    t.x = 1000; t.y = 300; t.angle = -Math.PI / 2;
    world.loot[0].taken = true;
    world.loot[3].taken = true;
    world.lootValue = 1500;
    world.coins = 1;
    world.time = 132;
    world.alarm = 88;
    world.maxAlarm = 88;
    world.spottedFlash = 0.9;
    setGuard(world, 0, 700, 480, Math.PI, 'patrol');
    setGuard(world, 1, 320, 500, 0, 'patrol');
    setGuard(world, 2, 960, 260, 0.35, 'chase');
    setCamera(world, 0, Math.PI / 2 - 0.5);
    setCamera(world, 1, Math.PI / 2 + 0.3);
    setCamera(world, 2, Math.PI - 0.6);
    return null;
  }
  if (name === 'end') {
    // The getaway: vault empty-handed no more, rating S on the board.
    world.screen = SCREEN_WIN;
    t.x = 640; t.y = 648; t.angle = -Math.PI / 2;
    for (const item of world.loot) item.taken = true;
    world.lootValue = 6000;
    world.coins = 1;
    world.time = 187;
    world.maxAlarm = 62;
    world.winStats = { time: 187, loot: 6000, rating: 'S', maxAlarm: 62 };
    world.alarm = 12;
    world.guards[0].x = 500; world.guards[0].y = 300; world.guards[0].angle = 0;
    world.guards[1].x = 200; world.guards[1].y = 300; world.guards[1].angle = Math.PI;
    world.guards[2].x = 1100; world.guards[2].y = 500; world.guards[2].angle = Math.PI / 2;
    setCamera(world, 0, Math.PI / 2);
    setCamera(world, 1, Math.PI / 2);
    setCamera(world, 2, Math.PI);
    return null;
  }
  return null;
}
