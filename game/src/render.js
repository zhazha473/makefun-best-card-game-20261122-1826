// Everything SIMMER paints: the warm wooden table, the two cooks, the pots, the cards
// and every screen. All art is drawn procedurally on a 1280x800 canvas — no image files.
import { FLAVOURS } from './cards.js';
import { CHEF_NAMES } from './rules.js';

export const VIEW_W = 1280;
export const VIEW_H = 800;

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'playing';
export const SCREEN_ROUND_END = 'roundEnd';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSS = 'loss';
export const SCREEN_PAUSED = 'pause';
export const SCREEN_HOWTO = 'howto';

const HAND_CARD_W = 148;
const HAND_CARD_H = 204;
const POT_CARD_W = 104;
const POT_CARD_H = 146;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = trial;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// The four flavour shapes: a honey drop, a citrus slice, a chilli and a mushroom.
export function drawFlavourIcon(ctx, shape, cx, cy, size, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  if (shape === 'drop') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.bezierCurveTo(cx + size * 0.9, cy - size * 0.1, cx + size * 0.7, cy + size * 0.8, cx, cy + size * 0.8);
    ctx.bezierCurveTo(cx - size * 0.7, cy + size * 0.8, cx - size * 0.9, cy - size * 0.1, cx, cy - size);
    ctx.fill();
    ctx.stroke();
  } else if (shape === 'citrus') {
    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#fff8e6';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i += 1) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * size * 0.85, cy + Math.sin(a) * size * 0.85);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  } else if (shape === 'chilli') {
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.4, cy - size * 0.8);
    ctx.quadraticCurveTo(cx - size * 1.1, cy + size * 0.4, cx - size * 0.2, cy + size);
    ctx.quadraticCurveTo(cx + size * 0.7, cy + size * 0.9, cx + size * 0.8, cy - size * 0.1);
    ctx.quadraticCurveTo(cx + size * 0.5, cy - size * 0.6, cx - size * 0.4, cy - size * 0.8);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#3e6b2f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.2, cy - size * 0.8);
    ctx.quadraticCurveTo(cx + size * 0.3, cy - size * 1.3, cx + size * 0.7, cy - size * 1.1);
    ctx.stroke();
  } else {
    // mushroom
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.15, size * 0.95, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff8e6';
    ctx.fillRect(cx - size * 0.3, cy - size * 0.1, size * 0.6, size * 0.85);
    ctx.strokeRect(cx - size * 0.3, cy - size * 0.1, size * 0.6, size * 0.85);
  }
  ctx.restore();
}

