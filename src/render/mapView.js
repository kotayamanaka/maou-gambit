import { rooms, worldSize } from '../data/rooms.js';

const corridors = [
  ['entrance', 'hallA'], ['hallA', 'storage'], ['hallA', 'atrium'],
  ['atrium', 'jail'], ['atrium', 'deadEnd'], ['atrium', 'hallB'],
  ['hallB', 'treasure'], ['hallB', 'throne']
];

function sprite(entity, className = '', index = 0) {
  const hp = entity.maxHp ? `<span class="mini-hp" style="--hp:${Math.max(0, entity.hp / entity.maxHp)}"></span>` : '';
  const carry = entity.carrying ? '<b class="badge carry">⛓</b>' : '';
  const known = entity.knowsThrone ? '<b class="badge warn">!</b>' : '';
  const offsetX = ((index % 3) - 1) * 12;
  const offsetY = (Math.floor(index / 3) - 0.5) * 12;
  const type = entity.type === 'enemy' ? 'enemy' : entity.type === 'boss' ? 'lord' : 'ally';
  return `<button class="actor ${className}" data-select-type="${type}" data-select-id="${entity.uid ?? entity.id}" title="${entity.name}" style="left:${(entity.x ?? 0) + offsetX}px;top:${(entity.y ?? 0) + offsetY}px">
    <img src="${entity.sprite}" alt="${entity.name}" />
    ${hp}${carry}${known}
  </button>`;
}

function bodySprite(body, index = 0) {
  const offsetX = ((index % 3) - 1) * 12;
  const offsetY = (Math.floor(index / 3) - 0.5) * 12;
  return `<button class="actor downed" data-select-type="downed" data-select-id="${body.uid}" title="${body.name} 残り${Math.ceil(body.ttl)}秒" style="left:${(body.x ?? 0) + offsetX}px;top:${(body.y ?? 0) + offsetY}px">
    <img src="${body.sprite}" alt="${body.name}" />
    <span class="down-timer">${Math.ceil(body.ttl)}</span>
  </button>`;
}

export function renderMap(game, mode = 'setup') {
  const camera = game.camera ?? { zoom: 1, x: 0, y: 0 };
  const roomById = Object.fromEntries(rooms.map((room) => [room.id, room]));
  const actors = [];
  const selected = game.selectedEntity ?? { type: 'ally', id: game.selectedUnitId };
  game.allies.forEach((ally, index) => actors.push(sprite(ally, selected.type === 'ally' && selected.id === ally.uid ? 'selected ally' : 'ally', index)));
  if (game.phase === 'battle') {
    game.enemies.forEach((enemy, index) => actors.push(sprite(enemy, selected.type === 'enemy' && selected.id === enemy.uid ? 'selected enemy' : 'enemy', index)));
    game.downed.forEach((body, index) => actors.push(bodySprite(body, index)));
  }
  actors.push(sprite(game.demonLord, selected.type === 'lord' ? 'selected lord' : 'lord', 0));

  const nodes = rooms.map((room) => {
    const discovered = game.partyKnowledge?.visited?.has?.(room.id) || mode !== 'battle' || room.id === 'entrance';
    const selected = room.id === game.selectedRoomId ? 'selected-room' : '';
    const allyCount = game.allies.filter((ally) => ally.hp > 0 && ally.room === room.id).length;
    const capacity = room.capacity > 0 ? `<span class="room-cap">${allyCount}/${room.capacity}</span>` : '';
    return `<button class="room ${room.type} ${selected} ${discovered ? '' : 'fog'}" data-room="${room.id}" style="left:${room.x - room.w / 2}px;top:${room.y - room.h / 2}px;width:${room.w}px;height:${room.h}px">
      <span class="room-name">${room.name}</span>
      ${capacity}
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
    const x = effect.x ?? room.x + 36;
    const y = effect.y ?? room.y + 28;
    return `<span class="fx ${effect.type}" style="left:${x}px;top:${y}px">${effect.label ?? ''}</span>`;
  }).join('');

  return `<section class="map-shell" data-map-shell aria-label="ダンジョン">
    <div class="map-board">
      <div class="map-world" style="width:${worldSize.width}px;height:${worldSize.height}px;transform: translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})">
        <svg class="corridors" viewBox="0 0 ${worldSize.width} ${worldSize.height}" aria-hidden="true">${lines}</svg>
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
        <button data-mapaction="focusSelected" title="選択へ">◎</button>
        <button data-mapaction="focusEnemy" title="侵入者へ">!</button>
      </div>
    </div>
  </section>`;
}
