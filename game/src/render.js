// The Midnight Vault — everything the player sees: the vault hall, the guards'
// raycast vision cones, the cameras, the loot, the HUD and every screen.
// One logical frame is 1280x768: a 48 px HUD bar on top, the 1280x720 room below.
import { ALARM, CAMERAS, COLOURS, EXIT_ZONE, FIELD, FURNITURE, GUARDS, LOOT_TARGET, SHADOWS, VISION, WALLS } from './config.js';
import { SCREEN_CAUGHT, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './world.js';

const VIEW = { width: 1280, height: 768 };
const HUD_H = 48;
const BLOCKERS = [...WALLS, ...FURNITURE];

function pointInBlocker(x, y) {
  for (const b of BLOCKERS) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
  }
  return false;
}

/** The visible part of a vision cone: rays march out until a wall stops them. */
function conePolygon(x, y, angle, halfAngle, range) {
  const rays = 26;
  const pts = [{ x, y }];
  for (let i = 0; i <= rays; i++) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    let px = x + Math.cos(a) * range;
    let py = y + Math.sin(a) * range;
    for (let t = 8; t <= range; t += 6) {
      const qx = x + Math.cos(a) * t;
      const qy = y + Math.sin(a) * t;
      if (pointInBlocker(qx, qy)) {
        px = qx;
        py = qy;
        break;
      }
    }
    pts.push({ x: px, y: py });
  }
  return pts;
}

