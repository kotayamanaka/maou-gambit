import { chips } from '../data/chips.js';
import { roomById, rooms } from '../data/rooms.js';
import { distanceRooms, nearestRoom, nextStep } from './path.js';
import { canPlaceAlly } from './placement.js';

function liveEnemies(game) {
  return game.enemies.filter((enemy) => enemy.hp > 0);
}

function canAttackFrom(unit, target) {
  return unit.room === target.room;
}

function nearestByDistance(unit, enemies) {
  return [...enemies].sort((a, b) => (
    distanceRooms(unit.room, a.room) - distanceRooms(unit.room, b.room)
    || distanceRooms(a.room, 'throne') - distanceRooms(b.room, 'throne')
  ))[0];
}

function conditionTarget(game, unit, condition) {
  const enemies = liveEnemies(game).filter((enemy) => enemy.room === unit.room);
  if (condition === 'always') return true;
  if (condition === 'enemyInRange') {
    return enemies.find((enemy) => canAttackFrom(unit, enemy));
  }
  if (condition === 'nearestEnemy') {
    return nearestByDistance(unit, enemies);
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
    return game.downed.filter((body) => !body.carriedBy && body.room === unit.room)
      .sort((a, b) => distanceRooms(unit.room, a.room) - distanceRooms(unit.room, b.room))[0];
  }
  return null;
}

export function decideAllyAction(game, unit) {
  if (unit.carrying) return { type: 'carry', targetRoom: 'jail' };

  const orderedChips = [...unit.chips].sort((a, b) => {
    const aAction = chips[a]?.action;
    const bAction = chips[b]?.action;
    const priority = { moveToTarget: 0, attack: 1, carryToJail: 2, moveAtrium: 3, moveHallB: 3 };
    return (priority[aAction] ?? 9) - (priority[bAction] ?? 9);
  });

  for (const chipId of orderedChips) {
    const chip = chips[chipId];
    if (!chip) continue;
    const target = conditionTarget(game, unit, chip.condition);
    if (!target) continue;
    if (chip.action === 'attack') return { type: 'attack', target };
    if (chip.action === 'moveToTarget') return { type: 'attack', target };
    if (chip.action === 'carryToJail') return { type: 'pickup', target };
    if (chip.action === 'moveAtrium' && canPlaceAlly(game, 'atrium', unit)) return { type: 'move', targetRoom: 'atrium' };
    if (chip.action === 'moveHallB' && canPlaceAlly(game, 'hallB', unit)) return { type: 'move', targetRoom: 'hallB' };
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
  const remainingRooms = rooms
    .filter((room) => room.id !== 'entrance' && !game.partyKnowledge.visited.has(room.id))
    .map((room) => room.id);
  const destination = unvisited[0] ?? nearestRoom(enemy.room, remainingRooms) ?? nearestRoom(enemy.room, current.connections);
  return { type: 'move', targetRoom: destination };
}