function drawCardBack(ctx, x, y, w, h) {
  roundRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = '#8f1d1a';
  ctx.fill();
  ctx.strokeStyle = '#f2b705';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.save();
  roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 8);
  ctx.clip();
  ctx.fillStyle = 'rgba(242,183,5,0.25)';
  for (let i = -h; i < w; i += 26) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h, y);
    ctx.lineTo(x + i + h + 12, y);
    ctx.lineTo(x + i + 12, y + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#ffe9a8';
  ctx.font = `bold ${Math.round(w * 0.16)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('SIMMER', x + w / 2, y + h / 2);
}

function drawCard(ctx, card, x, y, w, h, options = {}) {
  const { selected = false, dimmed = false, faceDown = false } = options;
  if (faceDown) {
    drawCardBack(ctx, x, y, w, h);
    return;
  }
  const flavour = card.flavour ? FLAVOURS[card.flavour] : null;
  const top = flavour ? flavour.colour : '#8d6e9e';
  ctx.save();
  if (dimmed) ctx.globalAlpha = 0.72;
  if (selected) {
    ctx.shadowColor = '#ffd34d';
    ctx.shadowBlur = 22;
  }
  roundRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = '#fff8e6';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = selected ? '#f2b705' : '#5a3a28';
  ctx.lineWidth = selected ? 4 : 2;
  ctx.stroke();
  // Colour band with the flavour shape and the big value.
  roundRect(ctx, x + 4, y + 4, w - 8, h * 0.42, 9);
  ctx.fillStyle = top;
  ctx.fill();
  if (flavour) drawFlavourIcon(ctx, flavour.shape, x + w / 2, y + h * 0.2, Math.min(w, h) * 0.16, '#fff8e6');
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(h * 0.17)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (card.kind === 'ingredient') ctx.fillText(String(card.value), x + w / 2, y + h * 0.36);
  else if (card.kind === 'dish') ctx.fillText(`${card.value} dmg`, x + w / 2, y + h * 0.36);
  else ctx.fillText('★', x + w / 2, y + h * 0.36);
  // Name and kind.
  ctx.fillStyle = '#2b1a12';
  ctx.font = `bold ${Math.round(w * 0.095)}px system-ui, sans-serif`;
  const nameLines = wrapText(ctx, card.name, w - 16);
  nameLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, x + w / 2, y + h * 0.52 + i * Math.round(w * 0.11));
  });
  ctx.fillStyle = flavour ? flavour.dark : '#4c3a5e';
  ctx.font = `${Math.round(w * 0.085)}px system-ui, sans-serif`;
  const kindLabel = card.kind === 'ingredient'
    ? `${FLAVOURS[card.flavour].name} ingredient`
    : card.kind === 'dish' ? `${FLAVOURS[card.flavour].name} dish` : 'Spice action';
  ctx.fillText(kindLabel, x + w / 2, y + h * 0.74);
  ctx.fillStyle = '#5a3a28';
  ctx.font = `${Math.round(w * 0.08)}px system-ui, sans-serif`;
  const textLines = wrapText(ctx, card.text, w - 14);
  textLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, x + w / 2, y + h * 0.82 + i * Math.round(w * 0.09));
  });
  // Heat cost badge, bottom-right: a red ember with the Heat cost inside.
  ctx.fillStyle = '#d64541';
  ctx.beginPath();
  ctx.arc(x + w - 16, y + h - 16, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold 15px system-ui, sans-serif`;
  ctx.fillText(String(card.cost), x + w - 16, y + h - 15);
  ctx.restore();
}

function drawCook(ctx, x, y, radius, name, favour, stars, shield, isYou) {
  ctx.save();
  // Chef hat.
  ctx.fillStyle = '#fff8e6';
  ctx.beginPath();
  ctx.arc(x - radius * 0.45, y - radius * 0.75, radius * 0.42, 0, Math.PI * 2);
  ctx.arc(x, y - radius * 0.95, radius * 0.5, 0, Math.PI * 2);
  ctx.arc(x + radius * 0.45, y - radius * 0.75, radius * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - radius * 0.85, y - radius * 0.85, radius * 1.7, radius * 0.35);
  // Face.
  ctx.fillStyle = isYou ? '#f6c89f' : '#e8b48a';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5a3a28';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Eyes and smile.
  ctx.fillStyle = '#2b1a12';
  ctx.beginPath();
  ctx.arc(x - radius * 0.35, y - radius * 0.1, radius * 0.09, 0, Math.PI * 2);
  ctx.arc(x + radius * 0.35, y - radius * 0.1, radius * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y + radius * 0.25, radius * 0.4, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // Moustache for Brine.
  if (!isYou) {
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.55, y + radius * 0.35);
    ctx.quadraticCurveTo(x, y + radius * 0.55, x + radius * 0.55, y + radius * 0.35);
    ctx.stroke();
  }
  // Name, Favour and Stars.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff8e6';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(name, x, y + radius + 26);
  ctx.font = `bold 26px system-ui, sans-serif`;
  ctx.fillStyle = favour <= 6 ? '#ff8a7a' : '#ffd34d';
  ctx.fillText(`♥ ${favour} Favour`, x, y + radius + 56);
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = '#ffd34d';
  ctx.fillText('★'.repeat(stars) + '☆'.repeat(Math.max(0, 2 - stars)), x, y + radius + 82);
  if (shield) {
    ctx.fillStyle = '#7fb069';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('Shield up', x, y + radius + 106);
  }
  ctx.restore();
}

