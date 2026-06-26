import { enemyTemplates } from '../data/units.js';
import { roomById, roomView } from '../data/rooms.js';
import { addLog } from '../game/state.js';
import { nextStep, roomConnections } from './path.js';
import { applyStatus, attackMultiplier, speedMultiplier } from './status.js';

const MELEE_RANGE = 34;
const MAX_VISIBLE_EFFECTS = 36;

function hashOffset(value = '') {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return (hash % 1000) / 1000;
}

function unitSpeed(unit) {
  const base = unit.type === 'enemy' ? 34 : 48;
  return Math.max(28, (unit.spd || 0.7) * base * speedMultiplier(unit)) / (unit.carrying ? 1.65 : 1);
}

function attackRadius(unit) {
  const range = unit.range ?? 1;
  if (range <= 1) return MELEE_RANGE;
  return 70 + range * 32;
}

function attackCooldown(unit) {
  const speed = Math.max(0.45, (unit.spd ?? 1) * speedMultiplier(unit));
  return Math.max(0.62, Math.min(1.45, 1.05 / Math.sqrt(speed)));
}

function projectileKind(unit) {
  const id = String(unit.templateId ?? unit.id ?? '');
  const skills = unit.skills ?? [];
  if (/mage|sage|oracle|shade/i.test(id) || skills.some((skill) => ['poisonTouch', 'slowTouch', 'inspireOnHit'].includes(skill))) return 'magic';
  return 'arrow';
}

function pushEffect(game, effect) {
  game.effects.push(effect);
  if (game.effects.length > MAX_VISIBLE_EFFECTS) {
    game.effects = game.effects.slice(game.effects.length - MAX_VISIBLE_EFFECTS);
  }
}

function facingFromDelta(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'front' : 'back';
}

function faceToward(unit, target) {
  unit.facing = facingFromDelta((target.x ?? 0) - (unit.x ?? 0), (target.y ?? 0) - (unit.y ?? 0));
}

function sameSideUnits(game, unit) {
  if (unit.type === 'enemy') return game.enemies.filter((item) => item.hp > 0 && item.room === unit.room);
  return game.allies.filter((item) => item.hp > 0 && item.room === unit.room);
}

function triggerSkills(attacker, target, game) {
  const skills = attacker.skills ?? [];
  if (skills.includes('poisonTouch') && applyStatus(target, 'poison', 4.5, 1)) {
    game.effects.push({ id: crypto.randomUUID(), type: 'status poison', room: target.room, x: target.x, y: (target.y ?? 0) - 18, ttl: 0.8, label: '毒' });
  }
  if (skills.includes('slowTouch') && applyStatus(target, 'slow', 4, 1)) {
    game.effects.push({ id: crypto.randomUUID(), type: 'status slow', room: target.room, x: target.x, y: (target.y ?? 0) - 18, ttl: 0.8, label: '鈍足' });
  }
  if (skills.includes('hasteOnHit') && applyStatus(attacker, 'haste', 3, 1)) {
    game.effects.push({ id: crypto.randomUUID(), type: 'status haste', room: attacker.room, x: attacker.x, y: (attacker.y ?? 0) - 18, ttl: 0.8, label: '加速' });
  }
  if (skills.includes('inspireOnHit')) {
    for (const unit of sameSideUnits(game, attacker)) applyStatus(unit, 'might', 3.5, 1);
    game.effects.push({ id: crypto.randomUUID(), type: 'status might', room: attacker.room, x: attacker.x, y: (attacker.y ?? 0) - 18, ttl: 0.8, label: '鼓舞' });
  }
}

export function roomPoint(roomId, unit, game = null) {
  const room = roomView(game, roomId);
  if (!room) return { x: unit.x ?? 0, y: unit.y ?? 0 };
  const lane = hashOffset(unit.uid ?? unit.id ?? unit.name) - 0.5;
  const side = unit.type === 'enemy' ? -0.34 : unit.type === 'boss' ? 0.22 : 0.3;
  return {
    x: room.x + room.w * side,
    y: room.y + lane * room.h * 0.44
  };
}

