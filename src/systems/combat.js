import { enemyTemplates } from '../data/units.js';
import { roomById } from '../data/rooms.js';
import { addLog } from '../game/state.js';
import { distanceRooms, nextStep } from './path.js';

export function spawnDueEnemies(game) {
  for (const spawn of game.waveQueue) {
    if (spawn.spawned || game.elapsed < spawn.delay) continue;
    const template = enemyTemplates[spawn.kind];
    game.enemies.push({
      uid: `enemy-${spawn.id}-${Math.round(game.elapsed * 10)}`,
      templateId: template.id,
      name: template.name,
      sprite: template.sprite,
      maxHp: template.stats.hp,
      hp: template.stats.hp,
      atk: template.stats.atk,
      spd: template.stats.spd,
      range: template.stats.range,
      convertTo: template.convertTo,
      room: 'entrance',
      x: roomById.entrance.x,
      y: roomById.entrance.y,
      movingTo: null,
      moveClock: 0,
      attackClock: 0,
      knowsThrone: false
    });
    spawn.spawned = true;
    addLog(game, `${template.name}が入口から侵入。`);
  }
}

export function attack(attacker, target, game, label) {
  if (distanceRooms(attacker.room, target.room) > attacker.range) return false;
  target.hp = Math.max(0, target.hp - attacker.atk);
  attacker.attackClock = 1.05;
  game.effects.push({ id: crypto.randomUUID(), type: 'hit', room: target.room, ttl: 0.45, label });
  return true;
}

export function moveUnit(unit, targetRoom, dt) {
  if (!targetRoom || unit.room === targetRoom) return false;
  const stepRoom = roomById[unit.movingTo] ? unit.movingTo : nextStep(unit.room, targetRoom);
  const destination = roomById[stepRoom];
  if (!destination) return false;
  unit.movingTo = stepRoom;

  const dx = destination.x - unit.x;
  const dy = destination.y - unit.y;
  const dist = Math.hypot(dx, dy);
  const speed = Math.max(5, (unit.spd || 0.7) * 18) / (unit.carrying ? 1.65 : 1);
  const travel = speed * dt;

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
