// Mouse and keyboard input for SIMMER. This module only reports what the player did —
// clicks in canvas coordinates, keys pressed — and the game decides what it means.
export const ACTION_CONFIRM = 1;
export const ACTION_END_TURN = 2;
export const ACTION_PAUSE = 4;
export const ACTION_HOWTO = 8;
export const ACTION_MUTE = 16;
export const ACTION_RESTART = 32;

export function createInput(canvas, handlers) {
  const keys = new Map([
    ['Enter', ACTION_CONFIRM],
    [' ', ACTION_CONFIRM],
    ['e', ACTION_END_TURN],
    ['E', ACTION_END_TURN],
    ['p', ACTION_PAUSE],
    ['P', ACTION_PAUSE],
    ['Escape', ACTION_PAUSE],
    ['h', ACTION_HOWTO],
    ['H', ACTION_HOWTO],
    ['m', ACTION_MUTE],
    ['M', ACTION_MUTE],
    ['r', ACTION_RESTART],
    ['R', ACTION_RESTART],
  ]);

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  canvas.addEventListener('click', (event) => {
    handlers.onClick(canvasPoint(event));
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (event.key >= '1' && event.key <= '7') {
      handlers.onSelect(Number(event.key) - 1);
      return;
    }
    const action = keys.get(event.key);
    if (action !== undefined) {
      event.preventDefault();
      handlers.onAction(action);
    }
  });

  return {
    // The canvas is scaled to the window; input coordinates are converted in canvasPoint.
    canvasSize() {
      return { width: canvas.width, height: canvas.height };
    },
  };
}
