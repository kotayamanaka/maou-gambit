import { chips } from '../data/chips.js';
import { roomById } from '../data/rooms.js';
import { distanceRooms, nearestRoom, nextStep } from './path.js';

function liveEnemies(game) {
  return game.enemies.filter((enemy) => enemy.hp > 0);
}

function conditionTarget(game, unit, condition) {
  const enemies = liveEnemies(game);
  if (condition === 'always') return true;
  if (condition === 'enemyInRange') {
    return enemies.find((enemy) => distanceRooms(unit.room, enemy.room) <= unit.range);
  }
  if (condition === 'nearestEnemy') {
    return enemies.sort((a, b) => distanceRooms(unit.room, a.room) - distanceRooms(unit.room, b.room))[0];
  }
  if (condition === 'weakEnemy') {
    return enemies.filter((enemy) => enemy.hp / enemy.maxHp <= 0.55)
      .sort((a, b) => a.hp - b.hp || distanceRooms(unit.room, a.room) - distanceRooms(unit.room, b.room))[0];
  }
  if (condition === 'mageEnemy') {
    return enemies.find((enemy) => enemy.templateId === 'mage');
  }
  if (condition === 'knowsThroneEnemy') {
    return enemies.find((enemy) => enemy.knowsThrone);
  }
  if (condition === 'downedEnemy') {
    if (unit.carry <= 0) return null;
    return game.downed.filter((body) => !body.carriedBy)
      .sort((a, b) => distanceRooms(unit.room, a.room) - distanceRooms(unit.room, b.room))[0];
  }
  return null;
}

export function decideAllyAction(game, unit) {
  if (unit.carrying) return { type: 'carry', targetRoom: 'jail' };

  for (const chipId of unit.chips) {
    const chip = chips[chipId];
    if (!chip) continue;
    const target = conditionTarget(game, unit, chip.condition);
    if (!target) continue;
    if (chip.action === 'attack') return { type: 'attack', target };
    if (chip.action === 'moveToTarget') return { type: 'move', targetRoom: target.room, target };
    if (chip.action === 'carryToJail') return { type: 'pickup', target };
    if (chip.action === 'moveAtrium') return { type: 'move', targetRoom: 'atrium' };
    if (chip.action === 'moveHallB') return { type: 'move', targetRoom: 'hallB' };
  }

  return { type: 'idle' };
}

export function decideEnemyMove(game, enemy) {
  if (enemy.room === 'throne') return { type: 'attackLord' };

  if (enemy.knowsThrone || game.partyKnowledge.throneKnown) {
    enemy.knowsThrone = true;
    return { type: 'move', targetRoom: nextStep(enemy.room, 'throne') };
  }

  const current = roomById[enemy.room];
  const unvisited = current.connections.filter((id) => !game.partyKnowledge.visited.has(id));
  const destination = unvisited[0] ?? nearestRoom(enemy.room, current.connections);
  return { type: 'move', targetRoom: destination };
}
