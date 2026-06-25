import { addLog } from '../game/state.js';
import { items } from '../data/items.js';
import { roomById } from '../data/rooms.js';
import { isRoomBuilt, roomLevel } from './placement.js';

export function inventoryLimit(game) {
  const treasure = roomById.treasure;
  const bonus = isRoomBuilt(game, 'treasure') ? (treasure.effect?.value ?? 0) + roomLevel(game, 'treasure') * 2 : 0;
  return 6 + bonus;
}

export function researchCost(game, baseCost, kind = 'chip') {
  const libraryDiscount = isRoomBuilt(game, 'library') ? roomById.library.effect?.value ?? 0 : 0;
  const nestDiscount = kind === 'monster' && isRoomBuilt(game, 'nest') ? roomById.nest.effect?.value ?? 0 : 0;
  return Math.max(30, baseCost - libraryDiscount - nestDiscount);
}

function removeOneItem(game) {
  const itemId = Object.keys(game.inventory ?? {}).find((id) => game.inventory[id] > 0);
  if (!itemId) return null;
  game.inventory[itemId] -= 1;
  return itemId;
}

export function resolveEnemyRoomEffects(game, enemy) {
  const room = roomById[enemy.room];
  if (!room || !isRoomBuilt(game, room.id)) return;
  enemy.roomRisksTriggered ??= new Set();

  const objectId = game.roomObjects?.[room.id];
  const objectKey = `${room.id}:${objectId}`;
  if (objectId === 'spikeTrap' && !enemy.roomRisksTriggered.has(objectKey)) {
    enemy.roomRisksTriggered.add(objectKey);
    const damage = Math.min(enemy.hp, 8 + roomLevel(game, room.id) * 2);
    enemy.hp = Math.max(0, enemy.hp - damage);
    addLog(game, `${room.name}の棘罠が${enemy.name}に${damage}ダメージ。`);
    game.effects.push({ id: crypto.randomUUID(), type: 'hit ally-hit', room: room.id, x: enemy.x, y: enemy.y, ttl: 0.7, label: `罠 -${damage}` });
  }

  if (!room.risk) return;
  const riskKey = `${room.id}:risk`;
  if (enemy.roomRisksTriggered.has(riskKey)) return;
  enemy.roomRisksTriggered.add(riskKey);

  if (room.risk.kind === 'plunder') {
    const loss = Math.min(game.gold ?? 0, 10 + roomLevel(game, room.id) * 6);
    const stolenItem = removeOneItem(game);
    game.gold = Math.max(0, (game.gold ?? 0) - loss);
    const itemText = stolenItem ? ` / ${items[stolenItem]?.name ?? stolenItem}-1` : '';
    addLog(game, `${room.name}が荒らされた。G-${loss}${itemText}。`);
    game.effects.push({ id: crypto.randomUUID(), type: 'status', room: room.id, x: room.x, y: room.y - 24, ttl: 1.1, label: '略奪' });
  }

  if (room.risk.kind === 'knowledgeLeak') {
    enemy.knowsThrone = true;
    game.partyKnowledge.throneKnown = true;
    addLog(game, `${room.name}を読まれ、魔王部屋の手掛かりを掴まれた。`);
    game.effects.push({ id: crypto.randomUUID(), type: 'found', room: room.id, ttl: 1.1, label: '!' });
  }

  if (room.risk.kind === 'panic') {
    for (const ally of game.allies.filter((unit) => unit.room === room.id && unit.hp > 0)) {
      ally.attackClock = Math.max(ally.attackClock ?? 0, 1.2);
    }
    addLog(game, `${room.name}が混乱し、配下の反応が遅れた。`);
  }

  if (room.risk.kind === 'armedInvader') {
    enemy.atk += 1;
    addLog(game, `${enemy.name}が${room.name}の武具を奪いATK+1。`);
    game.effects.push({ id: crypto.randomUUID(), type: 'status might', room: room.id, x: enemy.x, y: enemy.y - 20, ttl: 0.9, label: '武装' });
  }
}

export function tickRoomObjects(game, dt) {
  for (const [roomId, objectId] of Object.entries(game.roomObjects ?? {})) {
    if (objectId !== 'healingSpring') continue;
    const units = [...game.allies, ...game.enemies].filter((unit) => unit.room === roomId && unit.hp > 0 && unit.hp < unit.maxHp);
    for (const unit of units) unit.hp = Math.min(unit.maxHp, +(unit.hp + 1.2 * dt).toFixed(2));
  }
}

export function tryReviveEnemyAtSavePoint(game, enemy) {
  if (game.roomObjects?.[enemy.room] !== 'savePoint' || enemy.saveRevived) return false;
  enemy.saveRevived = true;
  enemy.hp = Math.max(1, Math.round(enemy.maxHp * 0.5));
  enemy.attackClock = 0.9;
  addLog(game, `${enemy.name}がセーブポイントから復活。`);
  game.effects.push({ id: crypto.randomUUID(), type: 'status', room: enemy.room, x: enemy.x, y: enemy.y - 24, ttl: 1.1, label: '復活' });
  return true;
}