function doorPair(fromRoom, toRoom) {
  const dx = toRoom.x - fromRoom.x;
  const dy = toRoom.y - fromRoom.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const fromSide = dx >= 0 ? 1 : -1;
    return {
      from: { x: fromRoom.x + (fromRoom.w / 2) * fromSide, y: fromRoom.y },
      to: { x: toRoom.x - (toRoom.w / 2) * fromSide, y: toRoom.y },
      axis: 'x'
    };
  }
  const fromSide = dy >= 0 ? 1 : -1;
  return {
    from: { x: fromRoom.x, y: fromRoom.y + (fromRoom.h / 2) * fromSide },
    to: { x: toRoom.x, y: toRoom.y - (toRoom.h / 2) * fromSide },
    axis: 'y'
  };
}

function movementRoute(game, fromRoomId, toRoomId, unit) {
  const fromRoom = roomView(game, fromRoomId);
  const toRoom = roomView(game, toRoomId);
  if (!fromRoom || !toRoom) return [roomPoint(toRoomId, unit, game)];
  const doors = doorPair(fromRoom, toRoom);
  const destination = roomPoint(toRoomId, unit, game);
  const bend = doors.axis === 'x'
    ? [
      { x: (doors.from.x + doors.to.x) / 2, y: doors.from.y },
      { x: (doors.from.x + doors.to.x) / 2, y: doors.to.y }
    ]
    : [
      { x: doors.from.x, y: (doors.from.y + doors.to.y) / 2 },
      { x: doors.to.x, y: (doors.from.y + doors.to.y) / 2 }
    ];
  return [doors.from, ...bend, doors.to, destination];
}

export function spawnDueEnemies(game) {
  for (const spawn of game.waveQueue) {
    if (spawn.spawned || game.elapsed < spawn.delay) continue;
    const template = enemyTemplates[spawn.kind];
    const enemy = {
      uid: `enemy-${spawn.id}-${Math.round(game.elapsed * 10)}`,
      templateId: template.id,
      name: template.name,
      type: template.type,
      sprite: template.sprite,
      spriteSet: template.spriteSet ? structuredClone(template.spriteSet) : null,
      maxHp: template.stats.hp,
      hp: template.stats.hp,
      atk: template.stats.atk,
      spd: template.stats.spd,
      range: template.stats.range,
      skills: [...(template.skills ?? [])],
      chips: [...(template.chips ?? [])],
      convertTo: template.convertTo,
      capture: { ...(template.capture ?? { difficulty: 1, ttl: 12 }) },
      drop: { ...(template.drop ?? { gold: 0, items: [] }) },
      room: 'entrance',
      x: roomView(game, 'entrance').x,
      y: roomView(game, 'entrance').y,
      facing: 'right',
      anim: 'idle',
      animTtl: 0,
      movingTo: null,
      moveClock: 0,
      attackClock: 0,
      searchClock: 0.45,
      knowsThrone: false
    };
    const point = roomPoint('entrance', enemy, game);
    enemy.x = point.x;
    enemy.y = point.y;
    game.enemies.push(enemy);
    game.collections?.enemies?.add?.(template.id);
    spawn.spawned = true;
    addLog(game, `${template.name}が入口から侵入。`);
  }
}

export function canAttack(attacker, target) {
  if (attacker.movingTo) return false;
  if (attacker.room !== target.room) return false;
  const distance = Math.hypot((attacker.x ?? 0) - (target.x ?? 0), (attacker.y ?? 0) - (target.y ?? 0));
  return distance <= attackRadius(attacker);
}

