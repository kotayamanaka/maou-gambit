import { chips } from '../data/chips.js';
import { roomById } from '../data/rooms.js';
import { distanceRooms, nearestRoom, nextStep } from './path.js';

function liveEnemies(game) {
  return game.enemies.filter((enemy) => enemy.hp > 0);
}

function canAttackFrom(unit, target) {
  const roomDistance = distanceRooms(unit.room, target.room);
  return unit.range > 1 ? roomDistance <= unit.range : roomDistance === 0;
}

function nearestByDistance(unit, enemies) {
  return [...enemies].sort((a, b) => (
    distanceRooms(unit.room, a.room) - distanceRooms(unit.room, b.room)
    || distanceRooms(a.room, 'throne') - distanceRooms(b.room, 'throne')
  ))[0];
}

function mostUrgentEnemy(game, unit, enemies = liveEnemies(game)) {
  return [...enemies].sort((a, b) => {
    const aThreat = distanceRooms(a.room, 'throne') + (a.knowsThrone ? -1.5 : 0);
    const bThreat = distanceRooms(b.room, 'throne') + (b.knowsThrone ? -1.5 : 0);
    return aThreat - bThreat || distanceRooms(unit.room, a.room) - distanceRooms(unit.room, b.room);
  })[0];
}

function hasBroadInterceptChip(unit) {
  return unit.chips.some((chipId) => ['attack', 'chaseNearest', 'focusWeak', 'focusKnower'].includes(chipId));
}

function isPressureEnemy(enemy, unit) {
  return enemy.knowsThrone || distanceRooms(enemy.room, 'throne') <= 2 || distanceRooms(unit.room, enemy.room) <= 1;
}

function conditionTarget(game, unit, condition) {
  const enemies = liveEnemies(game);
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
    return game.downed.filter((body) => !body.carriedBy)
      .sort((a, b) => distanceRooms(unit.room, a.room) - distanceRooms(unit.room, b.room))[0];
  }
  return null;
}

export function decideAllyAction(game, unit) {
  if (unit.manualTargetRoom && unit.room !== unit.manualTargetRoom) {
    return { type: 'move', targetRoom: unit.manualTargetRoom, manual: true };
  }
  if (unit.manualTargetRoom && unit.room === unit.manualTargetRoom) {
    unit.manualTargetRoom = null;
  }

  if (unit.carrying) return { type: 'carry', targetRoom: 'jail' };

  const enemies = liveEnemies(game);
  const attackable = enemies.find((enemy) => canAttackFrom(unit, enemy));
  if (attackable) return { type: 'attack', target: attackable, priority: 'immediate' };

  const pressureEnemy = mostUrgentEnemy(game, unit, enemies.filter((enemy) => isPressureEnemy(enemy, unit)));
  if (pressureEnemy && hasBroadInterceptChip(unit)) {
    return { type: 'move', targetRoom: pressureEnemy.room, target: pressureEnemy, priority: 'intercept' };
  }

  const orderedChips = [...unit.chips].sort((a, b) => {
    const aAction = chips[a]?.action;
    const bAction = chips[b]?.action;
    const priority = { attack: 0, moveToTarget: 1, carryToJail: 2, moveAtrium: 3, moveHallB: 3 };
    return (priority[aAction] ?? 9) - (priority[bAction] ?? 9);
  });

  for (const chipId of orderedChips) {
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

  const nearbyEnemy = nearestByDistance(unit, enemies.filter((enemy) => distanceRooms(unit.room, enemy.room) <= 2));
  if (nearbyEnemy && hasBroadInterceptChip(unit)) {
    return { type: 'move', targetRoom: nearbyEnemy.room, target: nearbyEnemy, priority: 'patrolIntercept' };
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
