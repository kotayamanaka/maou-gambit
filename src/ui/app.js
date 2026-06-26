import { buildSlots, rooms, roomById, roomView, slotTaken, worldSize } from '../data/rooms.js';
import { chips } from '../data/chips.js';
import { chipCategories } from '../data/chips.js';
import { enemyChips } from '../data/enemyChips.js';
import { items } from '../data/items.js';
import { roomObjects } from '../data/objects.js';
import { stages } from '../data/stages.js';
import { allyTemplates, enemyTemplates } from '../data/units.js';
import { feedMaterials } from '../data/growth.js';
import { currentStage, resetToSetup, startStage } from '../game/state.js';
import {
  buildRoom,
  capturedSaleValue,
  chipDevelopmentCost,
  CHIP_RESEARCH_COST,
  consumeCaptured,
  developKnownChip,
  DEMOLISH_ROOM_COST,
  demolishRoom,
  finishUpgrade,
  fuseAlly,
  fusionMaterialForAlly,
  installRoomObject,
  MONSTER_RESEARCH_COST,
  monsterRarities,
  monsterResearchPreview,
  removeRoomObject,
  researchChip,
  researchMonster,
  sellItem,
  useItemOnRoom,
  useItemOnUnit,
  upgradeRoom
} from '../systems/progression.js';
import { allyCountInRoom, canPlaceAlly, isRoomBuilt, roomCapacity, roomLevel } from '../systems/placement.js';
import { growthProfile, nextIntExp, nextLevelExp, previewFeedGrowth, previewGrowthMaterial } from '../systems/growth.js';
import { renderMap } from '../render/mapView.js';
import { statusNameList } from '../systems/status.js';
import { inventoryLimit, researchCost } from '../systems/roomEffects.js';
import { canConnectRoom, connectionCount } from '../systems/path.js';

function assignedChipCounts(game, exceptUnitId = null) {
  const counts = {};
  for (const unit of game.allies) {
    if (unit.uid === exceptUnitId) continue;
    for (const chipId of unit.chips) counts[chipId] = (counts[chipId] ?? 0) + 1;
  }
  return counts;
}

function selectedUnit(game) {
  return game.allies.find((unit) => unit.uid === game.selectedUnitId) ?? game.allies[0];
}

function selectedEntity(game) {
  const selected = game.selectedEntity ?? { type: 'ally', id: game.selectedUnitId };
  if (selected.type === 'ally') return game.allies.find((unit) => unit.uid === selected.id) ?? selectedUnit(game);
  if (selected.type === 'enemy') return game.enemies.find((unit) => unit.uid === selected.id);
  if (selected.type === 'downed') return game.downed.find((unit) => unit.uid === selected.id);
  if (selected.type === 'lord') return game.demonLord;
  return selectedUnit(game);
}

const cameraLimits = { min: 0.12, max: 2.6 };

function clampZoom(zoom) {
  return Math.max(cameraLimits.min, Math.min(cameraLimits.max, zoom));
}

function viewportSize() {
  return {
    width: window.innerWidth || 1200,
    height: window.innerHeight || 760
  };
}

function overviewCamera() {
  const view = viewportSize();
  const padding = view.width < 720 ? 12 : 30;
  const zoom = clampZoom(Math.min(
    (view.width - padding * 2) / worldSize.width,
    (view.height - padding * 2) / worldSize.height,
    0.78
  ));
  return {
    zoom: +zoom.toFixed(3),
    x: Math.round((view.width - worldSize.width * zoom) / 2),
    y: Math.round((view.height - worldSize.height * zoom) / 2)
  };
}

function detailZoom() {
  const view = viewportSize();
  return view.width < 720 ? 0.9 : 0.95;
}

function focusCameraOn(state, entity, preferredZoom = null) {
  if (!entity) return;
  const view = viewportSize();
  const current = state.camera?.zoom ?? detailZoom();
  const zoom = clampZoom(preferredZoom ?? Math.max(current, detailZoom()));
  state.camera = {
    zoom: +zoom.toFixed(3),
    x: Math.round(view.width * (view.width < 720 ? 0.5 : 0.42) - (entity.x ?? 0) * zoom),
    y: Math.round(view.height * (view.width < 720 ? 0.34 : 0.45) - (entity.y ?? 0) * zoom)
  };
}

function hpBar(current, max) {
  return `<span class="bar"><b style="width:${Math.max(0, Math.min(100, (current / max) * 100))}%"></b></span>`;
}

function chipName(chipId) {
  return chips[chipId]?.name ?? chipId;
}

function enemyName(kind) {
  return enemyTemplates[kind]?.name ?? kind;
}

function waveSummary(stage) {
  const counts = {};
  stage.waves.flat().forEach((spawn) => {
    counts[spawn.kind] = (counts[spawn.kind] ?? 0) + 1;
  });
  return Object.entries(counts).map(([kind, count]) => `${enemyName(kind)}x${count}`).join(' / ');
}

function setupWarnings(game) {
  const warnings = [];
  const hasCarrier = game.allies.some((unit) => unit.chips.includes('carryDowned') && unit.carry > 0);
  const emptySlots = game.allies.filter((unit) => unit.chips.length < unit.int);
  const frontRooms = ['hallA', 'atrium', 'hallB'];
  const emptyFront = frontRooms.filter((room) => !game.allies.some((unit) => unit.room === room));
  if (emptySlots.length) warnings.push(`チップ枠余り: ${emptySlots.map((unit) => unit.name).join(' / ')}`);
  if (!hasCarrier) warnings.push('搬送役がいない');
  if (emptyFront.length) warnings.push(`前線が空き: ${emptyFront.map((room) => roomById[room].name).join(' / ')}`);
  return warnings.length ? warnings : ['編成チェックOK'];
}

function nextEnemyPanel(game) {
  const stage = currentStage(game);
  const rewardParts = [];
  const rewardChips = [...(stage.reward?.chips ?? []), ...(stage.reward?.chip ? [stage.reward.chip] : [])];
  if (rewardChips.length) rewardParts.push(`報酬 ${rewardChips.map(chipName).join(' / ')}`);
  if (stage.reward?.gold) rewardParts.push(`G+${stage.reward.gold}`);
  const reward = rewardParts.join(' / ') || '報酬なし';
  return `<div class="info-box next-enemies">
    <b>次の敵情報</b>
    <span>${stage.id}/${stages.length} ${stage.name}</span>
    <small>${waveSummary(stage)}</small>
    <small>${reward}</small>
  </div>`;
}

