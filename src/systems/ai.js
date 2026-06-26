import { chips } from '../data/chips.js';
import { roomById, rooms } from '../data/rooms.js';
import { distanceRooms, nearestRoom, nextStep } from './path.js';
import { canPlaceAlly, isRoomBuilt } from './placement.js';

function liveEnemies(game) {
  return game.enemies.filter((enemy) => enemy.hp > 0);
}

function canAttackFrom(unit, target) {
  return unit.room === target.room;
}

function nearestByDistance(game, unit, enemies) {
  return [...enemies].sort((a, b) => (
    distanceRooms(unit.room, a.room, game) - distanceRooms(unit.room, b.room, game)
    || distanceRooms(a.room, 'throne', game) - distanceRooms(b.room, 'throne', game)
  ))[0];
}

function distanceTo(unit, target) {
  return Math.hypot((unit.x ?? 0) - (target.x ?? 0), (unit.y ?? 0) - (target.y ?? 0));
}

function sameRoomDowned(game, unit) {
  if (unit.carry <= 0) return [];
  return game.downed.filter((body) => !body.carriedBy && body.room === unit.room);
}

function downedPriority(unit, body) {
  const difficulty = body.capture?.difficulty ?? 1;
  const ttl = body.ttl ?? 12;
  const urgent = ttl <= 5 ? 2 : 0;
  return difficulty * 10 + urgent - ttl * 0.08 - distanceTo(unit, body) * 0.01;
}

function bestDownedTarget(game, unit) {
  return sameRoomDowned(game, unit)
    .sort((a, b) => downedPriority(unit, b) - downedPriority(unit, a))[0];
}

function urgentDownedTarget(game, unit) {
  return sameRoomDowned(game, unit)
    .filter((body) => {
      const difficulty = body.capture?.difficulty ?? 1;
      const ttl = body.ttl ?? 12;
      return difficulty >= 4 && ttl <= 7;
    })
    .sort((a, b) => downedPriority(unit, b) - downedPriority(unit, a))[0];
}

function conditionTarget(game, unit, condition) {
  const enemies = liveEnemies(game).filter((enemy) => enemy.room === unit.room);
  if (condition === 'always') return true;
  if (condition === 'enemyInRange') {
    return enemies.find((enemy) => canAttackFrom(unit, enemy));
  }
  if (condition === 'nearestEnemy') {
    return nearestByDistance(game, unit, enemies);
  }
  if (condition === 'weakEnemy') {
    return enemies.filter((enemy) => enemy.hp / enemy.maxHp <= 0.55)
      .sort((a, b) => a.hp - b.hp || distanceRooms(unit.room, a.room, game) - distanceRooms(unit.room, b.room, game))[0];
  }
  if (condition === 'mageEnemy') {
    return enemies.find((enemy) => ['mage', 'cleric', 'alchemist', 'sage'].includes(enemy.templateId));
  }
  if (condition === 'rangedEnemy') {
    return enemies.find((enemy) => (enemy.range ?? 1) > 1);
  }
  if (condition === 'rareEnemy') {
    return enemies.find((enemy) => (enemy.capture?.difficulty ?? 1) >= 3);
  }
  if (condition === 'knowsThroneEnemy') {
    return enemies.find((enemy) => enemy.knowsThrone);
  }
  if (condition === 'downedEnemy') {
    return bestDownedTarget(game, unit);
  }
  return null;
}

export function decideAllyAction(game, unit) {
  if (unit.carrying) return { type: 'carry', targetRoom: 'jail' };
  const homeRoom = unit.homeRoom ?? unit.room;
  if (unit.movingTo) return { type: 'move', targetRoom: unit.movingTo };
  if (unit.chips.includes('carryDowned')) {
    const urgentBody = urgentDownedTarget(game, unit);
    if (urgentBody) return { type: 'pickup', target: urgentBody };
  }

  const orderedChips = [...unit.chips].sort((a, b) => {
    const aAction = chips[a]?.action;
    const bAction = chips[b]?.action;
    const priority = { moveToTarget: 0, attack: 1, carryToJail: 2, returnHome: 3, moveHallB: 3 };
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
    if (chip.action === 'returnHome' && isRoomBuilt(game, homeRoom)) return { type: 'move', targetRoom: homeRoom };
    if (chip.action === 'moveHallB' && canPlaceAlly(game, 'hallB', unit)) return { type: 'move', targetRoom: 'hallB' };
  }

  if (unit.chips.includes('carryDowned') && unit.room !== homeRoom && isRoomBuilt(game, homeRoom)) {
    return { type: 'move', targetRoom: homeRoom };
  }

  return { type: 'idle' };
}

function sameRoomAllies(game, enemy) {
  return game.allies.filter((ally) => ally.hp > 0 && ally.room === enemy.room);
}

function enemyAllyTarget(game, enemy) {
  const allies = sameRoomAllies(game, enemy);
  if (!allies.length) return null;
  if (enemy.chips?.includes('focusWeakAlly')) {
    return [...allies].sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp) || a.hp - b.hp)[0];
  }
  if (enemy.chips?.includes('engageGuard')) return allies[0];
  return null;
}

export function decideEnemyAction(game, enemy) {
  if (enemy.movingTo) return { type: 'move', targetRoom: enemy.movingTo };
  const allyTarget = enemyAllyTarget(game, enemy);
  if (allyTarget) return { type: 'attackAlly', target: allyTarget };

  if (enemy.room === 'throne') return { type: 'attackLord' };

  if (enemy.knowsThrone || game.partyKnowledge.throneKnown) {
    enemy.knowsThrone = true;
    return { type: 'move', targetRoom: nextStep(enemy.room, 'throne', game) };
  }

  const current = roomById[enemy.room];
  const connections = game.roomConnections?.[enemy.room] ?? current.connections;
  const unvisited = connections.filter((id) => isRoomBuilt(game, id) && !game.partyKnowledge.visited.has(id));
  const remainingRooms = rooms
    .filter((room) => isRoomBuilt(game, room.id) && room.id !== 'entrance' && !game.partyKnowledge.visited.has(room.id))
    .map((room) => room.id);
  const destination = unvisited[0] ?? nearestRoom(enemy.room, remainingRooms, game) ?? nearestRoom(enemy.room, connections, game);
  return { type: 'move', targetRoom: destination };
}
