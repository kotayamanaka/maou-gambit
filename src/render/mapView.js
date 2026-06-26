import { buildSlots, roomViews, rooms, slotTaken, worldSize } from '../data/rooms.js';
import { roomObjects } from '../data/objects.js';
import { isRoomBuilt, roomCapacity } from '../systems/placement.js';
import { statusIconList } from '../systems/status.js';

function entityPose(entity, fallbackPose = 'idle') {
  return entity.animTtl > 0 && entity.anim ? entity.anim
    : entity.movingTo ? 'walk'
      : fallbackPose;
}

function spritePose(entity, fallbackPose = 'idle') {
  const pose = entityPose(entity, fallbackPose);
  return pose === 'attack' && (entity.range ?? 1) > 1 ? 'idle' : pose;
}

function hashOffset(value = '') {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return (hash % 1000) / 1000;
}

function animationClock(game) {
  if (Number.isFinite(game?.elapsed)) return game.elapsed;
  return typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
}

function spriteEntry(set, pose, facing) {
  return set[pose]?.[facing] ?? set[pose]?.front ?? set.idle?.[facing] ?? set.idle?.front;
}

function frameIndex(entity, pose, frames, clock) {
  if (!Array.isArray(frames) || frames.length <= 1) return 0;
  if (pose === 'attack') {
    const ttl = entity.animTtl ?? 0;
    return ttl > 0.18 ? 0 : Math.min(1, frames.length - 1);
  }
  const phase = hashOffset(entity.uid ?? entity.id ?? entity.name ?? '') * 0.7;
  const fps = pose === 'walk' ? 7 : 3;
  return Math.floor((clock + phase) * fps) % frames.length;
}

function entitySpriteInfo(entity, fallbackPose = 'idle', clock = 0) {
  const set = entity.spriteSet;
  if (!set) return { src: entity.sprite, frameIndex: 0, frameCount: 1 };
  const pose = spritePose(entity, fallbackPose);
  const facing = entity.facing ?? 'front';
  const entry = spriteEntry(set, pose, facing);
  if (Array.isArray(entry) && entry.length) {
    const index = frameIndex(entity, pose, entry, clock);
    return { src: entry[index] ?? entry[0] ?? entity.sprite, frameIndex: index, frameCount: entry.length };
  }
  return { src: entry ?? entity.sprite, frameIndex: 0, frameCount: 1 };
}

function sprite(entity, className = '', index = 0, clock = 0) {
  const hp = entity.maxHp ? `<span class="mini-hp" style="--hp:${Math.max(0, entity.hp / entity.maxHp)}"></span>` : '';
  const carry = entity.carrying ? '<b class="badge carry">⛓</b>' : '';
  const known = entity.knowsThrone ? '<b class="badge warn">!</b>' : '';
  const status = statusIconList(entity).slice(0, 2).map((icon) => `<b class="status-badge">${icon}</b>`).join('');
  const offsetX = ((index % 3) - 1) * 18;
  const offsetY = (Math.floor(index / 3) - 0.5) * 16;
  const type = entity.type === 'enemy' ? 'enemy' : entity.type === 'boss' ? 'lord' : 'ally';
  const pose = entityPose(entity);
  const facing = entity.facing ?? 'front';
  const spriteInfo = entitySpriteInfo(entity, 'idle', clock);
  return `<button class="actor ${className} anim-${pose} face-${facing}" data-select-type="${type}" data-select-id="${entity.uid ?? entity.id}" data-sprite-frame="${spriteInfo.frameIndex}" data-sprite-frame-count="${spriteInfo.frameCount}" title="${entity.name}" style="left:${(entity.x ?? 0) + offsetX}px;top:${(entity.y ?? 0) + offsetY}px">
    <img src="${spriteInfo.src}" alt="${entity.name}" />
    ${hp}${carry}${known}${status ? `<span class="status-stack">${status}</span>` : ''}
  </button>`;
}

function bodySprite(body, index = 0, clock = 0) {
  const offsetX = ((index % 3) - 1) * 18;
  const offsetY = (Math.floor(index / 3) - 0.5) * 16;
  const facing = body.facing ?? 'front';
  const spriteInfo = entitySpriteInfo(body, 'downed', clock);
  return `<button class="actor downed anim-downed face-${facing}" data-select-type="downed" data-select-id="${body.uid}" title="${body.name} 残り${Math.ceil(body.ttl)}秒" style="left:${(body.x ?? 0) + offsetX}px;top:${(body.y ?? 0) + offsetY}px">
    <img src="${spriteInfo.src}" alt="${body.name}" />
    <span class="down-timer">${Math.ceil(body.ttl)}</span>
  </button>`;
}