function treasuryPanel(game) {
  const totalItems = Object.values(game.inventory ?? {}).reduce((sum, count) => sum + count, 0);
  const inventory = Object.entries(game.inventory ?? {})
    .filter(([, count]) => count > 0)
    .map(([id, count]) => `${items[id]?.name ?? id}x${count}`)
    .slice(0, 4)
    .join(' / ') || 'アイテムなし';
  const loot = (game.lootLog ?? []).slice(0, 3).join(' / ') || '今回の獲得なし';
  return `<div class="info-box treasury-box">
    <b>資金 G${game.gold ?? 0}</b>
    <small>${inventory} / 所持 ${totalItems}/${inventoryLimit(game)}</small>
    <small>${loot}</small>
  </div>`;
}

function collectionRate(found, total) {
  return `${found}/${total} ${Math.round((found / Math.max(1, total)) * 100)}%`;
}

function collectionPanel(game) {
  const allies = game.collections?.allies?.size ?? new Set(game.allies.map((unit) => unit.templateId)).size;
  const enemies = game.collections?.enemies?.size ?? 0;
  const chipCount = game.collections?.chips?.size
    ?? Object.values(game.chipBag ?? {}).filter((count) => count > 0).length;
  return `<div class="info-box collection-box">
    <b>図鑑</b>
    <small>自軍 ${collectionRate(allies, Object.keys(allyTemplates).length)}</small>
    <small>敵軍 ${collectionRate(enemies, Object.keys(enemyTemplates).length)}</small>
    <small>チップ ${collectionRate(chipCount, Object.keys(chips).length)}</small>
  </div>`;
}

function unlockHistory(game) {
  return `<div class="info-box unlock-history">
    <b>チップ解放履歴</b>
    ${(game.chipUnlocks ?? []).map((line) => `<small>${line}</small>`).join('') || '<small>まだなし</small>'}
  </div>`;
}

function unitCard(unit, game) {
  return `<button class="unit-card ${unit.uid === game.selectedUnitId ? 'on' : ''}" data-unit="${unit.uid}" data-drop-unit="${unit.uid}" draggable="true">
    <img src="${unit.sprite}" alt="${unit.name}" />
    <span><b>${unit.name}</b><small>Lv${unit.level ?? 1} 経験${unit.exp ?? 0}/${nextLevelExp(unit)} 知性${unit.int}</small><em>${unit.chips.map((id) => chips[id]?.icon ?? '□').join('')}</em></span>
  </button>`;
}

function feedPreviewText(unit, captured) {
  const preview = previewFeedGrowth(unit, captured);
  const parts = [`経験+${preview.material.exp}`];
  if (preview.material.intExp) parts.push(`知識+${preview.material.intExp}`);
  if (preview.levelUps) parts.push(`Lv+${preview.levelUps}`);
  if (preview.intUps) parts.push(`知性+${preview.intUps}`);
  if (preview.diff.maxHp) parts.push(`体力+${preview.diff.maxHp}`);
  if (preview.diff.atk) parts.push(`攻撃+${preview.diff.atk}`);
  if (preview.diff.spd) parts.push(`速さ+${preview.diff.spd}`);
  return parts.join(' ');
}

function feedCompare(unit, captured) {
  const preview = previewFeedGrowth(unit, captured);
  const after = preview.after;
  return `<div class="compare-box">
    <span>Lv ${unit.level ?? 1} -> ${after.level}</span>
    <span>体力 ${unit.maxHp} -> ${after.maxHp}</span>
    <span>攻撃 ${unit.atk} -> ${after.atk}</span>
    <span>速さ ${unit.spd} -> ${after.spd}</span>
    <span>知性 ${unit.int} -> ${after.int}</span>
    <span>経験 ${unit.exp ?? 0} -> ${after.exp}</span>
    <span>知識 ${unit.intExp ?? 0} -> ${after.intExp}</span>
  </div>`;
}

function growthPreviewText(preview) {
  const parts = [`経験+${preview.material.exp}`];
  if (preview.material.intExp) parts.push(`知識+${preview.material.intExp}`);
  if (preview.levelUps) parts.push(`Lv+${preview.levelUps}`);
  if (preview.intUps) parts.push(`知性+${preview.intUps}`);
  if (preview.diff.maxHp) parts.push(`体力+${preview.diff.maxHp}`);
  if (preview.diff.atk) parts.push(`攻撃+${preview.diff.atk}`);
  if (preview.diff.spd) parts.push(`速さ+${preview.diff.spd}`);
  return parts.join(' ');
}

function capturedCard(captured, game) {
  const selected = (game.selectedCapturedId ?? game.captured[0]?.uid) === captured.uid;
  return `<button class="unit-card ${selected ? 'on' : ''}" data-captured-select="${captured.uid}">
    <img src="${captured.sprite}" alt="${captured.name}" />
    <span><b>${captured.name}</b><small>捕獲難度${captured.capture?.difficulty ?? 1} / ${feedMaterials[captured.templateId]?.label ?? '素材'}</small></span>
  </button>`;
}

function convertPreview(captured) {
  const template = allyTemplates[captured.convertTo];
  if (!template) return '<small>眷属化不可</small>';
  return `<small>${template.name}になる / 体力${template.stats.hp} 攻撃${template.stats.atk} 知性${template.stats.int}</small>`;
}

function researchPreview(game) {
  const candidates = Object.keys(chips).filter((id) => (game.chipBag[id] ?? 0) < 3);
  return candidates.map((id) => {
    const chip = chips[id];
    const category = chipCategories[chip.category] ?? { name: '不明' };
    return (game.chipBag[id] ?? 0) > 0 ? chip.name : `${category.name}系????`;
  }).join(' / ') || '候補なし';
}

