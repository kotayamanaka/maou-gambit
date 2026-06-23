import { rooms } from '../data/rooms.js';

const corridors = [
  ['entrance', 'hallA'], ['hallA', 'storage'], ['hallA', 'atrium'],
  ['atrium', 'jail'], ['atrium', 'deadEnd'], ['atrium', 'hallB'],
  ['hallB', 'treasure'], ['hallB', 'throne']
];

function sprite(entity, className = '', index = 0) {
  const hp = entity.maxHp ? `<span class="mini-hp" style="--hp:${Math.max(0, entity.hp / entity.maxHp)}"></span>` : '';
  const carry = entity.carrying ? '<b class="badge carry">⛓</b>' : '';
  const known = entity.knowsThrone ? '<b class="badge warn">!</b>' : '';
  const offsetX = ((index % 3) - 1) * 2.2;
  const offsetY = (Math.floor(index / 3) - 0.5) * 2.2;
  return `<div class="actor ${className}" title="${entity.name}" style="left:${(entity.x ?? 0) + offsetX}%;top:${(entity.y ?? 0) + offsetY}%">
    <img src="${entity.sprite}" alt="${entity.name}" />
    ${hp}${carry}${known}
  </div>`;
}

function bodySprite(body, index = 0) {
  const offsetX = ((index % 3) - 1) * 2.2;
  const offsetY = (Math.floor(index / 3) - 0.5) * 2.2;
  return `<div class="actor downed" title="${body.name} 残り${Math.ceil(body.ttl)}秒" style="left:${(body.x ?? 0) + offsetX}%;top:${(body.y ?? 0) + offsetY}%">
    <img src="${body.sprite}" alt="${body.name}" />
    <span class="down-timer">${Math.ceil(body.ttl)}</span>
  </div>`;
}

export function renderMap(game, mode = 'setup') {
  const camera = game.camera ?? { zoom: 1, x: 0, y: 0 };
  const roomById = Object.fromEntries(rooms.map((room) => [room.id, room]));
  const actors = [];
  game.allies.forEach((ally, index) => actors.push(sprite(ally, ally.uid === game.selectedUnitId ? 'selected ally' : 'ally', index)));
  if (game.phase === 'battle') {
    game.enemies.forEach((enemy, index) => actors.push(sprite(enemy, 'enemy', index)));
    game.downed.forEach((body, index) => actors.push(bodySprite(body, index)));
  }
  actors.push(sprite(game.demonLord, 'lord', 0));

  const nodes = rooms.map((room) => {
    const discovered = game.partyKnowledge?.visited?.has?.(room.id) || mode !== 'battle' || room.id === 'entrance';
    const selected = room.id === game.selectedRoomId ? 'selected-room' : '';
    return `<button class="room ${room.type} ${selected} ${discovered ? '' : 'fog'}" data-room="${room.id}" style="left:${room.x}%;top:${room.y}%">
      <span class="room-name">${room.name}</span>
    </button>`;
  }).join('');

  const lines = corridors.map(([a, b]) => {
    const from = roomById[a];
    const to = roomById[b];
    return `<line class="corridor" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />`;
  }).join('');

  const effects = game.effects.map((effect) => {
    const room = rooms.find((item) => item.id === effect.room);
    if (!room) return '';
    return `<span class="fx ${effect.type}" style="left:${room.x + 6}%;top:${room.y + 4}%">${effect.label ?? ''}</span>`;
  }).join('');

  return `<section class="map-shell" data-map-shell aria-label="ダンジョン">
    <div class="map-board">
      <div class="map-world" style="transform: translate(${camera.x}%, ${camera.y}%) scale(${camera.zoom})">
        <svg class="corridors" viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>
        ${nodes}<div class="actor-layer">${actors.join('')}</div>${effects}
      </div>
      <div class="map-controls" aria-label="マップ操作">
        <button data-mapaction="zoomIn" title="拡大">＋</button>
        <button data-mapaction="zoomOut" title="縮小">－</button>
        <button data-mapaction="panLeft" title="左へ">←</button>
        <button data-mapaction="panRight" title="右へ">→</button>
        <button data-mapaction="panUp" title="上へ">↑</button>
        <button data-mapaction="panDown" title="下へ">↓</button>
        <button data-mapaction="reset" title="リセット">⟳</button>
      </div>
    </div>
  </section>`;
}