function fmtMoney(n) {
  return '$' + n.toLocaleString('en-US');
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let offX = 0;
  let offY = 0;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    scale = Math.min(w / VIEW.width, h / VIEW.height);
    offX = (w - VIEW.width * scale) / 2;
    offY = (h - VIEW.height * scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  function toLogical(px, py) {
    return { x: (px - offX) / scale, y: (py - offY) / scale - HUD_H };
  }

  function poly(pts, fill) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function rect(x, y, w, h, fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  }

  function drawFloor() {
    rect(0, 0, FIELD.width, FIELD.height, COLOURS.floorA);
    // marble checker
    for (let ty = 0; ty < 9; ty++) {
      for (let tx = 0; tx < 16; tx++) {
        if ((tx + ty) % 2 === 0) rect(tx * 80, ty * 80, 80, 80, COLOURS.floorB);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= FIELD.width; x += 80) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FIELD.height); ctx.stroke();
    }
    for (let y = 0; y <= FIELD.height; y += 80) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.width, y); ctx.stroke();
    }
    // carpet runner (also a shadow zone: slower spotting)
    rect(440, 470, 400, 150, COLOURS.carpet);
    ctx.strokeStyle = COLOURS.carpetEdge;
    ctx.lineWidth = 3;
    ctx.strokeRect(440, 470, 400, 150);
    // shadow zones
    for (const s of SHADOWS) {
      ctx.fillStyle = 'rgba(6,8,14,0.45)';
      ctx.fillRect(s.x, s.y, s.w, s.h);
    }
    // room labels
    ctx.fillStyle = 'rgba(232,228,216,0.10)';
    ctx.font = 'bold 34px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('G A L L E R Y', 210, 680);
    ctx.fillText('V A U L T', 1070, 680);
    ctx.fillText('H A L L', 650, 90);
  }

  function drawExit(world) {
    const open = world.lootValue >= LOOT_TARGET;
    ctx.save();
    if (open) {
      ctx.shadowColor = COLOURS.exitGlow;
      ctx.shadowBlur = 22;
    }
    rect(EXIT_ZONE.x, EXIT_ZONE.y, EXIT_ZONE.w, EXIT_ZONE.h, open ? COLOURS.exit : '#1d5c34');
    ctx.restore();
    ctx.strokeStyle = open ? COLOURS.exitGlow : '#2a7a48';
    ctx.lineWidth = 2;
    ctx.strokeRect(EXIT_ZONE.x, EXIT_ZONE.y, EXIT_ZONE.w, EXIT_ZONE.h);
    ctx.fillStyle = '#eafff0';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(open ? 'EXIT — OPEN' : 'EXIT', EXIT_ZONE.x + EXIT_ZONE.w / 2, EXIT_ZONE.y + 28);
    if (!open) {
      ctx.fillStyle = COLOURS.dim;
      ctx.font = '12px Arial, sans-serif';
      ctx.fillText('needs ' + fmtMoney(LOOT_TARGET), EXIT_ZONE.x + EXIT_ZONE.w / 2, EXIT_ZONE.y - 6);
    }
  }

  function drawLoot(world) {
    for (const item of world.loot) {
      if (item.taken) continue;
      ctx.save();
      ctx.translate(item.x, item.y);
      if (item.kind === 'painting') {
        rect(-26, -18, 52, 36, COLOURS.caseFrame);
        rect(-22, -14, 44, 28, '#274b63');
        ctx.fillStyle = '#c96a3b';
        ctx.beginPath(); ctx.arc(-6, -2, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e8c85a';
        ctx.fillRect(6, 2, 12, 8);
      } else if (item.kind === 'gold') {
        ctx.shadowColor = COLOURS.lootGold;
        ctx.shadowBlur = 10;
        rect(-18, -6, 36, 12, '#d9a521');
        rect(-14, -16, 28, 12, COLOURS.lootGold);
        rect(-8, -26, 16, 12, '#ffe08a');
        ctx.shadowBlur = 0;
      } else {
        ctx.rotate(Math.PI / 4);
        ctx.shadowColor = COLOURS.lootDiamond;
        ctx.shadowBlur = 16;
        rect(-13, -13, 26, 26, COLOURS.lootDiamond);
        ctx.shadowBlur = 0;
        ctx.rotate(-Math.PI / 4);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-18, 0); ctx.lineTo(-8, 0);
        ctx.moveTo(8, 0); ctx.lineTo(18, 0);
        ctx.moveTo(0, -18); ctx.lineTo(0, -8);
        ctx.moveTo(0, 8); ctx.lineTo(0, 18);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = COLOURS.lootGold;
      ctx.font = 'bold 12px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(fmtMoney(item.value), item.x, item.y + 34);
    }
  }

  function drawFurniture() {
    for (const f of FURNITURE) {
      if (f.kind === 'case') {
        rect(f.x, f.y, f.w, f.h, COLOURS.caseFrame);
        ctx.fillStyle = 'rgba(159,196,216,0.55)';
        ctx.fillRect(f.x + 4, f.y + 4, f.w - 8, f.h - 8);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(f.x + 8, f.y + 6, f.w - 16, 3);
      } else if (f.kind === 'safe') {
        rect(f.x, f.y, f.w, f.h, COLOURS.safe);
        ctx.strokeStyle = '#565d6e';
        ctx.lineWidth = 2;
        ctx.strokeRect(f.x + 3, f.y + 3, f.w - 6, f.h - 6);
        ctx.fillStyle = '#c8cdd8';
        ctx.beginPath(); ctx.arc(f.x + f.w / 2, f.y + f.h / 2, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2b2f38';
        ctx.beginPath(); ctx.arc(f.x + f.w / 2, f.y + f.h / 2, 4, 0, Math.PI * 2); ctx.fill();
      } else if (f.kind === 'desk') {
        rect(f.x, f.y, f.w, f.h, COLOURS.desk);
        rect(f.x, f.y, f.w, 5, '#7a5a35');
        ctx.fillStyle = '#e8e4d8';
        ctx.fillRect(f.x + 10, f.y + 12, 22, 14);
        ctx.fillRect(f.x + f.w - 34, f.y + 14, 18, 12);
      } else if (f.kind === 'plant') {
        ctx.fillStyle = '#6b4a2a';
        ctx.beginPath(); ctx.arc(f.x + f.w / 2, f.y + f.h / 2 + 6, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = COLOURS.plant;
        ctx.beginPath(); ctx.arc(f.x + f.w / 2 - 6, f.y + f.h / 2 - 6, 10, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(f.x + f.w / 2 + 7, f.y + f.h / 2 - 8, 9, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(f.x + f.w / 2, f.y + f.h / 2 - 13, 9, 0, Math.PI * 2); ctx.fill();
      } else if (f.kind === 'pillar') {
        ctx.fillStyle = COLOURS.pillar;
        ctx.beginPath(); ctx.arc(f.x + f.w / 2, f.y + f.h / 2, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6a7192';
        ctx.beginPath(); ctx.arc(f.x + f.w / 2 - 4, f.y + f.h / 2 - 4, 9, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawWalls() {
    for (const w of WALLS) {
      rect(w.x, w.y, w.w, w.h, w.kind === 'vault' ? COLOURS.vaultWall : COLOURS.wall);
      ctx.fillStyle = COLOURS.wallTrim;
      if (w.h <= 16) ctx.fillRect(w.x, w.y + w.h - 3, w.w, 3);
      else ctx.fillRect(w.x + w.w - 3, w.y, 3, w.h);
    }
  }

  function drawCones(world) {
    for (const g of world.guards) {
      const fill = g.state === 'chase' ? COLOURS.coneChase : g.state === 'investigate' ? COLOURS.coneHot : COLOURS.cone;
      poly(conePolygon(g.x, g.y, g.angle, VISION.halfAngle, VISION.range), fill);
    }
    for (const cam of world.cameras) {
      const hot = canCamSee(world, cam);
      poly(conePolygon(cam.x, cam.y, cam.angle, VISION.camHalfAngle, cam.range), hot ? COLOURS.camConeHot : COLOURS.camCone);
    }
  }

  function canCamSee(world, cam) {
    const t = world.thief;
    const d = Math.hypot(t.x - cam.x, t.y - cam.y);
    if (d > cam.range) return false;
    const a = Math.atan2(t.y - cam.y, t.x - cam.x);
    let diff = a - cam.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) < VISION.camHalfAngle;
  }

  function drawGuard(g) {
    ctx.fillStyle = g.state === 'chase' ? '#7a1f1a' : COLOURS.guard;
    ctx.beginPath(); ctx.arc(g.x, g.y, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLOURS.guardCap;
    ctx.beginPath(); ctx.arc(g.x, g.y - 3, 9, Math.PI, 0); ctx.fill();
    ctx.fillRect(g.x - 9, g.y - 5, 18, 3);
    ctx.strokeStyle = '#d8d4c8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.x + Math.cos(g.angle) * 8, g.y + Math.sin(g.angle) * 8);
    ctx.lineTo(g.x + Math.cos(g.angle) * 17, g.y + Math.sin(g.angle) * 17);
    ctx.stroke();
    ctx.fillStyle = '#e8e4d8';
    ctx.font = 'bold 10px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.name, g.x, g.y - 22);
  }

  function drawCamera(cam) {
    ctx.fillStyle = '#22242e';
    ctx.beginPath(); ctx.arc(cam.x, cam.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e63c3c';
    ctx.beginPath(); ctx.arc(cam.x + Math.cos(cam.angle) * 4, cam.y + Math.sin(cam.angle) * 4, 3.5, 0, Math.PI * 2); ctx.fill();
  }

  function drawThief(thiefWorld) {
    const t = thiefWorld.thief;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(t.x + 3, t.y + 6, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLOURS.thief;
    ctx.beginPath(); ctx.arc(t.x, t.y, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = COLOURS.thiefTrim;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(t.x, t.y, 14, 0, Math.PI * 2); ctx.stroke();
    // white mask band across the eyes
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(t.x - 9, t.y - 4, 18, 6);
    ctx.fillStyle = '#14161d';
    ctx.beginPath(); ctx.arc(t.x - 4, t.y - 1, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(t.x + 4, t.y - 1, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = COLOURS.thiefTrim;
    ctx.beginPath();
    ctx.moveTo(t.x + Math.cos(t.angle) * 10, t.y + Math.sin(t.angle) * 10);
    ctx.lineTo(t.x + Math.cos(t.angle) * 17, t.y + Math.sin(t.angle) * 17);
    ctx.stroke();
  }

  function drawCoin(world) {
    if (world.coinFlight) {
      const f = world.coinFlight;
      const k = f.t / f.dur;
      const x = f.x0 + (f.x1 - f.x0) * k;
      const y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * 26;
      ctx.fillStyle = COLOURS.lootGold;
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    }
    if (world.coinLanded) {
      const blink = world.coinLanded.ttl < 1 ? (Math.floor(world.coinLanded.ttl * 6) % 2 === 0) : true;
      if (blink) {
        ctx.fillStyle = COLOURS.lootGold;
        ctx.beginPath(); ctx.arc(world.coinLanded.x, world.coinLanded.y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(242,194,48,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(world.coinLanded.x, world.coinLanded.y, 11, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }

  function drawParticles(world) {
    for (const p of world.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawHUD(world) {
    ctx.fillStyle = COLOURS.hud;
    ctx.fillRect(0, 0, VIEW.width, HUD_H);
    ctx.fillStyle = COLOURS.text;
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('LOOT  ' + fmtMoney(world.lootValue) + ' / ' + fmtMoney(LOOT_TARGET), 16, 30);
    // alarm meter
    const ax = 330;
    ctx.fillStyle = COLOURS.dim;
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText('ALARM', ax, 30);
    const bw = 230;
    ctx.fillStyle = '#262a38';
    ctx.fillRect(ax + 62, 14, bw, 20);
    const frac = world.alarm / 100;
    const grad = ctx.createLinearGradient(ax + 62, 0, ax + 62 + bw, 0);
    grad.addColorStop(0, '#2fae5f');
    grad.addColorStop(0.5, '#f2c230');
    grad.addColorStop(1, '#e63c3c');
    ctx.fillStyle = grad;
    ctx.fillRect(ax + 62, 14, bw * frac, 20);
    ctx.strokeStyle = '#565d6e';
    ctx.lineWidth = 1;
    ctx.strokeRect(ax + 62, 14, bw, 20);
    ctx.fillStyle = world.alarm >= ALARM.spottedAt ? '#ff6b5e' : COLOURS.text;
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillText(Math.round(world.alarm) + '%', ax + 62 + bw + 10, 30);
    // timer + coins + mute, right side
    ctx.fillStyle = COLOURS.text;
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'right';
    const mm = world.time;
    const mins = Math.floor(mm / 60);
    const secs = Math.floor(mm % 60);
    ctx.fillText(String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0'), 1085, 30);
    let coinStr = '';
    for (let i = 0; i < 3; i++) coinStr += i < world.coins ? '●' : '○';
    ctx.fillStyle = COLOURS.lootGold;
    ctx.fillText(coinStr, 1180, 30);
    ctx.fillStyle = COLOURS.dim;
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText('M mute', 1264, 30);
  }

  function panel(title, lines, accent) {
    const w = 560;
    const h = 120 + lines.length * 30;
    const x = (VIEW.width - w) / 2;
    const y = (VIEW.height - h) / 2;
    ctx.fillStyle = 'rgba(10,12,18,0.88)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = accent;
    ctx.font = 'bold 34px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, VIEW.width / 2, y + 52);
    ctx.fillStyle = COLOURS.text;
    ctx.font = '16px Arial, sans-serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, VIEW.width / 2, y + 92 + i * 30);
    });
  }

  function drawTitle(world) {
    ctx.fillStyle = 'rgba(8,10,16,0.66)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    panel('THE MIDNIGHT VAULT', [
      'One thief. One vault. Six treasures. Three guards who never blink.',
      'Move: WASD / arrows      Toss a coin: click (distracts a guard)',
      'Grab ' + fmtMoney(LOOT_TARGET) + ' of loot, then slip out through the EXIT.',
      'Stay out of the yellow cones. Hide in the dark carpet when the alarm climbs.',
      'The cameras see in red. If a guard touches you, it is over.',
      world.best > 0 ? 'Best haul so far: ' + fmtMoney(world.best) : 'No haul yet — tonight the vault is yours.',
      'Press ENTER or click to begin',
    ], COLOURS.lootGold);
  }

  function drawBanner() {
    ctx.fillStyle = 'rgba(10,12,18,0.82)';
    ctx.fillRect(300, 56, 680, 76);
    ctx.strokeStyle = COLOURS.lootGold;
    ctx.lineWidth = 2;
    ctx.strokeRect(300, 56, 680, 76);
    ctx.fillStyle = COLOURS.lootGold;
    ctx.font = 'bold 34px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE MIDNIGHT VAULT', 640, 92);
    ctx.fillStyle = COLOURS.text;
    ctx.font = '15px Arial, sans-serif';
    ctx.fillText('Grab ' + fmtMoney(LOOT_TARGET) + ' of loot — dodge the cones — slip out the EXIT', 640, 118);
  }

  function draw(world, opts = {}) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0d13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offX, offY);
    drawHUD(world);
    ctx.save();
    ctx.translate(0, HUD_H);
    drawFloor();
    drawExit(world);
    drawLoot(world);
    drawFurniture();
    drawWalls();
    drawCones(world);
    drawCoin(world);
    for (const g of world.guards) drawGuard(g);
    for (const cam of world.cameras) drawCamera(cam);
    drawThief(world);
    drawParticles(world);
    ctx.restore();

    // alarm vignette + SPOTTED flash
    if (world.alarm >= ALARM.spottedAt || world.spottedFlash > 0) {
      const a = Math.max(world.spottedFlash * 0.5, world.alarm >= ALARM.spottedAt ? 0.22 + 0.1 * Math.sin(performance.now() / 180) : 0);
      ctx.strokeStyle = `rgba(230,60,50,${Math.max(0, a)})`;
      ctx.lineWidth = 14;
      ctx.strokeRect(4, 4, VIEW.width - 8, VIEW.height - 8);
      if (world.spottedFlash > 0.25) {
        ctx.fillStyle = `rgba(230,60,50,${world.spottedFlash})`;
        ctx.font = 'bold 30px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SPOTTED!', VIEW.width / 2, 120);
      }
    }

    if (opts.banner) drawBanner();
    if (world.screen === SCREEN_TITLE) drawTitle(world);
    else if (world.screen === SCREEN_WIN && world.winStats) {
      panel('HEIST COMPLETE!', [
        'You slipped out with ' + fmtMoney(world.winStats.loot) + ' in ' + fmtTime(world.winStats.time) + '.',
        'Rating: ' + world.winStats.rating + '     Loudest alarm: ' + Math.round(world.winStats.maxAlarm) + '%',
        'Press R to run it again',
      ], COLOURS.exitGlow);
    } else if (world.screen === SCREEN_CAUGHT) {
      panel('CAUGHT!', [
        (world.caughtBy || 'A guard') + ' laid a hand on you under the vault lights.',
        'You got away with ' + fmtMoney(world.lootValue) + ' — the rest stays in the vault.',
        'Press R to try again',
      ], '#e63c3c');
    } else if (world.screen === SCREEN_PAUSED) {
      panel('PAUSED', ['The vault waits. The guards do not sleep.', 'Esc to resume'], COLOURS.dim);
    }
  }

  return { resize, toLogical, draw };
}