function roomManagementPanel(game) {
  const anchor = game.selectedBuildFrom ?? 'atrium';
  const selectedSlot = game.selectedBuildSlot ?? buildSlots.find((slot) => !slotTaken(game, slot.id))?.id;
  const anchorButtons = rooms
    .filter((room) => isRoomBuilt(game, room.id) && canConnectRoom(game, room.id))
    .map((room) => `<button class="mini ${anchor === room.id ? 'on' : ''}" data-build-anchor="${room.id}">
      ${room.name}<small>${connectionCount(game, room.id)}/${room.connectionLimit ?? 4}</small>
    </button>`)
    .join('');
  const slotButtons = buildSlots
    .map((slot) => {
      const used = slotTaken(game, slot.id);
      return `<button class="mini ${selectedSlot === slot.id ? 'on' : ''}" data-build-slot="${slot.id}" ${used ? 'disabled' : ''}>
        ${used ? '占有済' : '配置点'}<small>${slot.id}</small>
      </button>`;
    })
    .join('');
  const buildButtons = rooms
    .filter((room) => !isRoomBuilt(game, room.id) && room.buildCost)
    .map((room) => `<button class="mini" data-build-room="${room.id}" draggable="true" ${((game.gold ?? 0) < room.buildCost || !selectedSlot || slotTaken(game, selectedSlot) || !canConnectRoom(game, anchor) || !canConnectRoom(game, room.id)) ? 'disabled' : ''}>
      ${room.name}<small>${roomById[anchor]?.name ?? anchor}から ${selectedSlot ?? '配置点未選択'}へ G${room.buildCost}${roomEffectText(room) ? ` / ${roomEffectText(room)}` : ''}</small>
    </button>`)
    .join('');
  const demolishButtons = rooms
    .filter((room) => isRoomBuilt(game, room.id) && !room.built)
    .map((room) => `<button class="mini danger" data-demolish-room="${room.id}" ${(game.gold ?? 0) < DEMOLISH_ROOM_COST ? 'disabled' : ''}>
      ${room.name}<small>撤去 G${DEMOLISH_ROOM_COST}</small>
    </button>`)
    .join('');
  const upgradeButtons = rooms
    .filter((room) => isRoomBuilt(game, room.id) && room.capacity > 0)
    .map((room) => {
      const level = roomLevel(game, room.id);
      const cost = (room.upgradeCost ?? 120) * level;
      return `<button class="mini" data-upgrade-room="${room.id}" ${(game.gold ?? 0) < cost ? 'disabled' : ''}>
        ${room.name}<small>Lv${level} 容量${roomCapacity(room.id, game)} / G${cost}${roomEffectText(room) ? ` / ${roomEffectText(room)}` : ''}</small>
      </button>`;
    })
    .join('');
  return `<div class="info-box management-box">
    <b>ダンジョン</b>
    <div class="scroll-rail">${anchorButtons || '<span class="empty-inline">接続元なし</span>'}</div>
    <div class="scroll-rail">${slotButtons || '<span class="empty-inline">配置点なし</span>'}</div>
    <div class="scroll-rail">${buildButtons || '<span class="empty-inline">建設候補なし</span>'}</div>
    <div class="scroll-rail">${demolishButtons || '<span class="empty-inline">撤去候補なし</span>'}</div>
    <div class="scroll-rail">${upgradeButtons || '<span class="empty-inline">拡張候補なし</span>'}</div>
  </div>`;
}

function itemUseLabel(item, game) {
  const effect = item.use;
  if (!effect) return '';
  if (effect.target === 'ally') return `${selectedUnit(game).name} ${effect.label}`;
  if (effect.target === 'room') {
    const roomId = effect.room ?? game.selectedRoomId ?? 'atrium';
    return `${roomById[roomId]?.name ?? roomId} ${effect.label}`;
  }
  return effect.label ?? '';
}

function inventoryPanel(game) {
  const itemEntries = Object.entries(game.inventory ?? {})
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({ id, count, item: items[id] }))
    .filter(({ item }) => item);
  const useButtons = itemEntries
    .filter(({ item }) => item.use)
    .map(({ id, count, item }) => {
      const effect = item.use;
      const roomId = effect.target === 'room' ? (effect.room ?? game.selectedRoomId ?? 'atrium') : '';
      const disabled = effect.target === 'room' && (!isRoomBuilt(game, roomId) || (effect.stat === 'capacity' && roomById[roomId]?.capacity <= 0));
      const data = effect.target === 'ally'
        ? `data-use-item-unit="${id}" data-target-unit="${selectedUnit(game).uid}"`
        : `data-use-item-room="${id}" data-target-room="${roomId}"`;
      return `<button class="mini" ${data} ${disabled ? 'disabled' : ''}>
        ${item.name}<small>x${count} ${itemUseLabel(item, game)}</small>
      </button>`;
    })
    .join('');
  const sellButtons = itemEntries
    .map(({ id, count, item }) => {
      return `<button class="mini" data-sell-item="${id}">
        ${item.name}<small>x${count} 売却G${item.value ?? 0}</small>
      </button>`;
    })
    .join('');
  return `<div class="info-box management-box">
    <b>戦利品</b>
    <div class="scroll-rail">${useButtons || '<span class="empty-inline">使用できる素材なし</span>'}</div>
    <div class="scroll-rail">${sellButtons || '<span class="empty-inline">売却品なし</span>'}</div>
  </div>`;
}

function roomEffectText(room) {
  const effects = {
    inventoryLimit: `所持上限+${room.effect?.value ?? 0}`,
    researchDiscount: `研究費-${room.effect?.value ?? 0}`,
    summonDiscount: `魔物研究費-${room.effect?.value ?? 0}`,
    allyAtkRoom: '侵入されると敵が武装'
  };
  const risks = {
    plunder: '侵入で略奪',
    knowledgeLeak: '侵入で魔王部屋発覚',
    panic: '侵入で配下混乱',
    armedInvader: '侵入で敵攻撃+1'
  };
  return [effects[room.effect?.kind], risks[room.risk?.kind]].filter(Boolean).join(' / ');
}

function researchPanel(game) {
  const chipCost = researchCost(game, CHIP_RESEARCH_COST, 'chip');
  const monsterCost = researchCost(game, MONSTER_RESEARCH_COST, 'monster');
  const monsterPreview = monsterResearchPreview(game);
  const monsterSummary = Object.entries(monsterPreview.summary)
    .map(([id, count]) => `${monsterRarities[id]?.icon ?? '?'}${monsterRarities[id]?.name ?? id}x${count}`)
    .join(' / ') || '候補なし';
  const knownChipButtons = Object.keys(chips)
    .filter((id) => (game.chipBag?.[id] ?? 0) > 0)
    .map((id) => {
      const cost = chipDevelopmentCost(game, id);
      return `<button class="mini" data-develop-chip="${id}" ${(game.gold ?? 0) < cost ? 'disabled' : ''}>
        ${chips[id].icon} ${chips[id].name}<small>x${game.chipBag[id]} 開発G${cost}</small>
      </button>`;
    })
    .join('');
  return `<div class="info-box management-box">
    <b>研究</b>
    <div class="scroll-rail">
      <button class="mini" data-research-chip ${(game.gold ?? 0) < chipCost ? 'disabled' : ''}>チップ研究<small>G${chipCost}</small></button>
      <button class="mini" data-research-monster ${(game.gold ?? 0) < monsterCost ? 'disabled' : ''}>魔物研究<small>G${monsterCost} 希少${monsterPreview.rareRate}%</small></button>
    </div>
    <small>魔物候補 ${monsterSummary}</small>
    <div class="scroll-rail">${knownChipButtons || '<span class="empty-inline">開発候補なし</span>'}</div>
  </div>`;
}

