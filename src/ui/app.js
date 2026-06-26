import { buildSlotBlocked, buildSlotList, buildSlotRelation, doorSideLabel, doorSides, rooms, roomAtBuildSlot, roomById, roomView, setCustomBuildSlot, slotTaken, worldSize } from '../data/rooms.js';
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
  capturedResearchPreview,
  chipResearchCandidates,
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
const cameraPanMargin = { desktop: 160, mobile: 80 };

function clampZoom(zoom) {
  return Math.max(cameraLimits.min, Math.min(cameraLimits.max, zoom));
}

function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function viewportSize() {
  return {
    width: window.innerWidth || 1200,
    height: window.innerHeight || 760
  };
}

function constrainCamera(camera, view = viewportSize(), marginOverride = null) {
  const zoom = clampZoom(camera.zoom ?? 1);
  const margin = marginOverride ?? (view.width < 720 ? cameraPanMargin.mobile : cameraPanMargin.desktop);
  const scaled = {
    width: worldSize.width * zoom,
    height: worldSize.height * zoom
  };
  const clampAxis = (offset, viewSize, worldSizeAtZoom) => {
    if (worldSizeAtZoom <= viewSize) return Math.round((viewSize - worldSizeAtZoom) / 2);
    return Math.round(clampValue(offset, viewSize - worldSizeAtZoom - margin, margin));
  };
  return {
    zoom: +zoom.toFixed(3),
    x: clampAxis(camera.x ?? 0, view.width, scaled.width),
    y: clampAxis(camera.y ?? 0, view.height, scaled.height)
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
  return constrainCamera({
    zoom: +zoom.toFixed(3),
    x: Math.round((view.width - worldSize.width * zoom) / 2),
    y: Math.round((view.height - worldSize.height * zoom) / 2)
  }, view);
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
  state.camera = constrainCamera({
    zoom: +zoom.toFixed(3),
    x: Math.round(view.width * (view.width < 720 ? 0.5 : 0.42) - (entity.x ?? 0) * zoom),
    y: Math.round(view.height * (view.width < 720 ? 0.34 : 0.45) - (entity.y ?? 0) * zoom)
  }, view);
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

function allyName(kind) {
  return allyTemplates[kind]?.name ?? kind;
}

function waveSummary(stage) {
  const counts = {};
  stage.waves.flat().forEach((spawn) => {
    counts[spawn.kind] = (counts[spawn.kind] ?? 0) + 1;
  });
  return Object.entries(counts).map(([kind, count]) => `${enemyName(kind)}x${count}`).join(' / ');
}

function enemyScoutLines(stage) {
  const kinds = [...new Set(stage.waves.flat().map((spawn) => spawn.kind))];
  return kinds.map((kind) => {
    const template = enemyTemplates[kind];
    if (!template) return '';
    const capture = template.capture ?? { difficulty: 1, ttl: 10 };
    const drops = [
      template.drop?.gold ? `G${template.drop.gold}` : '',
      ...(template.drop?.items ?? []).map((id) => items[id]?.name ?? id)
    ].filter(Boolean).join(' ');
    const convert = allyTemplates[template.convertTo]?.name ?? '不可';
    const material = feedMaterials[kind]?.label ?? feedMaterials.default.label;
    const ransom = capturedSaleValue(template);
    return `<small class="enemy-scout"><b>${template.name}</b> 捕獲${capture.difficulty} 残${capture.ttl}s / 身代金G${ransom} / 落 ${drops || 'なし'} / 眷属 ${convert} / 養分 ${material}</small>`;
  }).join('');
}

function stageEnemyTemplates(stage) {
  return [...new Set(stage.waves.flat().map((spawn) => spawn.kind))]
    .map((kind) => enemyTemplates[kind])
    .filter(Boolean);
}

function planningStage(game) {
  const nextIndex = game.phase === 'upgrade' && game.stageIndex < stages.length - 1
    ? game.stageIndex + 1
    : game.stageIndex;
  return stages[Math.min(nextIndex, stages.length - 1)] ?? currentStage(game);
}

function stageChipAdviceEntries(stage) {
  const enemies = stageEnemyTemplates(stage);
  const entries = [];
  const push = (chipId, reason, priority) => {
    if (!chips[chipId] || entries.some((entry) => entry.chipId === chipId)) return;
    entries.push({ chipId, reason, priority });
  };
  if (enemies.some((enemy) => (enemy.stats?.range ?? 1) > 1)) {
    push('focusRanged', '遠距離職を先に止める', 9);
  }
  if (enemies.some((enemy) => ['mage', 'cleric', 'alchemist', 'sage'].includes(enemy.id))) {
    push('focusMage', '術師系の妨害を優先', 8);
  }
  if (enemies.some((enemy) => (enemy.capture?.difficulty ?? 1) >= 3)) {
    push('focusRare', '捕獲価値の高い敵を逃さない', 7);
    push('carryDowned', '短いダウン猶予を拾う', 6);
  }
  if (enemies.some((enemy) => (enemy.stats?.hp ?? 0) >= 50)) {
    push('focusWeak', '硬い敵を削り切る', 5);
  }
  if (enemies.some((enemy) => (enemy.stats?.spd ?? 0) >= 1.05)) {
    push('chaseNearest', '速い敵の探索を止める', 4);
  }
  return entries.sort((a, b) => b.priority - a.priority).slice(0, 4);
}

function stageChipAdvice(game) {
  const entries = stageChipAdviceEntries(currentStage(game));
  if (!entries.length) return '';
  return `<div class="stage-chip-advice">
    <b>次敵対策</b>
    ${entries.map(({ chipId, reason }) => {
      const chip = chips[chipId];
      const owned = game.chipBag?.[chipId] ?? 0;
      const category = chipCategories[chip.category] ?? { name: '作戦', icon: '▣' };
      const known = owned > 0 || game.collections?.chips?.has?.(chipId);
      return `<button class="stage-chip-advice-row ${game.selectedChipId === chipId ? 'on' : ''}" data-advice-chip="${chipId}" ${owned > 0 ? '' : 'disabled'}>
        <span>${known ? `${chip.icon} ${chip.name}` : `${category.icon} ${category.name}系????`}</span>
        <small>${reason}</small>
        <em>${owned > 0 ? `所持x${owned}` : '未所持'}</em>
      </button>`;
    }).join('')}
  </div>`;
}

function stageThreatProfile(stage) {
  const enemies = stageEnemyTemplates(stage);
  return {
    caster: enemies.some((enemy) => ['mage', 'cleric', 'alchemist', 'sage'].includes(enemy.id)),
    fast: enemies.some((enemy) => (enemy.stats?.spd ?? 0) >= 1.05),
    rare: enemies.some((enemy) => (enemy.capture?.difficulty ?? 1) >= 3),
    ranged: enemies.some((enemy) => (enemy.stats?.range ?? 1) > 1)
  };
}

function firstPlaceableRoom(game, unit, candidates) {
  return candidates.find((roomId) => canPlaceAlly(game, roomId, unit)) ?? rooms.find((room) => canPlaceAlly(game, room.id, unit))?.id;
}

function placementPlanForUnit(game, unit) {
  const threats = stageThreatProfile(currentStage(game));
  const hasChip = (id) => unit.chips.includes(id);
  if (hasChip('carryDowned') && (unit.carry ?? 0) > 0 && threats.rare) {
    return { roomId: firstPlaceableRoom(game, unit, ['atrium', 'storage']), reason: '高難度捕獲を牢屋へ運びやすい' };
  }
  if ((hasChip('focusRanged') && threats.ranged) || (hasChip('focusMage') && threats.caster) || (hasChip('focusRare') && threats.rare)) {
    return { roomId: firstPlaceableRoom(game, unit, ['atrium', 'storage']), reason: '狙いチップを主戦場で活かす' };
  }
  if ((unit.spd ?? 0) >= 1.05 || (hasChip('chaseNearest') && threats.fast)) {
    return { roomId: firstPlaceableRoom(game, unit, ['storage', 'hallA', 'atrium']), reason: '速い敵を入口寄りで止める' };
  }
  if ((unit.range ?? 1) > 1 || threats.ranged || threats.caster) {
    return { roomId: firstPlaceableRoom(game, unit, ['atrium', 'storage']), reason: '遠距離/術師を広間で受ける' };
  }
  return { roomId: firstPlaceableRoom(game, unit, ['storage', 'atrium']), reason: '初動迎撃を厚くする' };
}

function placementAdvice(game) {
  const rows = game.allies
    .map((unit) => ({ unit, plan: placementPlanForUnit(game, unit) }))
    .filter(({ plan }) => plan.roomId);
  if (!rows.length) return '';
  return `<div class="placement-advice">
    <b>配置提案</b>
    ${rows.map(({ unit, plan }) => {
      const room = roomById[plan.roomId];
      const current = unit.homeRoom === plan.roomId;
      return `<button class="placement-advice-row ${current ? 'on' : ''}" data-place-advice-unit="${unit.uid}" data-place-advice-room="${plan.roomId}">
        <span>${unit.name}<small>${room?.name ?? plan.roomId}</small></span>
        <em>${current ? '配置中' : '配置'}</em>
        <small>${plan.reason}</small>
      </button>`;
    }).join('')}
  </div>`;
}

function setupWarnings(game) {
  const warnings = [];
  const hasCarrier = game.allies.some((unit) => unit.chips.includes('carryDowned') && unit.carry > 0);
  const emptySlots = game.allies.filter((unit) => unit.chips.length < unit.int);
  const frontRooms = ['hallA', 'atrium', 'hallB'].filter((room) => isRoomBuilt(game, room));
  const emptyFront = frontRooms.filter((room) => !game.allies.some((unit) => unit.room === room));
  if (emptySlots.length) warnings.push(`チップ枠余り: ${emptySlots.map((unit) => unit.name).join(' / ')}`);
  if (!hasCarrier) warnings.push('搬送役がいない');
  if (emptyFront.length) warnings.push(`前線が空き: ${emptyFront.map((room) => roomById[room].name).join(' / ')}`);
  return warnings.length ? warnings : ['編成チェックOK'];
}

function nextEnemyPanel(game) {
  const stage = planningStage(game);
  const rewardParts = [];
  const rewardChips = [...(stage.reward?.chips ?? []), ...(stage.reward?.chip ? [stage.reward.chip] : [])];
  if (rewardChips.length) rewardParts.push(`報酬 ${rewardChips.map(chipName).join(' / ')}`);
  if (stage.reward?.allies?.length) rewardParts.push(`加入 ${stage.reward.allies.map(allyName).join(' / ')}`);
  if (stage.reward?.gold) rewardParts.push(`G+${stage.reward.gold}`);
  const reward = rewardParts.join(' / ') || '報酬なし';
  return `<div class="info-box next-enemies">
    <b>次の敵情報</b>
    <span>${stage.id}/${stages.length} ${stage.name}</span>
    <small>${waveSummary(stage)}</small>
    ${stageChipAdvice(game)}
    ${enemyScoutLines(stage)}
    <small>${reward}</small>
  </div>`;
}

function investmentAdviceEntries(game) {
  const stage = planningStage(game);
  const threats = stageThreatProfile(stage);
  const entries = [];
  const push = (entry) => {
    if (entries.some((item) => item.id === entry.id)) return;
    entries.push(entry);
  };
  const chipAdvice = stageChipAdviceEntries(stage);
  const missingChip = chipAdvice.find(({ chipId }) => (game.chipBag?.[chipId] ?? 0) <= 0);
  if (missingChip) {
    const chip = chips[missingChip.chipId];
    const category = chipCategories[chip.category] ?? { name: '作戦' };
    push({
      id: 'research-chip',
      title: 'チップ研究',
      target: `${category.name}系????`,
      reason: `${stage.name}に必要な行動を増やす`,
      panel: 'research',
      cta: '研究へ',
      priority: 90
    });
  }
  if (threats.rare && (game.inventory?.silverChain ?? 0) > 0 && isRoomBuilt(game, 'jail')) {
    push({
      id: 'use-silver-chain',
      title: '銀の拘束具',
      target: '牢屋',
      reason: '高難度捕獲のダウン猶予を伸ばす',
      panel: 'loot',
      roomId: 'jail',
      cta: '使用へ',
      priority: 86
    });
  }
  const targetAllyCount = Math.min(4, Math.max(2, game.stageIndex + 2));
  if (game.allies.length < targetAllyCount) {
    push({
      id: 'research-monster',
      title: '魔物研究',
      target: `配下${game.allies.length}/${targetAllyCount}`,
      reason: '迎撃役を増やして部屋ごとの守りを厚くする',
      panel: 'research',
      cta: '研究へ',
      priority: 78
    });
  }
  const crowdedRoom = rooms.find((room) => (
    isRoomBuilt(game, room.id)
    && room.capacity > 0
    && allyCountInRoom(game, room.id) >= roomCapacity(room.id, game)
  ));
  if (crowdedRoom) {
    push({
      id: `upgrade-${crowdedRoom.id}`,
      title: `${crowdedRoom.name}拡張`,
      target: `容量${roomCapacity(crowdedRoom.id, game)}`,
      reason: '配下を分散せず主戦場に置きやすくする',
      panel: 'invest',
      roomId: crowdedRoom.id,
      cta: '拡張へ',
      priority: 70
    });
  }
  if (!isRoomBuilt(game, 'library') && chipResearchCandidates(game).length) {
    push({
      id: 'build-library',
      title: '禁書庫建設',
      target: '研究費軽減',
      reason: '未発見チップを掘る回数を増やす',
      panel: 'build',
      buildRoomId: 'library',
      cta: '建設へ',
      priority: 62
    });
  }
  if (!isRoomBuilt(game, 'nest') && game.allies.length < 5) {
    push({
      id: 'build-nest',
      title: '魔物巣建設',
      target: '魔物研究費軽減',
      reason: '捕獲以外の配下獲得を伸ばす',
      panel: 'build',
      buildRoomId: 'nest',
      cta: '建設へ',
      priority: 58
    });
  }
  const totalItems = Object.values(game.inventory ?? {}).reduce((sum, count) => sum + count, 0);
  if (!isRoomBuilt(game, 'treasure') && totalItems >= inventoryLimit(game) - 2) {
    push({
      id: 'build-treasure',
      title: '宝物庫建設',
      target: `所持${totalItems}/${inventoryLimit(game)}`,
      reason: 'ドロップを捨てずに貯める',
      panel: 'build',
      buildRoomId: 'treasure',
      cta: '建設へ',
      priority: 54
    });
  }
  if (!entries.length) {
    push({
      id: 'default-chip',
      title: 'チップ開発',
      target: '既知チップ',
      reason: '余った資金で行動枚数を増やす',
      panel: 'research',
      cta: '開発へ',
      priority: 1
    });
  }
  return entries.sort((a, b) => b.priority - a.priority).slice(0, 4);
}

function investmentAdvice(game) {
  const entries = investmentAdviceEntries(game);
  return `<div class="investment-advice">
    <b>投資提案</b>
    ${entries.map((entry) => `<button class="investment-advice-row" data-invest-advice-panel="${entry.panel}" ${entry.roomId ? `data-invest-advice-room="${entry.roomId}"` : ''} ${entry.buildRoomId ? `data-invest-advice-build="${entry.buildRoomId}"` : ''} ${entry.chipId ? `data-invest-advice-chip="${entry.chipId}"` : ''}>
      <span>${entry.title}<small>${entry.target}</small></span>
      <em>${entry.cta}</em>
      <small>${entry.reason}</small>
    </button>`).join('')}
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

function chipDiscoveryCard(game) {
  const discovery = game.lastChipDiscovery;
  const chip = chips[discovery?.chipId];
  if (!discovery || !chip) return '';
  const category = chipCategories[chip.category] ?? { name: '作戦', icon: '▣' };
  const canPrepare = game.phase === 'upgrade' && game.stageIndex < stages.length - 1;
  return `<div class="chip-discovery-card">
    <span>${discovery.wasKnown ? '追加開発' : '新発見'}</span>
    <b>${chip.icon} ${chip.name}</b>
    <small>${category.name}系 / 所持x${discovery.count} / ${discovery.label}</small>
    <p>${chip.description}</p>
    ${canPrepare ? `<button class="mini discovery-equip" data-action="prepareChip" data-prepare-chip="${discovery.chipId}">編成で試す</button>` : ''}
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

function researchPreview(game, limit = Infinity) {
  const candidates = chipResearchCandidates(game);
  const labels = candidates.map((id) => {
    const chip = chips[id];
    const category = chipCategories[chip.category] ?? { name: '不明' };
    return (game.chipBag[id] ?? 0) > 0 ? chip.name : `${category.name}系????`;
  });
  if (!labels.length) return '候補なし';
  const visible = labels.slice(0, limit);
  return `${visible.join(' / ')}${labels.length > limit ? ` / 他${labels.length - limit}` : ''}`;
}

function roomManagementPanel(game) {
  const anchor = game.selectedBuildFrom ?? 'atrium';
  const selectedDoor = game.selectedBuildDoor ?? 'north';
  const selectedSlot = game.selectedBuildSlot ?? buildSlotList(game).find((slot) => !slotTaken(game, slot.id))?.id;
  const buildableRooms = rooms.filter((room) => !isRoomBuilt(game, room.id) && room.buildCost);
  const selectedBuildRoom = buildableRooms.some((room) => room.id === game.selectedBuildRoom)
    ? game.selectedBuildRoom
    : buildableRooms[0]?.id;
  const anchorButtons = rooms
    .filter((room) => isRoomBuilt(game, room.id) && canConnectRoom(game, room.id))
    .map((room) => `<button class="mini compact-card ${anchor === room.id ? 'on' : ''}" data-build-anchor="${room.id}">
      <span class="choice-top">${room.name}<em>${connectionCount(game, room.id)}/${room.connectionLimit ?? 4}</em></span>
      <small>接続元</small>
    </button>`)
    .join('');
  const doorButtons = doorSides
    .map((side) => `<button class="mini compact-card ${selectedDoor === side ? 'on' : ''}" data-build-door="${side}">
      <span class="choice-top">${doorSideLabel(side)}<em>${side === 'north' ? '上' : side === 'east' ? '右' : side === 'south' ? '下' : '左'}</em></span>
      <small>接続口</small>
    </button>`)
    .join('');
  const slotButtons = buildSlotList(game)
    .map((slot) => {
      const occupied = slotTaken(game, slot.id);
      const blocked = selectedBuildRoom ? buildSlotBlocked(game, slot.id, selectedBuildRoom) : occupied;
      const relation = buildSlotRelation(game, slot.id, anchor);
      return `<button class="mini compact-card ${selectedSlot === slot.id ? 'on' : ''}" data-build-slot="${slot.id}" ${blocked ? 'disabled' : ''}>
        <span class="choice-top">${occupied ? '占有済' : blocked ? '重複' : relation.direction}<em>${relation.label}</em></span>
        <small>${slot.custom ? 'マップ指定' : occupied ? '別部屋あり' : blocked ? '既存部屋と近い' : relation.distance}</small>
      </button>`;
    })
    .join('');
  const selectedRelation = selectedSlot ? buildSlotRelation(game, selectedSlot, anchor) : null;
  const buildButtons = buildableRooms
    .map((room) => `<button class="mini decision-card ${selectedBuildRoom === room.id ? 'on' : ''}" data-build-room="${room.id}" draggable="true" ${((game.gold ?? 0) < room.buildCost || !selectedSlot || buildSlotBlocked(game, selectedSlot, room.id) || !canConnectRoom(game, anchor) || !canConnectRoom(game, room.id)) ? 'disabled' : ''}>
      <span class="choice-top">${room.name}<em>G${room.buildCost}</em></span>
      <small>${roomById[anchor]?.name ?? anchor}${doorSideLabel(selectedDoor)}から ${selectedRelation ? selectedRelation.direction : '配置点未選択'}へ</small>
      <span class="decision-meta">${roomEffectText(room) || `容量${room.capacity ?? 0}`}</span>
    </button>`)
    .join('');
  const demolishButtons = rooms
    .filter((room) => isRoomBuilt(game, room.id) && !room.built)
    .map((room) => `<button class="mini compact-card danger" data-demolish-room="${room.id}" ${(game.gold ?? 0) < DEMOLISH_ROOM_COST ? 'disabled' : ''}>
      <span class="choice-top">${room.name}<em>G${DEMOLISH_ROOM_COST}</em></span>
      <small>撤去</small>
    </button>`)
    .join('');
  const upgradeButtons = rooms
    .filter((room) => isRoomBuilt(game, room.id) && room.capacity > 0)
    .map((room) => {
      const level = roomLevel(game, room.id);
      const cost = (room.upgradeCost ?? 120) * level;
      return `<button class="mini compact-card" data-upgrade-room="${room.id}" ${(game.gold ?? 0) < cost ? 'disabled' : ''}>
        <span class="choice-top">${room.name}<em>G${cost}</em></span>
        <small>Lv${level} 容量${roomCapacity(room.id, game)}</small>
      </button>`;
    })
    .join('');
  return `<div class="info-box management-box">
    <b>ダンジョン</b>
    <div class="build-layout">
      ${railGroup('接続元', anchorButtons, '接続元なし')}
      ${railGroup('接続扉', doorButtons, '接続扉なし')}
      ${railGroup('配置点', slotButtons, '配置点なし')}
      ${railGroup('建設', buildButtons, '建設候補なし')}
      ${railGroup('拡張', upgradeButtons, '拡張候補なし')}
      ${railGroup('撤去', demolishButtons, '撤去候補なし')}
    </div>
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

function railGroup(label, content, emptyText) {
  return `<div class="rail-group">
    <span>${label}</span>
    <div class="scroll-rail">${content || `<span class="empty-inline">${emptyText}</span>`}</div>
  </div>`;
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
      return `<button class="mini compact-card" ${data} ${disabled ? 'disabled' : ''}>
        <span class="choice-top">${item.name}<em>x${count}</em></span>
        <small>${itemUseLabel(item, game)}</small>
      </button>`;
    })
    .join('');
  const sellButtons = itemEntries
    .map(({ id, count, item }) => {
      return `<button class="mini compact-card" data-sell-item="${id}">
        <span class="choice-top">${item.name}<em>x${count}</em></span>
        <small>売却G${item.value ?? 0}</small>
      </button>`;
    })
    .join('');
  return `<div class="info-box management-box">
    <b>戦利品</b>
    <div class="loot-columns">
      ${railGroup('使用', useButtons, '使用できる素材なし')}
      ${railGroup('売却', sellButtons, '売却品なし')}
    </div>
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
      return `<button class="mini compact-card" data-develop-chip="${id}" ${(game.gold ?? 0) < cost ? 'disabled' : ''}>
        <span class="choice-top">${chips[id].icon} ${chips[id].name}<em>G${cost}</em></span>
        <small>x${game.chipBag[id]} ${chipCategories[chips[id].category]?.name ?? '作戦'}</small>
      </button>`;
    })
    .join('');
  return `<div class="info-box management-box">
    <b>研究</b>
    ${chipDiscoveryCard(game)}
    <div class="research-actions">
      <button class="mini decision-card" data-research-chip ${(game.gold ?? 0) < chipCost ? 'disabled' : ''}>
        <span class="choice-top">▣ チップ研究<em>G${chipCost}</em></span>
        <small>${researchPreview(game, 4)}</small>
        <span class="decision-meta">未発見優先</span>
      </button>
      <button class="mini decision-card" data-research-monster ${(game.gold ?? 0) < monsterCost ? 'disabled' : ''}>
        <span class="choice-top">♟ 魔物研究<em>G${monsterCost}</em></span>
        <small>希少${monsterPreview.rareRate}% / ${monsterSummary}</small>
        <span class="decision-meta">未知優先</span>
      </button>
    </div>
    <small class="research-summary">魔物候補 ${monsterSummary}</small>
    ${railGroup('既知チップ開発', knownChipButtons, '開発候補なし')}
  </div>`;
}

function investmentPanel(game) {
  const chipCost = researchCost(game, CHIP_RESEARCH_COST, 'chip');
  const monsterCost = researchCost(game, MONSTER_RESEARCH_COST, 'monster');
  const monsterPreview = monsterResearchPreview(game);
  const roomId = game.selectedRoomId ?? selectedUnit(game)?.homeRoom ?? 'atrium';
  const room = roomById[roomId];
  const canUpgradeSelectedRoom = room && isRoomBuilt(game, roomId) && room.capacity > 0;
  const roomLevelValue = canUpgradeSelectedRoom ? roomLevel(game, roomId) : 1;
  const roomCost = canUpgradeSelectedRoom ? (room.upgradeCost ?? 120) * roomLevelValue : Infinity;
  const chipId = game.selectedChipId && (game.chipBag?.[game.selectedChipId] ?? 0) > 0
    ? game.selectedChipId
    : Object.keys(game.chipBag ?? {}).find((id) => (game.chipBag[id] ?? 0) > 0);
  const developCost = chipId ? chipDevelopmentCost(game, chipId) : Infinity;
  const unit = selectedUnit(game);
  const canPay = (cost) => Number.isFinite(cost) && (game.gold ?? 0) >= cost;
  return `${treasuryPanel(game)}<div class="info-box management-box investment-box">
    <b>投資</b>
    ${chipDiscoveryCard(game)}
    ${investmentAdvice(game)}
    <div class="investment-grid">
      <button class="mini decision-card" data-research-chip ${!canPay(chipCost) ? 'disabled' : ''}>
        <span class="choice-top">▣ チップ研究<em>G${chipCost}</em></span>
        <small>行動を増やす</small>
        <span class="decision-meta">図鑑 ${collectionRate(game.collections?.chips?.size ?? 0, Object.keys(chips).length)}</span>
      </button>
      <button class="mini decision-card" data-research-monster ${!canPay(monsterCost) ? 'disabled' : ''}>
        <span class="choice-top">♟ 魔物研究<em>G${monsterCost}</em></span>
        <small>配下を増やす</small>
        <span class="decision-meta">希少${monsterPreview.rareRate}%</span>
      </button>
      <button class="mini decision-card" data-upgrade-room="${roomId}" ${(!canUpgradeSelectedRoom || !canPay(roomCost)) ? 'disabled' : ''}>
        <span class="choice-top">□ ${room?.name ?? '部屋'}拡張<em>G${Number.isFinite(roomCost) ? roomCost : '-'}</em></span>
        <small>容量+1</small>
        <span class="decision-meta">現在 ${canUpgradeSelectedRoom ? roomCapacity(roomId, game) : '-'}</span>
      </button>
      <button class="mini decision-card" data-develop-chip="${chipId ?? ''}" ${(!chipId || !canPay(developCost)) ? 'disabled' : ''}>
        <span class="choice-top">${chipId ? `${chips[chipId].icon} ${chips[chipId].name}` : 'チップ'}開発<em>${chipId ? `G${developCost}` : '-'}</em></span>
        <small>${chipId ? `在庫x${game.chipBag[chipId]}` : '候補なし'}</small>
        <span class="decision-meta">${chipId ? chips[chipId].category ? chipCategories[chips[chipId].category]?.name ?? '作戦' : '作戦' : '-'}</span>
      </button>
    </div>
    <div class="focus-strip">
      <span>${unit.name}</span>
      <span>Lv${unit.level ?? 1}</span>
      <span>知性${unit.int}</span>
      <span>${roomById[unit.homeRoom ?? unit.room]?.name ?? unit.room}</span>
    </div>
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
    return `<button class="mini compact-card ${selected.uid === unit.uid ? 'on' : ''}" data-fusion-material="${unit.uid}">
      <span class="choice-top">${unit.name}<em>Lv${unit.level ?? 1}</em></span>
      <small>${item.label}</small>
    </button>`;
  }).join('');
  return `<div class="info-box management-box">
    <b>魔物合成</b>
    <div class="fusion-preview">
      <span><b>${target.name}</b><small>Lv${target.level ?? 1} / 知性${target.int}</small></span>
      <span><b>${selected.name}</b><small>${material.label}</small></span>
      <span><b>${growthPreviewText(preview)}</b><small>素材消費</small></span>
    </div>
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
    .map((item) => `<button class="mini compact-card ${roomId === item.id ? 'on' : ''}" data-object-room="${item.id}">
      <span class="choice-top">${item.name}<em>${roomObjects[game.roomObjects?.[item.id]] ? '有' : '空'}</em></span>
      <small>${roomObjects[game.roomObjects?.[item.id]]?.name ?? '空き'}</small>
    </button>`)
    .join('');
  const buttons = Object.values(roomObjects).map((object) => `<button class="mini decision-card" data-install-object="${object.id}" draggable="true" ${(current || !room || !isRoomBuilt(game, roomId) || (game.gold ?? 0) < object.cost) ? 'disabled' : ''}>
    <span class="choice-top">${object.icon} ${object.name}<em>G${object.cost}</em></span>
    <small>${object.description}</small>
    <span class="decision-meta">${object.risk ?? '設備'}</span>
  </button>`).join('');
  return `<div class="info-box management-box">
    <b>部屋オブジェクト</b>
    <div class="focus-strip">
      <span>${room?.name ?? roomId}</span>
      <span>${current ? `設置中 ${current.name}` : '未設置'}</span>
    </div>
    ${railGroup('設置部屋', roomButtons, '設置先なし')}
    ${railGroup('設備候補', buttons, '設備候補なし')}
    ${current ? `<button class="mini danger wide" data-remove-object="${roomId}">設備撤去<small>G30</small></button>` : ''}
  </div>`;
}

function panelTabs(game, items) {
  return `<div class="tool-tabs">${items.map((item) => `<button class="${game.uiPanel === item.id ? 'on' : ''}" data-ui-panel="${item.id}" title="${item.label}"><b>${item.icon}</b><span>${item.label}</span></button>`).join('')}</div>`;
}

function setupTabItems(game) {
  const base = [
    { id: 'unit', icon: '♟', label: '配下' },
    { id: 'place', icon: '⌖', label: '配置' },
    { id: 'chips', icon: '▣', label: 'チップ' },
    { id: 'info', icon: 'ⓘ', label: '情報' }
  ];
  if (game.stageIndex <= 0) return base;
  return [
    ...base,
    { id: 'build', icon: '□', label: '建設' },
    { id: 'object', icon: '◆', label: '設備' }
  ];
}

function managementPanels(game) {
  const managementIds = ['invest', 'loot', 'research', 'fusion', 'build', 'object', 'info'];
  const active = managementIds.includes(game.uiPanel) ? game.uiPanel : 'invest';
  const panelState = { ...game, uiPanel: active };
  const tabs = panelTabs(panelState, [
    { id: 'invest', icon: '✦', label: '投資' },
    { id: 'loot', icon: '◇', label: '戦利品' },
    { id: 'research', icon: '⌕', label: '研究' },
    { id: 'fusion', icon: '⇄', label: '合成' },
    { id: 'build', icon: '□', label: '建設' },
    { id: 'object', icon: '◆', label: '設備' },
    { id: 'info', icon: 'ⓘ', label: '情報' }
  ]);
  const content = active === 'loot' ? `${treasuryPanel(game)}${inventoryPanel(game)}`
    : active === 'research' ? researchPanel(game)
      : active === 'fusion' ? fusionPanel(game)
        : active === 'build' ? roomManagementPanel(game)
          : active === 'object' ? objectPanel(game)
            : active === 'info' ? `<div class="info-grid">${collectionPanel(game)}${unlockHistory(game)}${nextEnemyPanel(game)}${treasuryPanel(game)}</div>`
              : investmentPanel(game);
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

function chipFit(unit, chipId, game) {
  const chip = chips[chipId];
  const used = assignedChipCounts(game, unit.uid)[chipId] ?? 0;
  const owned = game.chipBag?.[chipId] ?? 0;
  const available = owned - used;
  const equipped = unit.chips.includes(chipId);
  const openSlot = unit.chips.length < unit.int;
  const notes = [];
  let score = 0;

  if (equipped) {
    score += 5;
    notes.push('装備中');
  } else if (available <= 0) {
    notes.push('在庫なし');
  } else if (openSlot) {
    score += 2;
    notes.push('空き枠あり');
  } else {
    score += 1;
    notes.push('入替候補');
  }

  if (chip?.action === 'carryToJail') {
    if ((unit.carry ?? 0) > 0) {
      score += 4;
      notes.push('運搬可');
    } else {
      score -= 4;
      notes.push('運搬不可');
    }
  } else if (chip?.category === 'attack') {
    score += Math.min(4, Math.round((unit.atk ?? 0) / 4));
    if ((unit.range ?? 1) > 1) notes.push('射程あり');
    else notes.push('前衛火力');
  } else if (chip?.category === 'target') {
    score += unit.chips.includes('attack') ? 3 : 1;
    if ((unit.int ?? 0) >= 2) notes.push('判断枠あり');
    if (unit.chips.includes('attack')) notes.push('攻撃役');
  } else if (chip?.category === 'move') {
    score += Math.round((unit.spd ?? 1) * 2);
    notes.push((unit.spd ?? 1) >= 1 ? '移動向き' : '帰還保険');
  }

  const label = equipped ? '使用中'
    : available <= 0 ? '不可'
      : score >= 6 ? '相性高'
        : score >= 3 ? '有効'
          : '要検討';
  return { label, notes: [...new Set(notes)].slice(0, 3), score, canEquip: equipped || available > 0 };
}

function chipFitList(game, chipId) {
  const rows = game.allies
    .map((unit) => ({ unit, fit: chipFit(unit, chipId, game) }))
    .sort((a, b) => b.fit.score - a.fit.score);
  return `<div class="chip-fit-list">
    <b>配下相性</b>
    ${rows.map(({ unit, fit }) => `<button class="chip-fit-row ${unit.uid === game.selectedUnitId ? 'on' : ''}" data-chip-fit-unit="${unit.uid}" data-chip-fit-chip="${chipId}" ${fit.canEquip ? '' : 'disabled'}>
      <span>${unit.name}<small>知性${unit.int} ${unit.chips.length}/${unit.int}</small></span>
      <em>${fit.label}</em>
      <small>${fit.notes.join(' / ')}</small>
    </button>`).join('')}
  </div>`;
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
    ${chipFitList(game, chipId)}
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
  const setupTabs = setupTabItems(game);
  const setupPanelIds = [...setupTabs.map((item) => item.id), 'build', 'object'];
  const active = setupPanelIds.includes(game.uiPanel) ? game.uiPanel : 'unit';
  const tabs = panelTabs(game, setupTabs);
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
    ${placementAdvice(game)}
    <div class="room-picker" aria-label="配置先">
      <div class="scroll-rail">${rooms.filter((room) => room.capacity > 0 && isRoomBuilt(game, room.id)).map((room) =>
        roomChoice(room, unit, game)
      ).join('')}</div>
    </div>
  </div>`;
  const chipSection = `<div class="setup-section">
    <div class="unit-picker" aria-label="配下選択">
      <div class="unit-list">${game.allies.map((ally) => unitCard(ally, game)).join('')}</div>
    </div>
    ${stageChipAdvice(game)}
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

function battleSpeedbar(game) {
  if (game.phase !== 'battle') return '';
  return `<div class="battle-speedbar" aria-label="戦闘速度">
    <button type="button" class="speed-pause" data-speed-pause="true" title="${game.speed === 0 ? '再開' : '一時停止'}" aria-pressed="${game.speed === 0}">${game.speed === 0 ? '▶' : 'Ⅱ'}</button>
    <div class="speed-options" role="group" aria-label="倍率">
      <button type="button" class="${game.speed === 1 ? 'on' : ''}" data-set-speed="1" title="等速" aria-pressed="${game.speed === 1}">1x</button>
      <button type="button" class="${game.speed === 2 ? 'on' : ''}" data-set-speed="2" title="2倍速" aria-pressed="${game.speed === 2}">2x</button>
      <button type="button" class="${game.speed === 4 ? 'on' : ''}" data-set-speed="4" title="4倍速" aria-pressed="${game.speed === 4}">4x</button>
    </div>
  </div>`;
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
    ${captureReport(game)}
    <button class="primary wide" data-action="${result.won ? 'upgrade' : 'restart'}">${result.won ? '捕獲処理へ' : '再挑戦'}</button>
  </aside>`;
}

function captureReport(game) {
  const stats = game.result?.captureStats ?? game.captureStats ?? { opportunities: 0, captured: game.captured.length, expired: 0, interrupted: 0 };
  const missed = Math.max(0, (stats.opportunities ?? 0) - (stats.captured ?? 0));
  const rate = stats.opportunities ? Math.round(((stats.captured ?? 0) / stats.opportunities) * 100) : 0;
  const canUseSilverChain = missed > 0
    && (stats.expired ?? 0) > 0
    && (game.inventory?.silverChain ?? 0) > 0
    && isRoomBuilt(game, 'jail');
  const reason = stats.opportunities <= 0 ? '敵をダウンさせると捕獲機会が生まれる'
    : missed <= 0 ? '捕獲機会を逃さず牢屋へ運べた'
      : (stats.expired ?? 0) > 0 ? 'ダウン猶予切れ。牢屋搬送役や銀の拘束具が効く'
        : (stats.interrupted ?? 0) > 0 ? '運搬中断。運搬役の耐久や配置を見直す'
          : '捕獲役の配置とチップを見直す';
  return `<div class="capture-report">
    <b>捕獲レポート</b>
    <div class="capture-report-grid">
      <span>機会<em>${stats.opportunities ?? 0}</em></span>
      <span>成功<em>${stats.captured ?? game.captured.length}</em></span>
      <span>消滅<em>${stats.expired ?? 0}</em></span>
      <span>成功率<em>${rate}%</em></span>
    </div>
    <small>${reason}</small>
    ${canUseSilverChain ? '<button class="capture-report-action" data-capture-report-action="silverChain">銀の拘束具を使う</button>' : ''}
  </div>`;
}

function upgradePanel(game) {
  const captured = game.captured.find((item) => item.uid === game.selectedCapturedId) ?? game.captured[0];
  const target = selectedUnit(game);
  const feedText = captured ? feedPreviewText(target, captured) : '';
  if (!captured) {
    return `<aside class="panel upgrade-panel">
      <header class="panel-head"><span>強化</span></header>
      <p class="empty">捕獲なし。報酬チップを受け取り、次へ進む。</p>
      ${captureReport(game)}
      ${managementPanels(game)}
      <button class="primary wide" data-action="nextStage">次の防衛へ</button>
    </aside>`;
  }
  return `<aside class="panel upgrade-panel">
    <header class="panel-head"><span>捕獲処理</span></header>
    ${captureReport(game)}
    <div class="unit-picker" aria-label="捕獲敵選択">
      <div class="unit-list">${game.captured.map((item) => capturedCard(item, game)).join('')}</div>
    </div>
    <div class="detail-card">
      <div class="detail-title"><img src="${captured.sprite}" alt="${captured.name}" /><div><b>${captured.name}</b><small>牢屋で拘束中</small>${convertPreview(captured)}<small>解析 ${capturedResearchPreview(captured, game)}</small></div></div>
    </div>
    <div class="upgrade-actions">
      <button data-upgrade="convert" data-captured="${captured.uid}">🧠 眷属化</button>
      <button data-upgrade="feed" data-captured="${captured.uid}" data-target="${target.uid}">🩸 ${target.name} ${feedText}</button>
      <button data-upgrade="research" data-captured="${captured.uid}">📜 研究 ${capturedResearchPreview(captured, game)}</button>
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
      ${battleSpeedbar(game)}
      ${panel}
    </section>
  </main>`;

  function bindFastButton(button, handler) {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.dataset.pointerHandled = '1';
      handler();
    });
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (button.dataset.pointerHandled === '1') {
        delete button.dataset.pointerHandled;
        return;
      }
      handler();
    });
  }

  root.querySelectorAll('[data-unit]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    state.selectedUnitId = button.dataset.unit;
    state.selectedEntity = { type: 'ally', id: button.dataset.unit };
  })));
  root.querySelectorAll('[data-place]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    placeUnitInRoom(state, state.selectedUnitId, button.dataset.place);
  })));
  root.querySelectorAll('[data-place-advice-unit]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    placeUnitInRoom(state, button.dataset.placeAdviceUnit, button.dataset.placeAdviceRoom);
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
  root.querySelectorAll('[data-advice-chip]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    state.selectedChipId = button.dataset.adviceChip;
    state.uiPanel = 'chips';
  })));
  root.querySelectorAll('[data-captured-select]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    state.selectedCapturedId = button.dataset.capturedSelect;
  })));
  root.querySelectorAll('[data-upgrade]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    consumeCaptured(state, button.dataset.captured, button.dataset.upgrade, button.dataset.target);
    state.selectedCapturedId = state.captured[0]?.uid ?? null;
  })));
  let buildPreviewTimer = null;
  root.querySelectorAll('[data-build-room]').forEach((button) => {
    const previewNow = () => {
      const roomId = button.dataset.buildRoom;
      if (game.selectedBuildRoom === roomId) return;
      commit((state) => {
        state.selectedBuildRoom = roomId;
      });
    };
    const previewSoon = () => {
      if (buildPreviewTimer) window.clearTimeout(buildPreviewTimer);
      buildPreviewTimer = window.setTimeout(previewNow, 90);
    };
    button.addEventListener('pointerenter', previewSoon);
    button.addEventListener('focus', previewNow);
    button.addEventListener('click', () => commit((state) => {
      state.selectedBuildRoom = button.dataset.buildRoom;
      buildRoom(state, button.dataset.buildRoom, state.selectedBuildFrom, state.selectedBuildSlot, state.selectedBuildDoor);
    }));
  });
  root.querySelectorAll('[data-build-anchor]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    state.selectedBuildFrom = button.dataset.buildAnchor;
  })));
  root.querySelectorAll('[data-build-door]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    state.selectedBuildDoor = button.dataset.buildDoor;
  })));
  root.querySelectorAll('[data-build-slot]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    if (buildSlotBlocked(state, button.dataset.buildSlot, state.selectedBuildRoom)) return;
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
  root.querySelectorAll('[data-chip-fit-unit]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    equipChipToUnit(state, button.dataset.chipFitUnit, button.dataset.chipFitChip);
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
  root.querySelectorAll('[data-invest-advice-panel]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    state.uiPanel = button.dataset.investAdvicePanel;
    if (button.dataset.investAdviceRoom) state.selectedRoomId = button.dataset.investAdviceRoom;
    if (button.dataset.investAdviceChip) state.selectedChipId = button.dataset.investAdviceChip;
    if (button.dataset.investAdviceBuild) {
      state.selectedBuildRoom = button.dataset.investAdviceBuild;
      const slot = buildSlotList(state).find((item) => !buildSlotBlocked(state, item.id, button.dataset.investAdviceBuild));
      if (slot) state.selectedBuildSlot = slot.id;
    }
  })));
  root.querySelectorAll('[data-capture-report-action]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    if (button.dataset.captureReportAction === 'silverChain') {
      state.phase = 'upgrade';
      state.uiPanel = 'loot';
      state.selectedRoomId = 'jail';
    }
  })));
  root.querySelectorAll('[data-set-speed]').forEach((button) => bindFastButton(button, () => commit((state) => {
    state.speed = Number(button.dataset.setSpeed);
  })));
  root.querySelectorAll('[data-speed-pause]').forEach((button) => bindFastButton(button, () => commit((state) => {
    state.speed = state.speed === 0 ? 1 : 0;
  })));
  root.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    if (button.dataset.action === 'start') {
      startStage(state);
      focusCameraOn(state, selectedEntity(state), detailZoom());
    }
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
    if (button.dataset.action === 'prepareChip') {
      const chipId = button.dataset.prepareChip;
      finishUpgrade(state);
      if (state.phase === 'setup') {
        state.uiPanel = 'chips';
        state.selectedChipId = chipId;
      }
    }
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
    const next = { ...state.camera };
    if (button.dataset.mapaction === 'zoomIn') next.zoom = clampZoom(+(next.zoom + 0.18).toFixed(2));
    if (button.dataset.mapaction === 'zoomOut') next.zoom = clampZoom(+(next.zoom - 0.18).toFixed(2));
    if (button.dataset.mapaction === 'panLeft') next.x += 72;
    if (button.dataset.mapaction === 'panRight') next.x -= 72;
    if (button.dataset.mapaction === 'panUp') next.y += 72;
    if (button.dataset.mapaction === 'panDown') next.y -= 72;
    if (button.dataset.mapaction === 'reset') state.camera = overviewCamera();
    if (button.dataset.mapaction === 'focusSelected') focusCameraOn(state, selectedEntity(state));
    if (button.dataset.mapaction === 'focusEnemy') focusCameraOn(state, state.enemies[0] ?? state.downed[0]);
    if (!['reset', 'focusSelected', 'focusEnemy'].includes(button.dataset.mapaction)) state.camera = constrainCamera(next);
  })));

  root.querySelectorAll('[draggable="true"]').forEach((button) => button.addEventListener('dragstart', (event) => {
    const payload = button.dataset.unit ? { kind: 'unit', id: button.dataset.unit }
      : button.dataset.chip ? { kind: 'chip', id: button.dataset.chip }
        : button.dataset.installObject ? { kind: 'object', id: button.dataset.installObject }
          : button.dataset.buildRoom ? { kind: 'buildRoom', id: button.dataset.buildRoom }
            : null;
    if (!payload) return;
    window.__MAOU_DRAG_PAYLOAD__ = payload;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-maou-gambit', JSON.stringify(payload));
  }));
  root.querySelectorAll('[draggable="true"]').forEach((button) => button.addEventListener('dragend', () => {
    window.__MAOU_DRAG_PAYLOAD__ = null;
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
          buildRoom(state, payload.id, state.selectedBuildFrom, target.dataset.buildSlot, state.selectedBuildDoor);
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
    let pointerStart = null;
    const keepBuildPreviewReadable = (camera, roomId, slot) => {
      const actualRoom = roomAtBuildSlot(
        slot?.custom ? { customBuildSlot: slot } : { customBuildSlot: null },
        roomId,
        slot?.id
      );
      if (!actualRoom) return camera;
      const mapRect = mapShell.getBoundingClientRect();
      const panelRect = root.querySelector('.panel')?.getBoundingClientRect();
      if (!panelRect || panelRect.left <= mapRect.left || panelRect.top >= mapRect.bottom) return camera;

      const zoom = camera.zoom ?? 1;
      const preview = {
        left: actualRoom.x * zoom + camera.x - (actualRoom.w * zoom) / 2,
        right: actualRoom.x * zoom + camera.x + (actualRoom.w * zoom) / 2,
        top: actualRoom.y * zoom + camera.y - (actualRoom.h * zoom) / 2,
        bottom: actualRoom.y * zoom + camera.y + (actualRoom.h * zoom) / 2
      };
      const panelInMap = {
        left: panelRect.left - mapRect.left,
        top: panelRect.top - mapRect.top,
        bottom: panelRect.bottom - mapRect.top
      };
      const verticalOverlap = preview.bottom > panelInMap.top && preview.top < panelInMap.bottom;
      if (!verticalOverlap || preview.right < panelInMap.left - 18) return camera;
      return constrainCamera({
        ...camera,
        x: camera.x - Math.ceil(preview.right - panelInMap.left + 34)
      }, viewportSize(), panelRect.width + cameraPanMargin.desktop);
    };
    const autoPanBuildDrag = (event, camera) => {
      const rect = mapShell.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      const zone = 88;
      const step = 170;
      const next = { ...camera };
      if (localX < zone) next.x += step;
      if (localX > rect.width - zone) next.x -= step;
      if (localY < zone) next.y += step;
      if (localY > rect.height - zone) next.y -= step;
      return constrainCamera(next);
    };
    const mapWorldPoint = (event, camera = game.camera ?? overviewCamera()) => {
      const rect = mapShell.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      return {
        x: (localX - camera.x) / camera.zoom,
        y: (localY - camera.y) / camera.zoom
      };
    };
    const payloadFromDrag = (event) => {
      const raw = event.dataTransfer?.getData('application/x-maou-gambit');
      if (!raw) return window.__MAOU_DRAG_PAYLOAD__ ?? null;
      try {
        return JSON.parse(raw);
      } catch {
        return window.__MAOU_DRAG_PAYLOAD__ ?? null;
      }
    };
    mapShell.addEventListener('dragover', (event) => {
      const payload = payloadFromDrag(event);
      if (!payload || payload.kind !== 'buildRoom') return;
      event.preventDefault();
      mapShell.classList.add('drop-ready');
      const camera = game.camera ?? overviewCamera();
      const nextCamera = autoPanBuildDrag(event, camera);
      const point = mapWorldPoint(event, nextCamera);
      commit((state) => {
        if (!['setup', 'upgrade'].includes(state.phase)) return;
        state.uiPanel = 'build';
        state.selectedBuildRoom = payload.id;
        const slot = setCustomBuildSlot(state, point.x, point.y);
        state.camera = keepBuildPreviewReadable(nextCamera, payload.id, slot);
        applyCamera(state.camera);
      });
    });
    mapShell.addEventListener('dragleave', () => mapShell.classList.remove('drop-ready'));
    mapShell.addEventListener('drop', (event) => {
      const payload = payloadFromDrag(event);
      if (!payload || payload.kind !== 'buildRoom') return;
      event.preventDefault();
      mapShell.classList.remove('drop-ready');
      const camera = game.camera ?? overviewCamera();
      const nextCamera = constrainCamera(camera);
      const point = mapWorldPoint(event, nextCamera);
      commit((state) => {
        if (!['setup', 'upgrade'].includes(state.phase)) return;
        state.uiPanel = 'build';
        state.selectedBuildRoom = payload.id;
        const slot = state.customBuildSlot && state.selectedBuildSlot === state.customBuildSlot.id
          ? state.customBuildSlot
          : setCustomBuildSlot(state, point.x, point.y);
        state.selectedBuildSlot = slot.id;
        state.camera = keepBuildPreviewReadable(nextCamera, payload.id, slot);
        buildRoom(state, payload.id, state.selectedBuildFrom, slot.id, state.selectedBuildDoor);
      });
      window.__MAOU_DRAG_PAYLOAD__ = null;
    });
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
      const next = constrainCamera({
        zoom: nextZoom,
        x: Math.round(localX - worldX * nextZoom),
        y: Math.round(localY - worldY * nextZoom)
      });
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
      draftCamera = constrainCamera(game.camera ?? overviewCamera());
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
      pointerStart = { x: event.clientX, y: event.clientY, camera: { ...draftCamera } };
    });
    mapShell.addEventListener('pointermove', (event) => {
      if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pinch && pointers.size >= 2 && draftCamera) {
        const [a, b] = [...pointers.values()];
        const center = getCenter(a, b);
        const distance = Math.max(24, getDistance(a, b));
        const nextZoom = clampZoom(+(pinch.camera.zoom * (distance / pinch.distance)).toFixed(3));
        draftCamera = constrainCamera({
          zoom: nextZoom,
          x: Math.round(center.x - pinch.worldCenter.x * nextZoom),
          y: Math.round(center.y - pinch.worldCenter.y * nextZoom)
        });
        applyCamera(draftCamera);
        return;
      }
      if (!dragging || !last) return;
      const dx = event.clientX - last.x;
      const dy = event.clientY - last.y;
      last = { x: event.clientX, y: event.clientY };
      draftCamera = constrainCamera({
        ...draftCamera,
        x: draftCamera.x + dx,
        y: draftCamera.y + dy
      });
      applyCamera(draftCamera);
    });
    const finishPointer = (event) => {
      const start = pointerStart;
      const wasPinching = Boolean(pinch);
      pointers.delete(event.pointerId);
      const clickDistance = start ? Math.hypot(event.clientX - start.x, event.clientY - start.y) : Infinity;
      if (draftCamera) {
        commit((state) => {
          state.camera = { ...draftCamera };
          if (!wasPinching && clickDistance < 6 && ['setup', 'upgrade'].includes(state.phase) && state.uiPanel === 'build') {
            const rect = mapShell.getBoundingClientRect();
            const localX = event.clientX - rect.left;
            const localY = event.clientY - rect.top;
            setCustomBuildSlot(
              state,
              (localX - start.camera.x) / start.camera.zoom,
              (localY - start.camera.y) / start.camera.zoom
            );
          }
        });
      }
      dragging = false;
      window.__MAOU_MAP_DRAGGING__ = false;
      last = null;
      pointerStart = null;
      pinch = null;
      draftCamera = null;
    };
    mapShell.addEventListener('pointerup', finishPointer);
    mapShell.addEventListener('pointercancel', finishPointer);
  }
}