function drawPot(ctx, x, y, w, h, cards, label) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2 + 14, h / 2 + 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#1d1210';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 8, h / 2 - 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff8e6';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y - 8);
  ctx.restore();
  return { x, y, w, h };
}

function drawSteam(ctx, x, y, now) {
  ctx.save();
  for (let i = 0; i < 5; i += 1) {
    const phase = ((now / 1400) + i * 0.2) % 1;
    const sx = x + Math.sin((now / 700) + i * 1.7) * 12;
    const sy = y - phase * 46;
    ctx.globalAlpha = 0.35 * (1 - phase);
    ctx.fillStyle = '#fff8e6';
    ctx.beginPath();
    ctx.arc(sx, sy, 5 + phase * 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawConfetti(ctx, particles) {
  ctx.save();
  for (const p of particles) {
    ctx.fillStyle = p.colour;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillRect(-5, -3, 10, 6);
    ctx.rotate(-p.rotation);
    ctx.translate(-p.x, -p.y);
  }
  ctx.restore();
}

function centrePanel(ctx, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(20,10,6,0.82)';
  roundRect(ctx, 270, 190, 740, 420, 18);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 38px system-ui, sans-serif';
  ctx.fillText(title, 640, 270);
  ctx.fillStyle = '#fff8e6';
  ctx.font = '21px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, 640, 330 + i * 34));
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillStyle = '#ffd34d';
  ctx.fillText('Click or press Enter to continue — R starts a new match', 640, 560);
  ctx.restore();
}

// Where every clickable thing sits, so input.js and the renderer agree.
export function layoutFor(state) {
  const you = state.you;
  const brine = state.brine;
  const handW = HAND_CARD_W;
  const handH = HAND_CARD_H;
  const handGap = 10;
  const handTotal = you.hand.length * handW + Math.max(0, you.hand.length - 1) * handGap;
  const handX = (VIEW_W - handTotal) / 2;
  const handY = VIEW_H - handH - 40;
  const hand = you.hand.map((card, i) => ({
    card, x: handX + i * (handW + handGap), y: handY, w: handW, h: handH,
  }));
  const brineTotal = brine.hand.length * 92 + Math.max(0, brine.hand.length - 1) * 8;
  const brineX = (VIEW_W - brineTotal) / 2;
  const brineHand = brine.hand.map((card, i) => ({
    card, x: brineX + i * 100, y: 84, w: 92, h: 128,
  }));
  const potW = POT_CARD_W * 3 + 24;
  const potH = POT_CARD_H;
  const youPot = { x: (VIEW_W - potW) / 2, y: 470, w: potW, h: potH };
  const brinePot = { x: (VIEW_W - potW) / 2, y: 250, w: potW, h: potH };
  return { hand, brineHand, youPot, brinePot, handW, handH };
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;

  function drawTable() {
    const wall = ctx.createLinearGradient(0, 0, 0, 170);
    wall.addColorStop(0, '#3a2418');
    wall.addColorStop(1, '#5a3a28');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, VIEW_W, 170);
    const wood = ctx.createLinearGradient(0, 170, 0, VIEW_H);
    wood.addColorStop(0, '#8a5a33');
    wood.addColorStop(0.5, '#7a4e2c');
    wood.addColorStop(1, '#5f3a20');
    ctx.fillStyle = wood;
    ctx.fillRect(0, 170, VIEW_W, VIEW_H - 170);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 2;
    for (let y = 230; y < VIEW_H; y += 86) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(VIEW_W, y);
      ctx.stroke();
    }
    // Warm string lights along the top, just under the HUD bar.
    for (let i = 0; i < 12; i += 1) {
      const x = 60 + i * 108;
      ctx.fillStyle = ['#f2b705', '#d64541', '#7fb069'][i % 3];
      ctx.beginPath();
      ctx.arc(x, 72 + Math.sin(i * 1.3) * 4, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHandCards(state, layout, ui, now) {
    for (const slot of layout.hand) {
      const selected = ui.selectedId === slot.card.id;
      const playable = ui.playableIds.has(slot.card.id);
      drawCard(ctx, slot.card, slot.x, slot.y - (selected ? 26 : 0), slot.w, slot.h, {
        selected, dimmed: !playable && state.turn === 'you' && state.phase === 'playing',
      });
    }
    for (const slot of layout.brineHand) {
      const revealed = ui.revealedBrineId === slot.card.id;
      drawCard(ctx, slot.card, slot.x, slot.y, slot.w, slot.h, { faceDown: !revealed });
    }
  }

  function drawPots(state, layout, ui, now) {
    const youPot = drawPot(ctx, layout.youPot.x, layout.youPot.y, layout.youPot.w, layout.youPot.h, state.you.pot, 'YOUR POT — click a card, then the pot');
    const brinePot = drawPot(ctx, layout.brinePot.x, layout.brinePot.y, layout.brinePot.w, layout.brinePot.h, state.brine.pot, "BRINE'S POT");
    for (let i = 0; i < state.you.pot.length; i += 1) {
      drawCard(ctx, state.you.pot[i], youPot.x + 12 + i * (POT_CARD_W + 6), youPot.y + 4, POT_CARD_W, POT_CARD_H - 8);
    }
    for (let i = 0; i < state.brine.pot.length; i += 1) {
      drawCard(ctx, state.brine.pot[i], brinePot.x + 12 + i * (POT_CARD_W + 6), brinePot.y + 4, POT_CARD_W, POT_CARD_H - 8);
    }
    if (state.you.pot.length > 0) drawSteam(ctx, youPot.x + youPot.w / 2, youPot.y, now);
    if (state.brine.pot.length > 0) drawSteam(ctx, brinePot.x + brinePot.w / 2, brinePot.y, now);
    // Heat pips under your pot, clear of the raised hand.
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff8e6';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText('Heat:', 60, 548);
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = i < state.you.heat ? '#ff7a3c' : 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(130 + i * 30, 542, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    // Round and deck count live under the top bar, clear of the hand.
    ctx.fillStyle = '#ffe9a8';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(`Round ${state.round} of 3  •  Deck ${state.deck ? state.deck.drawPile.length : 0} cards`, 60, 112);
    if (ui.thinking) {
      ctx.fillStyle = '#ffd34d';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ui.thinking, VIEW_W / 2, 440);
    }
  }

  function drawTitle(state, ui) {
    drawTable();
    // Two chefs facing off.
    drawCook(ctx, 330, 330, 62, 'Chef Basil — YOU', 20, 0, false, true);
    drawCook(ctx, 950, 330, 62, 'Chef Brine — RIVAL', 20, 0, false, false);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText('VS', 640, 340);
    ctx.fillStyle = '#fff8e6';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('Cook ingredients into dishes. First to 2 Stars takes the Golden Ladle.', 640, 500);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('1–7 select a card  •  Enter plays it  •  E ends your turn  •  H how to play', 640, 540);
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 26px system-ui, sans-serif';
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 350);
    ctx.globalAlpha = pulse;
    ctx.fillText('▶  CLICK TO COOK  ◀', 640, 600);
    ctx.globalAlpha = 1;
    if (ui.best > 0) {
      ctx.fillStyle = '#fff8e6';
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillText(`Matches won on this browser: ${ui.best}`, 640, 640);
    }
    ctx.fillStyle = '#ffe9a8';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('24 ingredients  •  4 flavours  •  12 dishes  •  8 spices  •  best of 3 rounds', 640, 676);
  }

  function drawHowTo() {
    drawTable();
    centrePanel(ctx, 'HOW TO COOK', [
      'You and Chef Brine share one 44-card deck.',
      'Each turn: draw 2, gain 3 Heat. Ingredients cost 1 Heat,',
      'dishes cost 2 Heat, spices cost 1 Heat. Hand limit 7.',
      'Play ingredients into your pot (max 3). A full pot simmers',
      'at the end of your turn: 3 of one flavour, or a Fusion of',
      '3 different flavours, deals damage equal to their values.',
      'With 3 of one flavour in the pot, play a matching dish',
      'card for 6–10 damage and draw 1 card. Favour 0 loses the round.',
      'First to 2 Stars wins the match and the Golden Ladle.',
    ], '#ffd34d');
  }

  return {
    draw(state, screen, ui, now) {
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      if (screen === SCREEN_TITLE) {
        drawTitle(state, ui);
        return { layout: layoutFor(state) };
      }
      if (screen === SCREEN_HOWTO) {
        drawHowTo();
        return { layout: layoutFor(state) };
      }
      drawTable();
      const layout = layoutFor(state);
      // Cooks at the sides of the table.
      drawCook(ctx, 108, 330, 46, CHEF_NAMES.you, state.you.favour, state.you.stars, state.you.shield, true);
      drawCook(ctx, 1172, 330, 46, CHEF_NAMES.brine, state.brine.favour, state.brine.stars, state.brine.shield, false);
      drawHandCards(state, layout, ui, now);
      drawPots(state, layout, ui, now);
      if (ui.particles && ui.particles.length > 0) drawConfetti(ctx, ui.particles);
      if (screen === SCREEN_ROUND_END) {
        const winner = state.roundWinner === 'you' ? 'Chef Basil' : 'Chef Brine';
        centrePanel(ctx, `${winner.toUpperCase()} TAKES ROUND ${state.round}`, [
          `Stars — Basil ${state.you.stars}  •  Brine ${state.brine.stars}`,
          `Dishes served — you ${state.stats.dishesYou}, Brine ${state.stats.dishesBrine}`,
          `Damage dealt — you ${state.stats.damageYou}, Brine ${state.stats.damageBrine}`,
          state.roundWinner === 'you' ? 'The crowd smells your victory cooking.' : 'Brine wipes his ladle and grins. One more round.',
        ], state.roundWinner === 'you' ? '#7fb069' : '#d64541');
      } else if (screen === SCREEN_WIN) {
        centrePanel(ctx, 'THE CROWD CHANTS YOUR NAME!', [
          'You beat Chef Brine 2 Stars to ' + state.brine.stars + ' and take the Golden Ladle.',
          `Final Favour ${state.you.favour} — ${state.brine.favour}  •  Dishes served ${state.stats.dishesYou}`,
          `Fusions cooked: ${state.stats.fusions}  •  Turns played: ${state.stats.turns}`,
          'SIMMER — a street-food card duel, cooked fresh.',
        ], '#ffd34d');
      } else if (screen === SCREEN_LOSS) {
        centrePanel(ctx, 'BRINE TAKES THE GOLDEN LADLE', [
          `Chef Brine wins 2 Stars to ${state.you.stars}. The crowd goes quiet.`,
          `Final Favour ${state.you.favour} — ${state.brine.favour}  •  Dishes served ${state.stats.dishesYou}`,
          'Your stall is still standing. Cook again and take it back.',
          'SIMMER — a street-food card duel, cooked fresh.',
        ], '#d64541');
      } else if (screen === SCREEN_PAUSED) {
        centrePanel(ctx, 'PAUSED', [
          'The pots stay warm while you think.',
          'P or Esc resumes. H shows how to play. M toggles sound.',
        ], '#ffe9a8');
      }
      return { layout };
    },
  };
}
