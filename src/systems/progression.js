import { allyTemplates } from '../data/units.js';
import { chips } from '../data/chips.js';
import { items } from '../data/items.js';
import { roomObjects } from '../data/objects.js';
import { currentStage, addLog, resetToSetup } from '../game/state.js';
import { stages } from '../data/stages.js';
import { rooms, roomById } from '../data/rooms.js';
import { firstOpenAllyRoom, isRoomBuilt, roomCapacity, roomLevel } from './placement.js';
import { applyFeedGrowth } from './growth.js';
import { researchCost } from './roomEffects.js';
import { canConnectRoom } from './path.js';

export const CHIP_RESEARCH_COST = 70;
export const MONSTER_RESEARCH_COST = 120;
export const DEMOLISH_ROOM_COST = 90;

function createAllyFromTemplate(game, template, sourceLabel = '召喚') {
  const room = firstOpenAllyRoom(game);
  const unit = {
    uid: `${template.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    templateId: template.id,
    name: template.name,
    type: template.type,
    role: template.role,
    sprite: template.sprite,
    spriteSet: template.spriteSet ? structuredClone(template.spriteSet) : null,
    maxHp: template.stats.hp,
    hp: template.stats.hp,
    level: 1,
    exp: 0,
    intExp: 0,
    atk: template.stats.atk,
    spd: template.stats.spd,
    int: template.stats.int,
    carry: template.stats.carry,
    range: template.stats.range,
    skills: [...(template.skills ?? [])],
    traits: [...(template.traits ?? [])],
    room,
    homeRoom: room,
    x: roomById[room].x,
    y: roomById[room].y,
    facing: 'front',
    anim: 'idle',
    animTtl: 0,
    movingTo: null,
    chips: [],
    moveClock: 0,
    attackClock: 0,
    carrying: null,
    status: []
  };
  game.allies.push(unit);
  game.collections?.allies?.add?.(template.id);
  addLog(game, `${sourceLabel}: ${template.name}が配下に加わった。`);
  return unit;
}

function discoverChip(game, chipId, label) {
  if (!chips[chipId]) return false;
  game.chipBag[chipId] = (game.chipBag[chipId] ?? 0) + 1;
  game.collections?.chips?.add?.(chipId);
  game.chipUnlocks = [`${label}: ${chips[chipId].name} +1`, ...(game.chipUnlocks ?? [])].slice(0, 6);
  return true;
}

function spendGold(game, amount) {
  if ((game.gold ?? 0) < amount) return false;
  game.gold -= amount;
  return true;
}

export function sellItem(game, itemId) {
  const count = game.inventory?.[itemId] ?? 0;
  const item = items[itemId];
  if (!item || count <= 0) return false;
  game.inventory[itemId] = count - 1;
  game.gold = (game.gold ?? 0) + item.value;
  addLog(game, `${item.name}を売却。G+${item.value}。`);
  return true;
}

function connectRooms(game, a, b) {
  game.roomConnections ??= {};
  game.roomConnections[a] ??= [];
  game.roomConnections[b] ??= [];
  if (!game.roomConnections[a].includes(b)) game.roomConnections[a].push(b);
  if (!game.roomConnections[b].includes(a)) game.roomConnections[b].push(a);
}

function disconnectRoom(game, roomId) {
  game.roomConnections ??= {};
  for (const target of game.roomConnections[roomId] ?? []) {
    game.roomConnections[target] = (game.roomConnections[target] ?? []).filter((id) => id !== roomId);
  }
  game.roomConnections[roomId] = [];
}

export function buildRoom(game, roomId, fromRoomId = null) {
  const room = roomById[roomId];
  if (!room || isRoomBuilt(game, roomId)) return false;
  const from = fromRoomId ?? game.selectedBuildFrom ?? 'atrium';
  if (!isRoomBuilt(game, from) || !canConnectRoom(game, from) || !canConnectRoom(game, roomId)) return false;
  const cost = room.buildCost ?? 120;
  if (!spendGold(game, cost)) return false;
  game.builtRooms ??= new Set(rooms.filter((item) => item.built).map((item) => item.id));
  game.builtRooms.add(roomId);
  game.roomLevels ??= {};
  game.roomLevels[roomId] ??= 1;
  connectRooms(game, from, roomId);
  addLog(game, `${roomById[from].name}から${room.name}へ通路を繋いで建設。G-${cost}。`);
  return true;
}

export function demolishRoom(game, roomId) {
  const room = roomById[roomId];
  if (!room || room.built || !isRoomBuilt(game, roomId)) return false;
  if (game.allies.some((unit) => unit.room === roomId || unit.homeRoom === roomId)) return false;
  if (game.roomObjects?.[roomId]) return false;
  if (!spendGold(game, DEMOLISH_ROOM_COST)) return false;
  game.builtRooms.delete(roomId);
  disconnectRoom(game, roomId);
  game.roomCapacityBonus ??= {};
  game.roomCapacityBonus[roomId] = 0;
  addLog(game, `${room.name}を撤去。G-${DEMOLISH_ROOM_COST}。`);
  return true;
}

export function installRoomObject(game, roomId, objectId) {
  const room = roomById[roomId];
  const object = roomObjects[objectId];
  if (!room || !object || !isRoomBuilt(game, roomId)) return false;
  if (room.type === 'spawn' || room.type === 'throne') return false;
  game.roomObjects ??= {};
  if (game.roomObjects[roomId]) return false;
  if (!spendGold(game, object.cost)) return false;
  game.roomObjects[roomId] = objectId;
  addLog(game, `${room.name}に${object.name}を設置。G-${object.cost}。`);
  return true;
}

export function removeRoomObject(game, roomId) {
  const objectId = game.roomObjects?.[roomId];
  if (!objectId) return false;
  const cost = 30;
  if (!spendGold(game, cost)) return false;
  delete game.roomObjects[roomId];
  addLog(game, `${roomById[roomId]?.name ?? roomId}の設備を撤去。G-${cost}。`);
  return true;
}

export function upgradeRoom(game, roomId) {
  const room = roomById[roomId];
  if (!room || !isRoomBuilt(game, roomId) || room.capacity <= 0) return false;
  const level = roomLevel(game, roomId);
  const cost = (room.upgradeCost ?? 120) * level;
  if (!spendGold(game, cost)) return false;
  game.roomLevels ??= {};
  game.roomCapacityBonus ??= {};
  game.roomLevels[roomId] = level + 1;
  game.roomCapacityBonus[roomId] = (game.roomCapacityBonus[roomId] ?? 0) + 1;
  addLog(game, `${room.name}を拡張。容量${roomCapacity(roomId, game)} / G-${cost}。`);
  return true;
}

export function researchChip(game) {
  const cost = researchCost(game, CHIP_RESEARCH_COST, 'chip');
  if (!spendGold(game, cost)) return false;
  const candidates = Object.keys(chips).filter((id) => (game.chipBag[id] ?? 0) < 3);
  const chipId = candidates[Math.floor(Math.random() * candidates.length)];
  if (!chipId) {
    game.gold += cost;
    return false;
  }
  discoverChip(game, chipId, '研究');
  addLog(game, `チップ研究で${chips[chipId].name}を獲得。G-${cost}。`);
  return true;
}

export function researchMonster(game) {
  const cost = researchCost(game, MONSTER_RESEARCH_COST, 'monster');
  if (!spendGold(game, cost)) return false;
  const known = game.collections?.allies ?? new Set(game.allies.map((ally) => ally.templateId));
  const candidates = Object.values(allyTemplates).filter((template) => !known.has(template.id));
  const pool = candidates.length ? candidates : Object.values(allyTemplates);
  const template = pool[Math.floor(Math.random() * pool.length)];
  createAllyFromTemplate(game, template, '魔物研究');
  addLog(game, `魔物研究を実行。G-${cost}。`);
  return true;
}

export function consumeCaptured(game, capturedUid, mode, targetUid) {
  const captured = game.captured.find((item) => item.uid === capturedUid);
  if (!captured) return;

  if (mode === 'convert') {
    const template = allyTemplates[captured.convertTo];
    if (template) createAllyFromTemplate(game, template, `${captured.name}を眷属化`);
  }

  if (mode === 'feed') {
    const target = game.allies.find((unit) => unit.uid === targetUid) ?? game.allies[0];
    const result = applyFeedGrowth(target, captured);
    const gains = [`EXP+${result.material.exp}`];
    if (result.material.intExp) gains.push(`知+${result.material.intExp}`);
    if (result.levelUps) gains.push(`LV+${result.levelUps}`);
    if (result.intUps) gains.push(`INT+${result.intUps}`);
    if (result.diff.maxHp) gains.push(`HP+${result.diff.maxHp}`);
    if (result.diff.atk) gains.push(`ATK+${result.diff.atk}`);
    if (result.diff.spd) gains.push(`SPD+${result.diff.spd}`);
    addLog(game, `${captured.name}を養分化し、${target.name}を強化（${gains.join(' / ') || result.material.label}）。`);
  }

  if (mode === 'research') {
    const candidates = Object.keys(chips).filter((id) => (game.chipBag[id] ?? 0) < 3);
    const chipId = candidates[Math.floor(Math.random() * candidates.length)] ?? 'attack';
    discoverChip(game, chipId, '研究');
    addLog(game, `${captured.name}を研究し、${chips[chipId].name}を獲得。`);
  }

  game.captured = game.captured.filter((item) => item.uid !== capturedUid);
}

export function finishUpgrade(game) {
  const reward = currentStage(game).reward ?? {};
  const rewardChips = [...(reward.chips ?? []), ...(reward.chip ? [reward.chip] : [])];
  for (const rewardChip of rewardChips) {
    discoverChip(game, rewardChip, '報酬');
  }
  if (reward.gold) {
    game.gold = (game.gold ?? 0) + reward.gold;
    addLog(game, `防衛報酬 G+${reward.gold}。`);
  }
  if (game.stageIndex >= stages.length - 1) {
    game.phase = 'victory';
    addLog(game, '二十の侵入を退け、魔王軍の勝利。');
    return;
  }
  game.stageIndex += 1;
  resetToSetup(game);
}
