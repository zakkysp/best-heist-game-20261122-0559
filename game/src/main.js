// The Midnight Vault — boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast one),
// and the renderer paints what is there. The game moves between five screens:
// title, play, paused, win and caught.
//
// ?seed=N fixes the night's randomness. ?shot=start|play|alarm|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createWorld, resetWorld, SCREEN_CAUGHT, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, updateWorld } from './world.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;
const BEST_KEY = 'midnight-vault-best';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const audio = createAudio();
const input = createInput(canvas, (px, py) => renderer.toLogical(px, py));
const world = createWorld(seed);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function writeBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch { /* private mode: the night goes on without a record */ }
}

world.best = readBest();

// Debug handle for play-testing: the game's own state, readable from the console.
window.__game = { world, startGame, backToTitle };

function startGame() {
  audio.unlock();
  resetWorld(world, Math.floor(Math.random() * 4294967296));
  world.best = readBest();
  world.screen = SCREEN_PLAY;
  status.textContent = 'In the vault. Grab $4,000 of loot and reach the EXIT.';
}

function backToTitle() {
  resetWorld(world, Math.floor(Math.random() * 4294967296));
  world.best = readBest();
  world.screen = SCREEN_TITLE;
}

if (shot) {
  const banner = stageShot(world, shot);
  renderer.draw(world, { banner: banner === 'banner' });
  renderer.draw(world, { banner: banner === 'banner' });
  window.__shotReady = true;
} else {
  let last = performance.now();
  let acc = 0;

  function frame(now) {
    const dt = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;

    const action = input.actionPressed();
    if (action === ACTION_MUTE) {
      audio.toggleMute();
      input.consumePresses();
    } else if (world.screen === SCREEN_TITLE) {
      if (action === ACTION_CONFIRM || input.takeClicks().length > 0) {
        startGame();
      }
      input.consumePresses();
    } else if (world.screen === SCREEN_PLAY) {
      if (action === ACTION_PAUSE) {
        world.screen = SCREEN_PAUSED;
      }
      input.consumePresses();
      acc += dt;
      while (acc >= STEP) {
        updateWorld(world, STEP, input, audio);
        acc -= STEP;
        if (world.screen !== SCREEN_PLAY) break;
      }
      if (world.screen === SCREEN_WIN && world.winStats) {
        if (world.winStats.loot > world.best) {
          world.best = world.winStats.loot;
          writeBest(world.best);
        }
      }
    } else if (world.screen === SCREEN_PAUSED) {
      if (action === ACTION_PAUSE || action === ACTION_CONFIRM) {
        world.screen = SCREEN_PLAY;
      }
      input.consumePresses();
    } else if (world.screen === SCREEN_WIN || world.screen === SCREEN_CAUGHT) {
      if (action === ACTION_RESTART) {
        startGame();
      } else if (action === ACTION_CONFIRM) {
        backToTitle();
      }
      input.consumePresses();
    } else {
      input.consumePresses();
    }

    renderer.draw(world);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