function fusionPanel(game) {
  const target = selectedUnit(game);
  const materials = game.allies.filter((unit) => unit.uid !== target.uid);
  const selected = materials.find((unit) => unit.uid === game.selectedFusionId) ?? materials[0];
  if (!target || !materials.length) {
    return `<div class="info-box management-box">
      <b>魔物合成</b>
      <small>配下が2体以上になると、1体を素材にして選択中の配下を強化できる。</small>
    </div>`;
  }
  const material = fusionMaterialForAlly(selected);
  const preview = previewGrowthMaterial(target, material);
  const materialButtons = materials.map((unit) => {
    const item = fusionMaterialForAlly(unit);
    return `<button class="mini ${selected.uid === unit.uid ? 'on' : ''}" data-fusion-material="${unit.uid}">
      ${unit.name}<small>${item.label}</small>
    </button>`;
  }).join('');
  return `<div class="info-box management-box">
    <b>魔物合成</b>
    <small>${selected.name}を素材にして${target.name}を強化: ${growthPreviewText(preview)}</small>
    <div class="scroll-rail">${materialButtons}</div>
    <button class="mini danger wide" data-fuse-ally="${selected.uid}" data-fuse-target="${target.uid}">
      合成実行<small>${selected.name}を消費</small>
    </button>
  </div>`;
}

function objectPanel(game) {
  const roomId = game.selectedRoomId ?? 'atrium';
  const room = roomById[roomId];
  const current = roomObjects[game.roomObjects?.[roomId]];
  const roomButtons = rooms
    .filter((item) => isRoomBuilt(game, item.id) && item.type !== 'spawn' && item.type !== 'throne')
    .map((item) => `<button class="mini ${roomId === item.id ? 'on' : ''}" data-object-room="${item.id}">
      ${item.name}<small>${roomObjects[game.roomObjects?.[item.id]]?.name ?? '空き'}</small>
    </button>`)
    .join('');
  const buttons = Object.values(roomObjects).map((object) => `<button class="mini" data-install-object="${object.id}" draggable="true" ${(current || !room || !isRoomBuilt(game, roomId) || (game.gold ?? 0) < object.cost) ? 'disabled' : ''}>
    ${object.icon} ${object.name}<small>G${object.cost} / ${object.description}</small>
  </button>`).join('');
  return `<div class="info-box management-box">
    <b>部屋オブジェクト</b>
    <small>${room?.name ?? roomId} ${current ? `設置中: ${current.name}` : '未設置'}</small>
    <div class="scroll-rail">${roomButtons}</div>
    <div class="scroll-rail">${buttons}</div>
    ${current ? `<button class="mini danger wide" data-remove-object="${roomId}">設備撤去<small>G30</small></button>` : ''}
  </div>`;
}

function panelTabs(game, items) {
  return `<div class="tool-tabs">${items.map((item) => `<button class="${game.uiPanel === item.id ? 'on' : ''}" data-ui-panel="${item.id}" title="${item.label}"><b>${item.icon}</b><span>${item.label}</span></button>`).join('')}</div>`;
}

function managementPanels(game) {
  const managementIds = ['loot', 'research', 'fusion', 'build', 'object', 'info'];
  const active = managementIds.includes(game.uiPanel) ? game.uiPanel : 'loot';
  const panelState = { ...game, uiPanel: active };
  const tabs = panelTabs(panelState, [
    { id: 'loot', icon: '◇', label: '戦利品' },
    { id: 'research', icon: '⌕', label: '研究' },
    { id: 'fusion', icon: '⇄', label: '合成' },
    { id: 'build', icon: '□', label: '建設' },
    { id: 'object', icon: '◆', label: '設備' },
    { id: 'info', icon: 'ⓘ', label: '情報' }
  ]);
  const content = active === 'research' ? researchPanel(game)
    : active === 'fusion' ? fusionPanel(game)
      : active === 'build' ? roomManagementPanel(game)
        : active === 'object' ? objectPanel(game)
          : active === 'info' ? `<div class="info-grid">${collectionPanel(game)}${unlockHistory(game)}${nextEnemyPanel(game)}${treasuryPanel(game)}</div>`
            : `${treasuryPanel(game)}${inventoryPanel(game)}`;
  return `${tabs}${content}`;
}

function roomChoice(room, unit, game) {
  const built = isRoomBuilt(game, room.id);
  const capacity = roomCapacity(room.id, game);
  const count = allyCountInRoom(game, room.id, unit.uid);
  const full = !canPlaceAlly(game, room.id, unit);
  return `<button class="mini ${unit.room === room.id ? 'on' : ''}" data-place="${room.id}" ${full ? 'disabled' : ''}>
    ${room.name}<small>${built ? `${count}/${capacity}` : `未建設 G${room.buildCost ?? 0}`}</small>
  </button>`;
}

function chipButton(chipId, unit, game) {
  const chip = chips[chipId];
  const inUnit = unit.chips.includes(chipId);
  const used = assignedChipCounts(game, unit.uid)[chipId] ?? 0;
  const owned = game.chipBag[chipId] ?? 0;
  const available = owned - used;
  const locked = owned <= 0 && !inUnit;
  const full = !inUnit && unit.chips.length >= unit.int;
  const selected = game.selectedChipId === chipId;
  const category = chipCategories[chip.category] ?? { name: '不明', icon: '?' };
  const label = locked ? '????' : chip.name;
  const icon = locked ? category.icon : chip.icon;
  const title = locked ? `${category.name}系の未発見チップ` : chip.description;
  return `<button class="chip ${inUnit ? 'on' : ''} ${locked ? 'locked' : ''} ${selected ? 'selected-chip' : ''}" data-chip="${chipId}" data-locked="${locked ? '1' : '0'}" draggable="${locked ? 'false' : 'true'}" title="${title}">
    <b>${icon}</b><span>${label}</span><small>${locked ? `${category.name} / 未発見` : inUnit ? '装備中' : `残${available}`}</small>
    ${!locked && full ? '<small>入替可</small>' : ''}
  </button>`;
}

