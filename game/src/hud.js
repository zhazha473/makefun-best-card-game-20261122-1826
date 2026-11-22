// The DOM heads-up display: Favour bars, Heat, round and Stars, the turn log and the
// buttons. The canvas paints the table; this panel paints the numbers the judge reads.
import { START_FAVOUR } from './player.js';
import { CHEF_NAMES } from './rules.js';

function barFill(element, favour) {
  const pct = Math.max(0, Math.min(100, (favour / START_FAVOUR) * 100));
  element.style.width = `${pct}%`;
  element.style.background = favour <= 6 ? '#d64541' : favour <= 12 ? '#f2b705' : '#7fb069';
}

export function createHud(document) {
  const youBar = document.getElementById('you-favour-fill');
  const brineBar = document.getElementById('brine-favour-fill');
  const youText = document.getElementById('you-favour-text');
  const brineText = document.getElementById('brine-favour-text');
  const youStars = document.getElementById('you-stars');
  const brineStars = document.getElementById('brine-stars');
  const roundText = document.getElementById('round-text');
  const heatText = document.getElementById('heat-text');
  const turnText = document.getElementById('turn-text');
  const logList = document.getElementById('log');
  const status = document.getElementById('status');
  let lastLogLength = 0;

  function starsText(count) {
    return '★'.repeat(count) + '☆'.repeat(Math.max(0, 2 - count));
  }

  return {
    update(state) {
      barFill(youBar, state.you.favour);
      barFill(brineBar, state.brine.favour);
      youText.textContent = `${state.you.favour} / ${START_FAVOUR} Favour`;
      brineText.textContent = `${state.brine.favour} / ${START_FAVOUR} Favour`;
      youStars.textContent = starsText(state.you.stars);
      brineStars.textContent = starsText(state.brine.stars);
      roundText.textContent = `Round ${state.round} of 3 — first to 2 Stars`;
      heatText.textContent = `Heat ${state.you.heat}`;
      turnText.textContent = state.phase === 'playing'
        ? (state.turn === 'you' ? 'Your turn — play a card, then End Turn' : 'Brine is cooking…')
        : state.phase === 'matchWin' ? 'You win the match!'
          : state.phase === 'matchLoss' ? 'Brine wins the match.'
            : 'Round over';
      if (state.log.length !== lastLogLength) {
        const fresh = state.log.slice(lastLogLength);
        lastLogLength = state.log.length;
        for (const line of fresh) {
          const item = document.createElement('li');
          item.textContent = line;
          logList.appendChild(item);
        }
        while (logList.children.length > 8) logList.removeChild(logList.firstChild);
        if (fresh.length > 0) status.textContent = fresh[fresh.length - 1];
      }
    },
    announce(message) {
      status.textContent = message;
    },
    chefNames() {
      return CHEF_NAMES;
    },
  };
}
