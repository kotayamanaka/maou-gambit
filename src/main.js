import './styles.css';
import { createGame } from './game/state.js';
import { renderApp } from './ui/app.js';
import { tickBattle } from './systems/simulation.js';

const app = document.querySelector('#app');
const game = createGame();
window.__MAOU_GAME__ = game;

const publicBase = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
const publicAsset = (path) => `${publicBase}${path.replace(/^\/+/, '')}`;

document.documentElement.style.setProperty('--floor-tile', `url("${publicAsset('assets/tiles/floor-stone.png')}")`);
document.documentElement.style.setProperty('--room-tile', `url("${publicAsset('assets/tiles/room-stone.png')}")`);

function commit(mutator) {
  mutator(game);
  renderApp(app, game, commit);
}
window.__MAOU_COMMIT__ = commit;

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