function visibleChipIds(game, unit) {
  return Object.keys(chips);
}

function chipDetail(game, unit) {
  const chipId = game.selectedChipId ?? unit.chips[0] ?? 'attack';
  const chip = chips[chipId];
  if (!chip) return '';
  const owned = game.chipBag[chipId] ?? 0;
  const equipped = unit.chips.includes(chipId);
  const known = owned > 0 || equipped;
  const category = chipCategories[chip.category] ?? { name: '不明', icon: '?' };
  if (!known) {
    return `<div class="detail-card chip-detail">
      <div class="detail-title"><b>${category.icon} ????</b><small>${category.name}系 / 未発見</small></div>
      <p>研究・報酬・捕獲処理で正体が判明する。</p>
      <div class="mini-stat">図鑑未登録</div>
    </div>`;
  }
  return `<div class="detail-card chip-detail">
    <div class="detail-title"><b>${chip.icon} ${chip.name}</b><small>${owned > 0 || equipped ? `所持 ${owned}` : '未発見'}</small></div>
    <p>${chip.description}</p>
    <div class="mini-stat">条件 ${chip.condition} / 行動 ${chip.action} / ${equipped ? '装備中' : '未装備'}</div>
  </div>`;
}

function placeUnitInRoom(state, unitId, roomId) {
  const unit = state.allies.find((ally) => ally.uid === unitId) ?? selectedUnit(state);
  if (!unit || !canPlaceAlly(state, roomId, unit)) return false;
  unit.room = roomId;
  unit.homeRoom = unit.room;
  const position = roomView(state, unit.room);
  unit.x = position.x;
  unit.y = position.y;
  unit.movingTo = null;
  state.selectedUnitId = unit.uid;
  state.selectedEntity = { type: 'ally', id: unit.uid };
  state.selectedRoomId = roomId;
  return true;
}

function equipChipToUnit(state, unitId, chipId) {
  const unit = state.allies.find((ally) => ally.uid === unitId) ?? selectedUnit(state);
  if (!unit || !chips[chipId]) return false;
  state.selectedUnitId = unit.uid;
  state.selectedEntity = { type: 'ally', id: unit.uid };
  state.selectedChipId = chipId;
  const used = assignedChipCounts(state, unit.uid)[chipId] ?? 0;
  const available = (state.chipBag[chipId] ?? 0) - used;
  if (unit.chips.includes(chipId)) return true;
  if (available <= 0) return false;
  if (unit.chips.length < unit.int) {
    unit.chips.push(chipId);
    return true;
  }
  const replaceIndex = Math.max(0, unit.chips.length - 1);
  unit.chips[replaceIndex] = chipId;
  return true;
}

function setupPanel(game) {
  const unit = selectedUnit(game);
  const profile = growthProfile(unit);
  const warnings = setupWarnings(game);
  const active = game.uiPanel ?? 'unit';
  const tabs = panelTabs(game, [
    { id: 'unit', icon: '♟', label: '配下' },
    { id: 'place', icon: '⌖', label: '配置' },
    { id: 'chips', icon: '▣', label: 'チップ' },
    { id: 'build', icon: '□', label: '建設' },
    { id: 'object', icon: '◆', label: '設備' },
    { id: 'info', icon: 'ⓘ', label: '情報' }
  ]);
  const unitSection = `<div class="setup-section">
    <div class="unit-picker" aria-label="配下選択">
      <div class="unit-list">${game.allies.map((ally) => unitCard(ally, game)).join('')}</div>
    </div>
    <div class="stats setup-stats" aria-label="${unit.name}の能力">
      <span>Lv ${unit.level ?? 1}</span><span>体力 ${unit.maxHp}</span><span>攻撃 ${unit.atk}</span><span>速さ ${unit.spd}</span>
      <span class="core">知性 ${unit.int}</span><span>経験 ${unit.exp ?? 0}/${nextLevelExp(unit)}</span><span>知識 ${unit.intExp ?? 0}/${nextIntExp(unit)}</span>
      <span>運搬 ${unit.carry}</span><span>射程 ${unit.range}</span><span>${profile.label}</span><span>${roomById[unit.homeRoom]?.name ?? unit.homeRoom}</span>
    </div>
    <div class="advice-box">${warnings.map((line) => `<p>${line}</p>`).join('')}</div>
  </div>`;
  const placeSection = `<div class="setup-section">
    <div class="unit-picker" aria-label="配下選択">
      <div class="unit-list">${game.allies.map((ally) => unitCard(ally, game)).join('')}</div>
    </div>
    <div class="room-picker" aria-label="配置先">
      <div class="scroll-rail">${rooms.filter((room) => room.capacity > 0).map((room) =>
        roomChoice(room, unit, game)
      ).join('')}</div>
    </div>
  </div>`;
  const chipSection = `<div class="setup-section">
    <div class="unit-picker" aria-label="配下選択">
      <div class="unit-list">${game.allies.map((ally) => unitCard(ally, game)).join('')}</div>
    </div>
    <div class="chips-box" aria-label="チップ">
      <div class="chip-meter">${unit.chips.length}/${unit.int}</div>
      <div class="chip-grid scroll-rail">${visibleChipIds(game, unit).map((id) => chipButton(id, unit, game)).join('')}</div>
    </div>
    ${chipDetail(game, unit)}
  </div>`;
  const infoSection = `<div class="setup-section"><div class="info-grid">${nextEnemyPanel(game)}${treasuryPanel(game)}${collectionPanel(game)}${unlockHistory(game)}</div></div>`;
  const content = active === 'place' ? placeSection
    : active === 'chips' ? chipSection
      : active === 'build' ? `<div class="setup-section">${roomManagementPanel(game)}</div>`
        : active === 'object' ? `<div class="setup-section">${objectPanel(game)}</div>`
          : active === 'info' ? infoSection
            : unitSection;
  return `<aside class="panel setup-panel">
    <header class="panel-head">
      <span>${currentStage(game).id}/${stages.length} ${currentStage(game).name}</span>
      <button class="primary" data-action="start" title="侵入開始">▶</button>
    </header>
    ${tabs}
    ${content}
  </aside>`;
}