export function renderMap(game, mode = 'setup') {
  const camera = game.camera ?? { zoom: 1, x: 0, y: 0 };
  const clock = animationClock(game);
  const visibleRooms = roomViews(game);
  const roomById = Object.fromEntries(visibleRooms.map((room) => [room.id, room]));
  const corridors = Object.entries(game.roomConnections ?? {})
    .flatMap(([roomId, targets]) => targets.map((target) => [roomId, target]))
    .filter(([a, b], index, list) => index === list.findIndex(([x, y]) => (
      (x === a && y === b) || (x === b && y === a)
    )));
  const actors = [];
  const selected = game.selectedEntity ?? { type: 'ally', id: game.selectedUnitId };
  game.allies.forEach((ally, index) => actors.push(sprite(ally, selected.type === 'ally' && selected.id === ally.uid ? 'selected ally' : 'ally', index, clock)));
  if (game.phase === 'battle') {
    game.enemies.forEach((enemy, index) => actors.push(sprite(enemy, selected.type === 'enemy' && selected.id === enemy.uid ? 'selected enemy' : 'enemy', index, clock)));
    game.downed.forEach((body, index) => actors.push(bodySprite(body, index, clock)));
  }
  actors.push(sprite(game.demonLord, selected.type === 'lord' ? 'selected lord' : 'lord', 0, clock));

  const nodes = visibleRooms.filter((room) => isRoomBuilt(game, room.id)).map((room) => {
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

  const slotNodes = mode === 'setup' && game.uiPanel === 'build'
    ? buildSlots.map((slot) => {
      const used = slotTaken(game, slot.id);
      const selected = game.selectedBuildSlot === slot.id;
      return `<button class="build-slot ${selected ? 'selected-slot' : ''} ${used ? 'used' : ''}" data-build-slot="${slot.id}" style="left:${slot.x - 58}px;top:${slot.y - 42}px;width:116px;height:84px" ${used ? 'disabled' : ''}>
        <span>${used ? '占有' : '配置'}</span>
      </button>`;
    }).join('')
    : '';

  function doorPair(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      const side = dx >= 0 ? 1 : -1;
      return {
        from: { x: from.x + (from.w / 2) * side, y: from.y },
        to: { x: to.x - (to.w / 2) * side, y: to.y },
        axis: 'x'
      };
    }
    const side = dy >= 0 ? 1 : -1;
    return {
      from: { x: from.x, y: from.y + (from.h / 2) * side },
      to: { x: to.x, y: to.y - (to.h / 2) * side },
      axis: 'y'
    };
  }

  function pathPoints(doors) {
    return doors.axis === 'x'
      ? [
        doors.from,
        { x: Math.round((doors.from.x + doors.to.x) / 2), y: doors.from.y },
        { x: Math.round((doors.from.x + doors.to.x) / 2), y: doors.to.y },
        doors.to
      ]
      : [
        doors.from,
        { x: doors.from.x, y: Math.round((doors.from.y + doors.to.y) / 2) },
        { x: doors.to.x, y: Math.round((doors.from.y + doors.to.y) / 2) },
        doors.to
      ];
  }

  function pathData(points) {
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  }

  const corridorPaths = corridors.map(([a, b]) => {
    const from = roomById[a];
    const to = roomById[b];
    if (!from || !to) return '';
    const locked = !isRoomBuilt(game, a) || !isRoomBuilt(game, b);
    const doors = doorPair(from, to);
    return `<path class="corridor-path under ${locked ? 'unbuilt' : ''}" d="${pathData(pathPoints(doors))}" />`
      + `<path class="corridor-path floor ${locked ? 'unbuilt' : ''}" d="${pathData(pathPoints(doors))}" />`;
  }).join('');

  const corridorDoors = corridors.map(([a, b]) => {
    const from = roomById[a];
    const to = roomById[b];
    if (!from || !to) return '';
    const doors = doorPair(from, to);
    const doorsHtml = `<span class="room-door" style="left:${doors.from.x}px;top:${doors.from.y}px"></span><span class="room-door" style="left:${doors.to.x}px;top:${doors.to.y}px"></span>`;
    return doorsHtml;
  }).join('');

  const effects = game.effects.filter((effect) => (effect.delay ?? 0) <= 0).map((effect) => {
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
        <svg class="corridors" viewBox="0 0 ${worldSize.width} ${worldSize.height}" aria-hidden="true">
          <defs>
            <pattern id="corridor-stone-pattern" patternUnits="userSpaceOnUse" width="128" height="128">
              <image href="assets/tiles/corridor-stone.png" width="128" height="128" preserveAspectRatio="none" />
            </pattern>
          </defs>
          ${corridorPaths}
        </svg>
        ${corridorDoors}${slotNodes}${nodes}<div class="actor-layer">${actors.join('')}</div>${effects}
      </div>
      <div class="map-controls" aria-label="マップ操作">
        <button data-mapaction="zoomIn" title="拡大">＋</button>
        <button data-mapaction="zoomOut" title="縮小">－</button>
        <button data-mapaction="reset" title="リセット">⟳</button>
        <button data-mapaction="focusSelected" title="選択へ">◎</button>
      </div>
    </div>
  </section>`;
}
