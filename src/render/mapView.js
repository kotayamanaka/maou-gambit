import { rooms, worldSize } from '../data/rooms.js';
import { roomObjects } from '../data/objects.js';
import { isRoomBuilt, roomCapacity } from '../systems/placement.js';
import { statusIconList } from '../systems/status.js';

function entitySprite(entity, fallbackPose = 'idle') {
  const set = entity.spriteSet;
  if (!set) return entity.sprite;
  const pose = entity.animTtl > 0 && entity.anim ? entity.anim
    : entity.movingTo ? 'walk'
      : fallbackPose;
  const facing = entity.facing ?? 'front';
  return set[pose]?.[facing] ?? set[pose]?.front ?? set.idle?.[facing] ?? set.idle?.front ?? entity.sprite;
}

function sprite(entity, className = '', index = 0) {
  const hp = entity.maxHp ? `<span class="mini-hp" style="--hp:${Math.max(0, entity.hp / entity.maxHp)}"></span>` : '';
  const carry = entity.carrying ? '<b class="badge carry">⛓</b>' : '';
  const known = entity.knowsThrone ? '<b class="badge warn">!</b>' : '';
  const status = statusIconList(entity).slice(0, 2).map((icon) => `<b class="status-badge">${icon}</b>`).join('');
  const offsetX = ((index % 3) - 1) * 12;
  const offsetY = (Math.floor(index / 3) - 0.5) * 12;
  const type = entity.type === 'enemy' ? 'enemy' : entity.type === 'boss' ? 'lord' : 'ally';
  return `<button class="actor ${className}" data-select-type="${type}" data-select-id="${entity.uid ?? entity.id}" title="${entity.name}" style="left:${(entity.x ?? 0) + offsetX}px;top:${(entity.y ?? 0) + offsetY}px">
    <img src="${entitySprite(entity)}" alt="${entity.name}" />
    ${hp}${carry}${known}${status ? `<span class="status-stack">${status}</span>` : ''}
  </button>`;
}

function bodySprite(body, index = 0) {
  const offsetX = ((index % 3) - 1) * 12;
  const offsetY = (Math.floor(index / 3) - 0.5) * 12;
  return `<button class="actor downed" data-select-type="downed" data-select-id="${body.uid}" title="${body.name} 残り${Math.ceil(body.ttl)}秒" style="left:${(body.x ?? 0) + offsetX}px;top:${(body.y ?? 0) + offsetY}px">
    <img src="${entitySprite(body, 'downed')}" alt="${body.name}" />
    <span class="down-timer">${Math.ceil(body.ttl)}</span>
  </button>`;
}

export function renderMap(game, mode = 'setup') {
  const camera = game.camera ?? { zoom: 1, x: 0, y: 0 };
  const roomById = Object.fromEntries(rooms.map((room) => [room.id, room]));
  const corridors = Object.entries(game.roomConnections ?? {})
    .flatMap(([roomId, targets]) => targets.map((target) => [roomId, target]))
    .filter(([a, b], index, list) => index === list.findIndex(([x, y]) => (
      (x === a && y === b) || (x === b && y === a)
    )));
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
    const built = isRoomBuilt(game, room.id);
    const selected = room.id === game.selectedRoomId ? 'selected-room' : '';
    const allyCount = game.allies.filter((ally) => ally.hp > 0 && ally.room === room.id).length;
    const capacity = room.capacity > 0 ? `<span class="room-cap">${built ? `${allyCount}/${roomCapacity(room.id, game)}` : '未'}</span>` : '';
    const object = built ? roomObjects[game.roomObjects?.[room.id]] : null;
    return `<button class="room ${room.type} ${selected} ${built ? '' : 'unbuilt'} ${discovered ? '' : 'fog'}" data-room="${room.id}" style="left:${room.x - room.w / 2}px;top:${room.y - room.h / 2}px;width:${room.w}px;height:${room.h}px">
      <span class="room-name">${room.name}</span>
      ${object ? `<span class="room-object" title="${object.name}">${object.icon}</span>` : ''}
      ${capacity}
    </button>`;
  }).join('');

  const lines = corridors.map(([a, b]) => {
    const from = roomById[a];
    const to = roomById[b];
    const locked = !isRoomBuilt(game, a) || !isRoomBuilt(game, b);
    return `<line class="corridor ${locked ? 'unbuilt' : ''}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />`;
  }).join('');

  const effects = game.effects.map((effect) => {
    const room = rooms.find((item) => item.id === effect.room);
    if (!room) return '';
    const x = effect.x ?? room.x + 36;
    const y = effect.y ?? room.y + 28;
    if (String(effect.type).includes('projectile')) {
      const toX = effect.toX ?? x;
      const toY = effect.toY ?? y;
      const dx = toX - x;
      const dy = toY - y;
      const length = Math.max(16, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      return `<span class="fx ${effect.type}" style="left:${x}px;top:${y}px;width:${length}px;transform:translate(0,-50%) rotate(${angle}rad)">${effect.label ?? ''}</span>`;
    }
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