function battlePanel(game) {
  const entity = selectedEntity(game);
  const isAlly = entity?.type === 'ally';
  const isEnemy = entity?.type === 'enemy';
  const downed = game.downed.map((body) => `${body.name} ${Math.ceil(body.ttl)}s`).join(' / ') || 'なし';
  const carrying = game.allies.filter((unit) => unit.carrying).map((unit) => `${unit.name}運搬中`).join(' / ') || 'なし';
  const entityStatus = entity?.type === 'downed' ? `残り${Math.ceil(entity.ttl)}s`
    : entity?.carrying ? '運搬中'
      : entity?.carriedBy ? '担がれ中'
        : entity?.knowsThrone ? '魔王部屋把握'
          : '';
  const statusText = statusNameList(entity ?? {}).join(' / ');
  return `<aside class="panel battle-panel">
    <header class="panel-head">
      <span>防衛中</span>
      <div class="panel-actions">
        <button data-action="pause">${game.speed === 0 ? '▶' : 'Ⅱ'}</button>
        <button class="${game.speed === 1 ? 'on' : ''}" data-set-speed="1">1x</button>
        <button class="${game.speed === 2 ? 'on' : ''}" data-set-speed="2">2x</button>
        <button class="${game.speed === 4 ? 'on' : ''}" data-set-speed="4">4x</button>
        <button data-action="retry">↻</button>
        <button data-action="retreat">撤退</button>
      </div>
    </header>
    <div class="boss-box">
      <b>魔王体力 ${game.demonLord.hp}/${game.demonLord.maxHp}</b>
      ${hpBar(game.demonLord.hp, game.demonLord.maxHp)}
    </div>
    <div class="battle-stats">
      <span>⏱ ${Math.round(game.elapsed)}s</span>
      <span>⚔ ${game.defeated}</span>
      <span>⛓ ${game.captured.length}</span>
      <span>${game.partyKnowledge.throneKnown ? '❗発見済' : '？探索中'}</span>
      <span>与ダメ ${game.metrics?.allyDamage ?? 0}</span>
      <span>被ダメ ${game.metrics?.enemyDamage ?? 0}</span>
      <span>G ${game.gold ?? 0}</span>
    </div>
    <div class="status-strip"><span>運搬 ${carrying}</span><span>ダウン ${downed}</span></div>
    ${entity ? `<div class="battle-detail">
      <div class="detail-title">
        <img src="${entity.sprite}" alt="${entity.name}" />
        <div><b>${entity.name}</b><small>${entity.room ? roomById[entity.room]?.name ?? entity.room : '戦場'}</small></div>
      </div>
      ${entityStatus ? `<div class="mini-stat">${entityStatus}</div>` : ''}
      ${statusText ? `<div class="mini-stat">状態 ${statusText}</div>` : ''}
      ${entity.maxHp ? `<div class="mini-stat">${entity.level ? `Lv ${entity.level} / ` : ''}体力 ${entity.hp}/${entity.maxHp}${entity.atk ? ` / 攻撃 ${entity.atk}` : ''}${entity.int != null ? ` / 知性 ${entity.int}` : ''}</div>${hpBar(entity.hp, entity.maxHp)}` : ''}
      ${isAlly ? `<div class="battle-chips">${entity.chips.map((id) => `<span>${chips[id]?.icon ?? '□'} ${chips[id]?.name ?? id}</span>`).join('')}</div>` : ''}
      ${isEnemy ? `<div class="battle-chips">${entity.chips.map((id) => `<span>${enemyChips[id]?.icon ?? '□'} ${enemyChips[id]?.name ?? id}</span>`).join('')}</div>` : ''}
    </div>` : ''}
    <div class="panel-actions map-focus-row">
      <button data-mapaction="focusSelected">選択へ</button>
      <button data-mapaction="focusEnemy">侵入者へ</button>
      <button data-action="toggleLog">${game.showLog ? 'ログ隠す' : 'ログ表示'}</button>
    </div>
    ${game.showLog ? `<div class="log">${game.log.map((line) => `<p>${line}</p>`).join('')}</div>` : '<div class="log compact-log"><p>ログ非表示</p></div>'}
    ${treasuryPanel(game)}
  </aside>`;
}

function resultPanel(game) {
  const result = game.result;
  return `<aside class="panel result-panel">
    <header class="panel-head"><span>${result.won ? '撃退成功' : '敗北'}</span></header>
    <div class="result-grid">
      <span>撃退<b>${result.defeated}</b></span>
      <span>捕獲<b>${result.captured}</b></span>
      <span>魔王体力<b>${result.lordHp}</b></span>
      <span>時間<b>${result.elapsed}s</b></span>
      <span>与ダメ<b>${game.metrics?.allyDamage ?? 0}</b></span>
      <span>被ダメ<b>${game.metrics?.enemyDamage ?? 0}</b></span>
      <span>資金<b>G${game.gold ?? 0}</b></span>
    </div>
    <button class="primary wide" data-action="${result.won ? 'upgrade' : 'restart'}">${result.won ? '捕獲処理へ' : '再挑戦'}</button>
  </aside>`;
}

function upgradePanel(game) {
  const captured = game.captured.find((item) => item.uid === game.selectedCapturedId) ?? game.captured[0];
  const target = selectedUnit(game);
  const feedText = captured ? feedPreviewText(target, captured) : '';
  if (!captured) {
    return `<aside class="panel upgrade-panel">
      <header class="panel-head"><span>強化</span></header>
      <p class="empty">捕獲なし。報酬チップを受け取り、次へ進む。</p>
      ${managementPanels(game)}
      <button class="primary wide" data-action="nextStage">次の防衛へ</button>
    </aside>`;
  }
  return `<aside class="panel upgrade-panel">
    <header class="panel-head"><span>捕獲処理</span></header>
    <div class="unit-picker" aria-label="捕獲敵選択">
      <div class="unit-list">${game.captured.map((item) => capturedCard(item, game)).join('')}</div>
    </div>
    <div class="detail-card">
      <div class="detail-title"><img src="${captured.sprite}" alt="${captured.name}" /><div><b>${captured.name}</b><small>牢屋で拘束中</small>${convertPreview(captured)}</div></div>
    </div>
    <div class="upgrade-actions">
      <button data-upgrade="convert" data-captured="${captured.uid}">🧠 眷属化</button>
      <button data-upgrade="feed" data-captured="${captured.uid}" data-target="${target.uid}">🩸 ${target.name} ${feedText}</button>
      <button data-upgrade="research" data-captured="${captured.uid}">📜 研究</button>
      <button data-upgrade="ransom" data-captured="${captured.uid}">💰 身代金 G+${capturedSaleValue(captured)}</button>
    </div>
    <div class="unit-picker feed-targets" aria-label="養分対象">
      <div class="unit-list">${game.allies.map((ally) => unitCard(ally, game)).join('')}</div>
    </div>
    ${feedCompare(target, captured)}
    <div class="info-box"><b>研究候補</b><small>${researchPreview(game)}</small></div>
    ${managementPanels(game)}
    <button class="wide" data-action="nextStage">処理を終えて次へ</button>
  </aside>`;
}

