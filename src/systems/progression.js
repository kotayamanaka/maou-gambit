import { allyTemplates } from '../data/units.js';
import { chips } from '../data/chips.js';
import { items } from '../data/items.js';
import { roomObjects } from '../data/objects.js';
import { currentStage, addLog, resetToSetup } from '../game/state.js';
import { stages } from '../data/stages.js';
import { buildSlots, rooms, roomById, roomView, slotTaken } from '../data/rooms.js';
import { firstOpenAllyRoom, isRoomBuilt, roomCapacity, roomLevel } from './placement.js';
import { applyFeedGrowth, applyGrowthMaterial, nextIntExp, growthProfile } from './growth.js';
import { researchCost } from './roomEffects.js';
import { canConnectRoom } from './path.js';

export const CHIP_RESEARCH_COST = 70;
export const CHIP_DEVELOPMENT_BASE_COST = 36;
export const MONSTER_RESEARCH_COST = 120;
export const DEMOLISH_ROOM_COST = 90;

export const monsterRarities = {
  starter: { id: 'starter', name: '初期', icon: '◆', weight: 6 },
  common: { id: 'common', name: '通常', icon: '○', weight: 52 },
  uncommon: { id: 'uncommon', name: '変異', icon: '◇', weight: 28 },
  rare: { id: 'rare', name: '希少', icon: '☆', weight: 12 },
  epic: { id: 'epic', name: '伝説', icon: '★', weight: 4 }
};

const fusionRarityMaterials = {
  starter: { exp: 8, intExp: 0, bonuses: { maxHp: 2 } },
  common: { exp: 12, intExp: 1, bonuses: { maxHp: 2 } },
  uncommon: { exp: 16, intExp: 2, bonuses: { maxHp: 3 } },
  rare: { exp: 24, intExp: 3, bonuses: { maxHp: 4, atk: 1 } },
  epic: { exp: 34, intExp: 5, bonuses: { maxHp: 5, atk: 1, spd: 0.03 } }
};

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
    x: roomView(game, room).x,
    y: roomView(game, room).y,
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

function monsterResearchCandidates(game) {
  const known = game.collections?.allies ?? new Set(game.allies.map((ally) => ally.templateId));
  const unknown = Object.values(allyTemplates).filter((template) => !known.has(template.id));
  return unknown.length ? unknown : Object.values(allyTemplates);
}

export function monsterResearchPreview(game) {
  const pool = monsterResearchCandidates(game);
  const summary = {};
  let totalWeight = 0;
  let rareWeight = 0;
  for (const template of pool) {
    const rarity = monsterRarities[template.rarity ?? 'common'] ?? monsterRarities.common;
    summary[rarity.id] = (summary[rarity.id] ?? 0) + 1;
    totalWeight += rarity.weight;
    if (rarity.id === 'rare' || rarity.id === 'epic') rareWeight += rarity.weight;
  }
  return {
    total: pool.length,
    summary,
    rareRate: totalWeight ? Math.round((rareWeight / totalWeight) * 100) : 0
  };
}

