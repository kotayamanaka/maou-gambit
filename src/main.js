import './styles.css';
import { createGame } from './game/state.js';
import { renderApp } from './ui/app.js';
import { tickBattle } from './systems/simulation.js';

const app = document.querySelector('#app');
const game = createGame();
window.__MAOU_GAME__ = game;

function commit(mutator) {
  mutator(game);
  renderApp(app, game, commit);
}

renderApp(app, game, commit);

let last = performance.now();
setInterval(() => {
  const now = performance.now();
  const dt = Math.min(0.18, (now - last) / 1000);
  last = now;
  if (game.phase === 'battle' && game.speed > 0) {
    tickBattle(game, dt);
    if (!window.__MAOU_MAP_DRAGGING__) renderApp(app, game, commit);
  }
}, 100);
