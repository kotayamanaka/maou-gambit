import { enemyTemplates } from '../data/units.js';
import { roomById } from '../data/rooms.js';
import { addLog } from '../game/state.js';
import { nextStep } from './path.js';

const MELEE_RANGE = 34;

function hashOffset(value = '') {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return (hash % 1000) / 1000;
}

function unitSpeed(unit) {
  const base = unit.type === 'enemy' ? 34 : 48;
  return Math.max(28, (unit.spd || 0.7) * base) / (unit.carrying ? 1.65 : 1);
}

function attackRadius(unit) {
  const range = unit.range ?? 1;
  if (range <= 1) return MELEE_RANGE;
  return 70 + range * 32;
}

function attackCooldown(unit) {
  const speed = Math.max(0.45, unit.spd ?? 1);
  return Math.max(0.62, Math.min(1.45, 1.05 / Math.sqrt(speed)));
}

export function roomPoint(roomId, unit) {
  const room = roomById[roomId];
  if (!room) return { x: unit.x ?? 0, y: unit.y ?? 0 };
  const lane = hashOffset(unit.uid ?? unit.id ?? unit.name) - 0.5;
  const side = unit.type === 'enemy' ? -0.3 : unit.type === 'boss' ? 0.18 : 0.24;
  return {
    x: room.x + Math.min(room.w * Math.abs(side), 48) * Math.sign(side),
    y: room.y + lane * Math.min(room.h * 0.38, 34)
  };
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
      maxHp: template.stats.hp,
      hp: template.stats.hp,
      atk: template.stats.atk,
      spd: template.stats.spd,
      range: template.stats.range,
      chips: [...(template.chips ?? [])],
      convertTo: template.convertTo,
      room: 'entrance',
      x: roomById.entrance.x,
      y: roomById.entrance.y,
      movingTo: null,
      moveClock: 0,
      attackClock: 0,
      searchClock: 0.45,
      knowsThrone: false
    };
    const point = roomPoint('entrance', enemy);
    enemy.x = point.x;
    enemy.y = point.y;
    game.enemies.push(enemy);
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
  const damage = Math.min(target.hp, attacker.atk);
  target.hp = Math.max(0, target.hp - damage);
  game.metrics ??= { allyDamage: 0, enemyDamage: 0, lordDamage: 0 };
  if (attacker.type === 'enemy' && target.type === 'boss') game.metrics.lordDamage += damage;
  else if (attacker.type === 'enemy') game.metrics.enemyDamage += damage;
  else game.metrics.allyDamage += damage;
  attacker.attackClock = attackCooldown(attacker);
  const side = attacker.type === 'enemy' ? 'enemy-hit' : 'ally-hit';
  const ranged = (attacker.range ?? 1) > 1;
  if (ranged) {
    const samePoint = Math.hypot((attacker.x ?? 0) - (target.x ?? 0), (attacker.y ?? 0) - (target.y ?? 0)) < 8;
    game.effects.push({
      id: crypto.randomUUID(),
      type: `projectile ${side}`,
      room: target.room,
      x: samePoint ? (attacker.x ?? 0) - 24 : attacker.x,
      y: samePoint ? (attacker.y ?? 0) - 12 : attacker.y,
      toX: samePoint ? (target.x ?? 0) + 24 : target.x,
      toY: samePoint ? (target.y ?? 0) + 12 : target.y,
      ttl: 0.32,
      label: ''
    });
  }
  game.effects.push({
    id: crypto.randomUUID(),
    type: `hit ${side}`,
    room: target.room,
    x: target.x,
    y: target.y,
    ttl: 0.7,
    label: `${label} -${damage}`
  });
  return true;
}

export function moveUnit(unit, targetRoom, dt) {
  if (!targetRoom || unit.room === targetRoom) return false;
  const stepRoom = roomById[unit.movingTo] ? unit.movingTo : nextStep(unit.room, targetRoom);
  const destination = roomPoint(stepRoom, unit);
  if (!destination) return false;
  unit.movingTo = stepRoom;

  const dx = destination.x - unit.x;
  const dy = destination.y - unit.y;
  const dist = Math.hypot(dx, dy);
  const travel = unitSpeed(unit) * dt;

  if (dist <= travel) {
    unit.x = destination.x;
    unit.y = destination.y;
    unit.room = stepRoom;
    unit.movingTo = null;
    return true;
  }

  unit.x += (dx / dist) * travel;
  unit.y += (dy / dist) * travel;
  return false;
}

export function approachTarget(unit, target, dt) {
  if (!target) return false;
  if (unit.movingTo) return moveUnit(unit, unit.movingTo, dt);
  if (unit.room !== target.room) return moveUnit(unit, target.room, dt);

  const dx = (target.x ?? 0) - (unit.x ?? 0);
  const dy = (target.y ?? 0) - (unit.y ?? 0);
  const dist = Math.hypot(dx, dy);
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
  for (const next of roomById[enemy.room].connections) {
    if (roomById[next].type === 'throne') {
      enemy.knowsThrone = true;
      game.partyKnowledge.throneKnown = true;
    }
  }
}