function chooseMonsterResearchTemplate(game) {
  const pool = monsterResearchCandidates(game);
  const weighted = pool.map((template) => ({
    template,
    weight: (monsterRarities[template.rarity ?? 'common'] ?? monsterRarities.common).weight
  }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.template;
  }
  return weighted[weighted.length - 1]?.template;
}

export function fusionMaterialForAlly(unit) {
  const template = allyTemplates[unit.templateId];
  const rarity = monsterRarities[template?.rarity ?? 'common'] ?? monsterRarities.common;
  const base = fusionRarityMaterials[rarity.id] ?? fusionRarityMaterials.common;
  const bonuses = { ...base.bonuses };
  let intExp = base.intExp;
  if ((unit.maxHp ?? 0) >= 70) bonuses.maxHp = (bonuses.maxHp ?? 0) + 2;
  if ((unit.atk ?? 0) >= 8) bonuses.atk = (bonuses.atk ?? 0) + 1;
  if ((unit.spd ?? 0) >= 1.3) bonuses.spd = Math.round(((bonuses.spd ?? 0) + 0.04) * 100) / 100;
  if ((unit.int ?? 0) >= 3) intExp += 1;
  const parts = [`経験+${base.exp}`, `知識+${intExp}`];
  if (bonuses.maxHp) parts.push(`体力+${bonuses.maxHp}`);
  if (bonuses.atk) parts.push(`攻撃+${bonuses.atk}`);
  if (bonuses.spd) parts.push(`速さ+${bonuses.spd}`);
  return {
    exp: base.exp,
    intExp,
    bonuses,
    label: `${rarity.icon}${rarity.name}素材 ${parts.join(' ')}`
  };
}

export function fuseAlly(game, targetUid, materialUid) {
  if (!targetUid || !materialUid || targetUid === materialUid || game.allies.length <= 1) return false;
  const target = game.allies.find((unit) => unit.uid === targetUid);
  const material = game.allies.find((unit) => unit.uid === materialUid);
  if (!target || !material) return false;
  const result = applyGrowthMaterial(target, fusionMaterialForAlly(material));
  const gains = [`経験+${result.material.exp}`];
  if (result.material.intExp) gains.push(`知識+${result.material.intExp}`);
  if (result.levelUps) gains.push(`Lv+${result.levelUps}`);
  if (result.intUps) gains.push(`知性+${result.intUps}`);
  if (result.diff.maxHp) gains.push(`体力+${result.diff.maxHp}`);
  if (result.diff.atk) gains.push(`攻撃+${result.diff.atk}`);
  if (result.diff.spd) gains.push(`速さ+${result.diff.spd}`);
  const room = target.homeRoom ?? target.room;
  target.room = room;
  target.homeRoom = room;
  target.x = roomView(game, room)?.x ?? target.x;
  target.y = roomView(game, room)?.y ?? target.y;
  target.carrying = null;
  game.allies = game.allies.filter((unit) => unit.uid !== materialUid);
  game.selectedUnitId = target.uid;
  game.selectedFusionId = game.allies.find((unit) => unit.uid !== target.uid)?.uid ?? null;
  addLog(game, `${material.name}を合成素材にし、${target.name}を強化（${gains.join(' / ')}）。`);
  return true;
}

function consumeInventory(game, itemId) {
  const count = game.inventory?.[itemId] ?? 0;
  if (count <= 0 || !items[itemId]) return null;
  game.inventory[itemId] = count - 1;
  return items[itemId];
}

export function sellItem(game, itemId) {
  const item = consumeInventory(game, itemId);
  if (!item) return false;
  game.gold = (game.gold ?? 0) + item.value;
  addLog(game, `${item.name}を売却。G+${item.value}。`);
  return true;
}

function applyIntExp(unit, amount) {
  const profile = growthProfile(unit);
  unit.intExp = (unit.intExp ?? 0) + amount;
  let intUps = 0;
  while (unit.int < profile.maxInt && unit.intExp >= nextIntExp(unit)) {
    unit.intExp -= nextIntExp(unit);
    unit.int += 1;
    intUps += 1;
  }
  if (unit.int >= profile.maxInt) unit.intExp = Math.min(unit.intExp, nextIntExp(unit) - 1);
  return intUps;
}

export function useItemOnUnit(game, itemId, unitId) {
  const item = items[itemId];
  const effect = item?.use;
  const unit = game.allies.find((ally) => ally.uid === unitId);
  if (!item || !effect || effect.target !== 'ally' || !unit) return false;
  const consumed = consumeInventory(game, itemId);
  if (!consumed) return false;
  let extra = '';
  if (effect.stat === 'atk') unit.atk += effect.value;
  if (effect.stat === 'spd') unit.spd = Math.round((unit.spd + effect.value) * 100) / 100;
  if (effect.stat === 'intExp') {
    const intUps = applyIntExp(unit, effect.value);
    extra = intUps ? ` / 知性+${intUps}` : '';
  }
  addLog(game, `${item.name}を${unit.name}に使用（${effect.label}${extra}）。`);
  return true;
}

export function useItemOnRoom(game, itemId, roomId) {
  const item = items[itemId];
  const effect = item?.use;
  const room = roomById[roomId];
  if (!item || !effect || effect.target !== 'room' || !room || !isRoomBuilt(game, roomId)) return false;
  if (effect.room && effect.room !== roomId) return false;
  if (effect.stat === 'capacity' && room.capacity <= 0) return false;
  const consumed = consumeInventory(game, itemId);
  if (!consumed) return false;
  if (effect.stat === 'capacity') {
    game.roomCapacityBonus ??= {};
    game.roomCapacityBonus[roomId] = (game.roomCapacityBonus[roomId] ?? 0) + effect.value;
  }
  if (effect.stat === 'captureTtlBonus') {
    game.captureTtlBonus = (game.captureTtlBonus ?? 0) + effect.value;
  }
  addLog(game, `${item.name}を${room.name}に使用（${effect.label}）。`);
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

export function buildRoom(game, roomId, fromRoomId = null, slotId = null) {
  const room = roomById[roomId];
  if (!room || isRoomBuilt(game, roomId)) return false;
  const from = fromRoomId ?? game.selectedBuildFrom ?? 'atrium';
  if (!isRoomBuilt(game, from) || !canConnectRoom(game, from) || !canConnectRoom(game, roomId)) return false;
  const slot = buildSlots.find((item) => item.id === (slotId ?? game.selectedBuildSlot));
  if (!slot || slotTaken(game, slot.id)) return false;
  const cost = room.buildCost ?? 120;
  if (!spendGold(game, cost)) return false;
  game.builtRooms ??= new Set(rooms.filter((item) => item.built).map((item) => item.id));
  game.roomPositions ??= {};
  game.roomPositions[roomId] = { x: slot.x, y: slot.y, slotId: slot.id };
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

export function chipDevelopmentCost(game, chipId) {
  const chip = chips[chipId];
  if (!chip) return Infinity;
  const owned = game.chipBag?.[chipId] ?? 0;
  const categoryAdd = {
    attack: 4,
    target: 8,
    move: 10,
    capture: 12
  }[chip.category] ?? 8;
  return researchCost(game, CHIP_DEVELOPMENT_BASE_COST + categoryAdd + owned * 18, 'chip');
}

export function developKnownChip(game, chipId) {
  const chip = chips[chipId];
  if (!chip || (game.chipBag?.[chipId] ?? 0) <= 0) return false;
  const cost = chipDevelopmentCost(game, chipId);
  if (!spendGold(game, cost)) return false;
  discoverChip(game, chipId, '開発');
  addLog(game, `${chip.name}を追加開発。G-${cost}。`);
  return true;
}

export function researchMonster(game) {
  const cost = researchCost(game, MONSTER_RESEARCH_COST, 'monster');
  if (!spendGold(game, cost)) return false;
  const template = chooseMonsterResearchTemplate(game);
  if (!template) {
    game.gold += cost;
    return false;
  }
  const rarity = monsterRarities[template.rarity ?? 'common'] ?? monsterRarities.common;
  createAllyFromTemplate(game, template, `${rarity.name}魔物研究`);
  addLog(game, `魔物研究で${rarity.icon}${template.name}を召喚。G-${cost}。`);
  return true;
}

export function capturedSaleValue(captured) {
  const difficulty = captured.capture?.difficulty ?? 1;
  const dropGold = captured.drop?.gold ?? 0;
  return Math.max(12, Math.round(10 + difficulty * 12 + dropGold * 0.35));
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
    const gains = [`経験+${result.material.exp}`];
    if (result.material.intExp) gains.push(`知識+${result.material.intExp}`);
    if (result.levelUps) gains.push(`Lv+${result.levelUps}`);
    if (result.intUps) gains.push(`知性+${result.intUps}`);
    if (result.diff.maxHp) gains.push(`体力+${result.diff.maxHp}`);
    if (result.diff.atk) gains.push(`攻撃+${result.diff.atk}`);
    if (result.diff.spd) gains.push(`速さ+${result.diff.spd}`);
    addLog(game, `${captured.name}を養分化し、${target.name}を強化（${gains.join(' / ') || result.material.label}）。`);
  }

  if (mode === 'research') {
    const candidates = Object.keys(chips).filter((id) => (game.chipBag[id] ?? 0) < 3);
    const chipId = candidates[Math.floor(Math.random() * candidates.length)] ?? 'attack';
    discoverChip(game, chipId, '研究');
    addLog(game, `${captured.name}を研究し、${chips[chipId].name}を獲得。`);
  }

  if (mode === 'ransom' || mode === 'sell') {
    const value = capturedSaleValue(captured);
    game.gold = (game.gold ?? 0) + value;
    addLog(game, `${captured.name}を身代金に換えた。G+${value}。`);
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