function endPanel(game, won) {
  return `<aside class="panel result-panel">
    <header class="panel-head"><span>${won ? '魔王軍勝利' : '魔王敗北'}</span></header>
    <p class="empty">${won ? '二十の侵入を退けた。' : '魔王が討たれた。'}</p>
    <button class="primary wide" data-action="newRun">新しいラン</button>
  </aside>`;
}

export function renderApp(root, game, commit) {
  game.camera ??= overviewCamera();
  const phase = game.phase;
  const panel = phase === 'setup' ? setupPanel(game)
    : phase === 'battle' ? battlePanel(game)
    : phase === 'result' ? resultPanel(game)
    : phase === 'upgrade' ? upgradePanel(game)
    : phase === 'victory' ? endPanel(game, true)
    : endPanel(game, false);

  root.innerHTML = `<main class="app ${phase}">
    <section class="playfield">
      ${renderMap(game, phase)}
      ${panel}
    </section>
  </main>`;

  root.querySelectorAll('[data-unit]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    state.selectedUnitId = button.dataset.unit;
    state.selectedEntity = { type: 'ally', id: button.dataset.unit };
  })));
  root.querySelectorAll('[data-place]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    placeUnitInRoom(state, state.selectedUnitId, button.dataset.place);
  })));
  root.querySelectorAll('[data-room]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    state.selectedRoomId = button.dataset.room;
    const blocked = ['entrance', 'throne'];
    if (state.phase === 'setup' && !blocked.includes(button.dataset.room)) {
      placeUnitInRoom(state, state.selectedUnitId, button.dataset.room);
    }
  })));
  root.querySelectorAll('[data-chip]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    const unit = selectedUnit(state);
    const chipId = button.dataset.chip;
    const previous = state.selectedChipId;
    state.selectedChipId = chipId;
    const used = assignedChipCounts(state, unit.uid)[chipId] ?? 0;
    const available = (state.chipBag[chipId] ?? 0) - used;
    if (unit.chips.includes(chipId)) {
      unit.chips = unit.chips.filter((id) => id !== chipId);
    } else if (available > 0 && unit.chips.length < unit.int) {
      unit.chips.push(chipId);
    } else if (available > 0 && previous && unit.chips.includes(previous)) {
      unit.chips = unit.chips.map((id) => (id === previous ? chipId : id));
    }
  })));
  root.querySelectorAll('[data-captured-select]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    state.selectedCapturedId = button.dataset.capturedSelect;
  })));
  root.querySelectorAll('[data-upgrade]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    consumeCaptured(state, button.dataset.captured, button.dataset.upgrade, button.dataset.target);
    state.selectedCapturedId = state.captured[0]?.uid ?? null;
  })));
  root.querySelectorAll('[data-build-room]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    buildRoom(state, button.dataset.buildRoom, state.selectedBuildFrom, state.selectedBuildSlot);
  })));
  root.querySelectorAll('[data-build-anchor]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    state.selectedBuildFrom = button.dataset.buildAnchor;
  })));
  root.querySelectorAll('[data-build-slot]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    if (slotTaken(state, button.dataset.buildSlot)) return;
    state.selectedBuildSlot = button.dataset.buildSlot;
    state.uiPanel = 'build';
  })));
  root.querySelectorAll('[data-demolish-room]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    demolishRoom(state, button.dataset.demolishRoom);
  })));
  root.querySelectorAll('[data-upgrade-room]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    upgradeRoom(state, button.dataset.upgradeRoom);
  })));
  root.querySelectorAll('[data-install-object]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    installRoomObject(state, state.selectedRoomId ?? 'atrium', button.dataset.installObject);
  })));
  root.querySelectorAll('[data-object-room]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    state.selectedRoomId = button.dataset.objectRoom;
  })));
  root.querySelectorAll('[data-remove-object]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    removeRoomObject(state, button.dataset.removeObject);
  })));
  root.querySelectorAll('[data-sell-item]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    sellItem(state, button.dataset.sellItem);
  })));
  root.querySelectorAll('[data-use-item-unit]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    useItemOnUnit(state, button.dataset.useItemUnit, button.dataset.targetUnit);
  })));
  root.querySelectorAll('[data-use-item-room]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    useItemOnRoom(state, button.dataset.useItemRoom, button.dataset.targetRoom);
  })));
  root.querySelectorAll('[data-research-chip]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    researchChip(state);
  })));
  root.querySelectorAll('[data-develop-chip]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    developKnownChip(state, button.dataset.developChip);
  })));
  root.querySelectorAll('[data-research-monster]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    researchMonster(state);
  })));
  root.querySelectorAll('[data-fusion-material]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    state.selectedFusionId = button.dataset.fusionMaterial;
  })));
  root.querySelectorAll('[data-fuse-ally]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    fuseAlly(state, button.dataset.fuseTarget, button.dataset.fuseAlly);
  })));
  root.querySelectorAll('[data-ui-panel]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    state.uiPanel = button.dataset.uiPanel;
  })));
  root.querySelectorAll('[data-set-speed]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    state.speed = Number(button.dataset.setSpeed);
  })));
  root.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    if (button.dataset.action === 'start') {
      startStage(state);
      focusCameraOn(state, selectedEntity(state), detailZoom());
    }
    if (button.dataset.action === 'pause') state.speed = state.speed === 0 ? 1 : 0;
    if (button.dataset.action === 'retry') {
      startStage(state);
      focusCameraOn(state, selectedEntity(state), detailZoom());
    }
    if (button.dataset.action === 'retreat') {
      resetToSetup(state);
      state.camera = overviewCamera();
    }
    if (button.dataset.action === 'toggleLog') state.showLog = !state.showLog;
    if (button.dataset.action === 'upgrade') state.phase = 'upgrade';
    if (button.dataset.action === 'nextStage') finishUpgrade(state);
    if (button.dataset.action === 'restart' || button.dataset.action === 'newRun') location.reload();
  })));
  root.querySelectorAll('[data-select-type]').forEach((button) => button.addEventListener('click', (event) => {
    event.stopPropagation();
    commit((state) => {
      state.selectedEntity = { type: button.dataset.selectType, id: button.dataset.selectId };
      if (button.dataset.selectType === 'ally') state.selectedUnitId = button.dataset.selectId;
    });
  }));
  root.querySelectorAll('[data-mapaction]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    state.camera ??= overviewCamera();
    if (button.dataset.mapaction === 'zoomIn') state.camera.zoom = clampZoom(+(state.camera.zoom + 0.18).toFixed(2));
    if (button.dataset.mapaction === 'zoomOut') state.camera.zoom = clampZoom(+(state.camera.zoom - 0.18).toFixed(2));
    if (button.dataset.mapaction === 'panLeft') state.camera.x += 72;
    if (button.dataset.mapaction === 'panRight') state.camera.x -= 72;
    if (button.dataset.mapaction === 'panUp') state.camera.y += 72;
    if (button.dataset.mapaction === 'panDown') state.camera.y -= 72;
    if (button.dataset.mapaction === 'reset') state.camera = overviewCamera();
    if (button.dataset.mapaction === 'focusSelected') focusCameraOn(state, selectedEntity(state));
    if (button.dataset.mapaction === 'focusEnemy') focusCameraOn(state, state.enemies[0] ?? state.downed[0]);
  })));

  root.querySelectorAll('[draggable="true"]').forEach((button) => button.addEventListener('dragstart', (event) => {
    const payload = button.dataset.unit ? { kind: 'unit', id: button.dataset.unit }
      : button.dataset.chip ? { kind: 'chip', id: button.dataset.chip }
        : button.dataset.installObject ? { kind: 'object', id: button.dataset.installObject }
          : button.dataset.buildRoom ? { kind: 'buildRoom', id: button.dataset.buildRoom }
            : null;
    if (!payload) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-maou-gambit', JSON.stringify(payload));
  }));

  root.querySelectorAll('[data-room], [data-place], [data-drop-unit], [data-build-slot]').forEach((target) => {
    target.addEventListener('dragover', (event) => {
      event.preventDefault();
      target.classList.add('drop-ready');
    });
    target.addEventListener('dragleave', () => target.classList.remove('drop-ready'));
    target.addEventListener('drop', (event) => {
      event.preventDefault();
      target.classList.remove('drop-ready');
      const raw = event.dataTransfer.getData('application/x-maou-gambit');
      if (!raw) return;
      const payload = JSON.parse(raw);
      commit((state) => {
        if (state.phase !== 'setup' && state.phase !== 'upgrade') return;
        const roomId = target.dataset.room ?? target.dataset.place;
        if (payload.kind === 'unit' && roomId && state.phase === 'setup') {
          placeUnitInRoom(state, payload.id, roomId);
        }
        if (payload.kind === 'object' && roomId) {
          state.selectedRoomId = roomId;
          installRoomObject(state, roomId, payload.id);
        }
        if (payload.kind === 'chip' && target.dataset.dropUnit) {
          equipChipToUnit(state, target.dataset.dropUnit, payload.id);
          state.uiPanel = 'chips';
        }
        if (payload.kind === 'buildRoom' && target.dataset.buildSlot && (state.phase === 'setup' || state.phase === 'upgrade')) {
          state.selectedBuildSlot = target.dataset.buildSlot;
          state.uiPanel = 'build';
          buildRoom(state, payload.id, state.selectedBuildFrom, target.dataset.buildSlot);
        }
      });
    });
  });

  const mapShell = root.querySelector('[data-map-shell]');
  if (mapShell) {
    let dragging = false;
    let last = null;
    let draftCamera = null;
    const pointers = new Map();
    let pinch = null;
    const applyCamera = (camera) => {
      const world = mapShell.querySelector('.map-world');
      if (world) world.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`;
    };
    const getDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const getCenter = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    mapShell.addEventListener('wheel', (event) => {
      event.preventDefault();
      const camera = game.camera ?? overviewCamera();
      const rect = mapShell.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      const worldX = (localX - camera.x) / camera.zoom;
      const worldY = (localY - camera.y) / camera.zoom;
      const delta = event.deltaY < 0 ? 0.1 : -0.1;
      const nextZoom = clampZoom(+(camera.zoom + delta).toFixed(2));
      const next = {
        zoom: nextZoom,
        x: Math.round(localX - worldX * nextZoom),
        y: Math.round(localY - worldY * nextZoom)
      };
      applyCamera(next);
      commit((state) => {
        state.camera = next;
      });
    }, { passive: false });
    mapShell.addEventListener('pointerdown', (event) => {
      if (event.target.closest('.room, .actor, .build-slot, .map-controls')) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      try {
        mapShell.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic and some touch events can fail capture; map gestures still work without it.
      }
      draftCamera = { ...(game.camera ?? overviewCamera()) };
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const center = getCenter(a, b);
        pinch = {
          distance: getDistance(a, b),
          center,
          camera: { ...draftCamera },
          worldCenter: {
            x: (center.x - draftCamera.x) / draftCamera.zoom,
            y: (center.y - draftCamera.y) / draftCamera.zoom
          }
        };
        dragging = false;
        last = null;
        return;
      }
      dragging = true;
      window.__MAOU_MAP_DRAGGING__ = true;
      last = { x: event.clientX, y: event.clientY };
    });
    mapShell.addEventListener('pointermove', (event) => {
      if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pinch && pointers.size >= 2 && draftCamera) {
        const [a, b] = [...pointers.values()];
        const center = getCenter(a, b);
        const distance = Math.max(24, getDistance(a, b));
        const nextZoom = clampZoom(+(pinch.camera.zoom * (distance / pinch.distance)).toFixed(3));
        draftCamera.zoom = nextZoom;
        draftCamera.x = Math.round(center.x - pinch.worldCenter.x * nextZoom);
        draftCamera.y = Math.round(center.y - pinch.worldCenter.y * nextZoom);
        applyCamera(draftCamera);
        return;
      }
      if (!dragging || !last) return;
      const dx = event.clientX - last.x;
      const dy = event.clientY - last.y;
      last = { x: event.clientX, y: event.clientY };
      draftCamera.x += dx;
      draftCamera.y += dy;
      applyCamera(draftCamera);
    });
    const finishPointer = (event) => {
      pointers.delete(event.pointerId);
      if (draftCamera) {
        commit((state) => {
          state.camera = { ...draftCamera };
        });
      }
      dragging = false;
      window.__MAOU_MAP_DRAGGING__ = false;
      last = null;
      pinch = null;
      draftCamera = null;
    };
    mapShell.addEventListener('pointerup', finishPointer);
    mapShell.addEventListener('pointercancel', finishPointer);
  }
}