export function attack(attacker, target, game, label) {
  if (!canAttack(attacker, target)) return false;
  faceToward(attacker, target);
  attacker.anim = 'attack';
  attacker.animTtl = 0.35;
  const damage = Math.min(target.hp, Math.max(1, Math.round(attacker.atk * attackMultiplier(attacker))));
  target.hp = Math.max(0, target.hp - damage);
  game.metrics ??= { allyDamage: 0, enemyDamage: 0, lordDamage: 0 };
  if (attacker.type === 'enemy' && target.type === 'boss') game.metrics.lordDamage += damage;
  else if (attacker.type === 'enemy') game.metrics.enemyDamage += damage;
  else game.metrics.allyDamage += damage;
  attacker.attackClock = attackCooldown(attacker);
  const side = attacker.type === 'enemy' ? 'enemy-hit' : 'ally-hit';
  const ranged = (attacker.range ?? 1) > 1;
  const hitDelay = ranged ? 0.22 : 0.16;
  if (ranged) {
    const samePoint = Math.hypot((attacker.x ?? 0) - (target.x ?? 0), (attacker.y ?? 0) - (target.y ?? 0)) < 8;
    pushEffect(game, {
      id: crypto.randomUUID(),
      type: `projectile ${projectileKind(attacker)} ${side}`,
      room: target.room,
      x: samePoint ? (attacker.x ?? 0) - 24 : attacker.x,
      y: samePoint ? (attacker.y ?? 0) - 12 : attacker.y,
      toX: samePoint ? (target.x ?? 0) + 24 : target.x,
      toY: samePoint ? (target.y ?? 0) + 12 : target.y,
      ttl: 0.34,
      label: ''
    });
  } else {
    pushEffect(game, {
      id: crypto.randomUUID(),
      type: `swing ${side}`,
      room: target.room,
      x: target.x,
      y: target.y,
      ttl: 0.28,
      label: ''
    });
  }
  pushEffect(game, {
    id: crypto.randomUUID(),
    type: `hit ${side}`,
    room: target.room,
    x: target.x,
    y: target.y,
    delay: hitDelay,
    ttl: 0.62,
    label: `-${damage}`
  });
  triggerSkills(attacker, target, game);
  return true;
}

export function moveUnit(unit, targetRoom, dt, game = null) {
  if (!targetRoom || unit.room === targetRoom) return false;
  const stepRoom = roomById[unit.movingTo] ? unit.movingTo : nextStep(unit.room, targetRoom, game);
  if (!unit.routePoints || unit.routeTarget !== stepRoom) {
    unit.routeTarget = stepRoom;
    unit.routePoints = movementRoute(game, unit.room, stepRoom, unit);
  }
  const destination = unit.routePoints[0];
  if (!destination) return false;
  unit.movingTo = stepRoom;

  const dx = destination.x - unit.x;
  const dy = destination.y - unit.y;
  const dist = Math.hypot(dx, dy);
  const travel = unitSpeed(unit) * dt;
  unit.facing = facingFromDelta(dx, dy);
  unit.anim = 'walk';

  if (dist <= travel) {
    unit.x = destination.x;
    unit.y = destination.y;
    unit.routePoints.shift();
    if (!unit.routePoints.length) {
      unit.room = stepRoom;
      unit.movingTo = null;
      unit.routeTarget = null;
      unit.routePoints = null;
      return true;
    }
    return false;
  }

  unit.x += (dx / dist) * travel;
  unit.y += (dy / dist) * travel;
  return false;
}

export function approachTarget(unit, target, dt, game = null) {
  if (!target) return false;
  if (unit.movingTo) return moveUnit(unit, unit.movingTo, dt, game);
  if (unit.room !== target.room) return moveUnit(unit, target.room, dt, game);

  const dx = (target.x ?? 0) - (unit.x ?? 0);
  const dy = (target.y ?? 0) - (unit.y ?? 0);
  const dist = Math.hypot(dx, dy);
  unit.facing = facingFromDelta(dx, dy);
  const desired = Math.max(18, attackRadius(unit) * 0.82);
  if (dist <= desired || dist === 0) return false;

  const travel = Math.min(unitSpeed(unit) * dt, dist - desired);
  unit.x += (dx / dist) * travel;
  unit.y += (dy / dist) * travel;
  return travel > 0;
}

export function enemyDiscoverRoom(game, enemy) {
  game.partyKnowledge.visited.add(enemy.room);
  if (enemy.room === 'throne') {
    enemy.knowsThrone = true;
    if (!game.partyKnowledge.throneKnown) {
      addLog(game, '魔王部屋が発見された。');
      game.effects.push({ id: crypto.randomUUID(), type: 'found', room: 'throne', ttl: 1.2, label: '!' });
    }
    game.partyKnowledge.throneKnown = true;
  }
  for (const next of roomConnections(game, enemy.room)) {
    if (roomById[next].type === 'throne') {
      enemy.knowsThrone = true;
      game.partyKnowledge.throneKnown = true;
    }
  }
}
