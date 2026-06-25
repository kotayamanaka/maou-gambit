import { rooms } from '../data/rooms.js';
import { roomById } from '../data/rooms.js';
import { chips } from '../data/chips.js';
import { enemyChips } from '../data/enemyChips.js';
import { allyTemplates, enemyTemplates } from '../data/units.js';
import { feedMaterials } from '../data/growth.js';
import { currentStage, resetToSetup, startStage } from '../game/state.js';
import { consumeCaptured, finishUpgrade } from '../systems/progression.js';
import { allyCountInRoom, canPlaceAlly, roomCapacity } from '../systems/placement.js';
import { growthProfile, nextIntExp, nextLevelExp, previewFeedGrowth } from '../systems/growth.js';
import { renderMap } from '../render/mapView.js';

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
  const reward = stage.reward?.chip ? `報酬 ${chipName(stage.reward.chip)}` : '報酬なし';
  return `<div class="info-box next-enemies">
    <b>次の敵情報</b>
    <span>${stage.name}</span>
    <small>${waveSummary(stage)}</small>
    <small>${reward}</small>
  </div>`;
}

function unlockHistory(game) {
  return `<div class="info-box unlock-history">
    <b>チップ解放履歴</b>
    ${(game.chipUnlocks ?? []).map((line) => `<small>${line}</small>`).join('') || '<small>まだなし</small>'}
  </div>`;
}

function unitCard(unit, game) {
  return `<button class="unit-card ${unit.uid === game.selectedUnitId ? 'on' : ''}" data-unit="${unit.uid}">
    <img src="${unit.sprite}" alt="${unit.name}" />
    <span><b>${unit.name}</b><small>LV${unit.level ?? 1} E${unit.exp ?? 0}/${nextLevelExp(unit)} 知${unit.intExp ?? 0}/${nextIntExp(unit)} INT${unit.int}</small><em>${unit.chips.map((id) => chips[id]?.icon ?? '□').join('')}</em></span>
  </button>`;
}

function feedPreviewText(unit, captured) {
  const preview = previewFeedGrowth(unit, captured);
  const parts = [`EXP+${preview.material.exp}`];
  if (preview.material.intExp) parts.push(`知+${preview.material.intExp}`);
  if (preview.levelUps) parts.push(`LV+${preview.levelUps}`);
  if (preview.intUps) parts.push(`INT+${preview.intUps}`);
  if (preview.diff.maxHp) parts.push(`HP+${preview.diff.maxHp}`);
  if (preview.diff.atk) parts.push(`ATK+${preview.diff.atk}`);
  if (preview.diff.spd) parts.push(`SPD+${preview.diff.spd}`);
  return parts.join(' ');
}

function feedCompare(unit, captured) {
  const preview = previewFeedGrowth(unit, captured);
  const after = preview.after;
  return `<div class="compare-box">
    <span>LV ${unit.level ?? 1} -> ${after.level}</span>
    <span>HP ${unit.maxHp} -> ${after.maxHp}</span>
    <span>ATK ${unit.atk} -> ${after.atk}</span>
    <span>SPD ${unit.spd} -> ${after.spd}</span>
    <span>INT ${unit.int} -> ${after.int}</span>
    <span>EXP ${unit.exp ?? 0} -> ${after.exp}</span>
    <span>知 ${unit.intExp ?? 0} -> ${after.intExp}</span>
  </div>`;
}

function capturedCard(captured, game) {
  const selected = (game.selectedCapturedId ?? game.captured[0]?.uid) === captured.uid;
  return `<button class="unit-card ${selected ? 'on' : ''}" data-captured-select="${captured.uid}">
    <img src="${captured.sprite}" alt="${captured.name}" />
    <span><b>${captured.name}</b><small>${feedMaterials[captured.templateId]?.label ?? '素材'}</small></span>
  </button>`;
}

function convertPreview(captured) {
  const template = allyTemplates[captured.convertTo];
  if (!template) return '<small>眷属化不可</small>';
  return `<small>${template.name}になる / HP${template.stats.hp} ATK${template.stats.atk} INT${template.stats.int}</small>`;
}

function researchPreview(game) {
  const candidates = Object.keys(chips).filter((id) => (game.chipBag[id] ?? 0) < 3);
  return candidates.map((id) => chips[id].name).join(' / ') || '候補なし';
}

function roomChoice(room, unit, game) {
  const capacity = roomCapacity(room.id);
  const count = allyCountInRoom(game, room.id, unit.uid);
  const full = !canPlaceAlly(game, room.id, unit);
  return `<button class="mini ${unit.room === room.id ? 'on' : ''}" data-place="${room.id}" ${full ? 'disabled' : ''}>
    ${room.name}<small>${count}/${capacity}</small>
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
  return `<button class="chip ${inUnit ? 'on' : ''} ${locked ? 'locked' : ''} ${selected ? 'selected-chip' : ''}" data-chip="${chipId}" data-locked="${locked ? '1' : '0'}" title="${chip.description}">
    <b>${chip.icon}</b><span>${chip.name}</span><small>${locked ? '未発見' : inUnit ? '装備中' : `残${available}`}</small>
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
  return `<div class="detail-card chip-detail">
    <div class="detail-title"><b>${chip.icon} ${chip.name}</b><small>${owned > 0 || equipped ? `所持 ${owned}` : '未発見'}</small></div>
    <p>${chip.description}</p>
    <div class="mini-stat">条件 ${chip.condition} / 行動 ${chip.action} / ${equipped ? '装備中' : '未装備'}</div>
  </div>`;
}

function setupPanel(game) {
  const unit = selectedUnit(game);
  const profile = growthProfile(unit);
  const warnings = setupWarnings(game);
  return `<aside class="panel setup-panel">
    <header class="panel-head">
      <span>${currentStage(game).id}/3 ${currentStage(game).name}</span>
      <button class="primary" data-action="start" title="侵入開始">▶</button>
    </header>
    <div class="unit-picker" aria-label="配下選択">
      <div class="unit-list">${game.allies.map((ally) => unitCard(ally, game)).join('')}</div>
    </div>
    <div class="stats setup-stats" aria-label="${unit.name}の能力">
      <span>LV ${unit.level ?? 1}</span><span>HP ${unit.maxHp}</span><span>ATK ${unit.atk}</span><span>SPD ${unit.spd}</span>
      <span class="core">INT ${unit.int}</span><span>EXP ${unit.exp ?? 0}/${nextLevelExp(unit)}</span><span>知 ${unit.intExp ?? 0}/${nextIntExp(unit)}</span>
      <span>CRY ${unit.carry}</span><span>RNG ${unit.range}</span><span>${profile.label}</span><span>${roomById[unit.homeRoom]?.name ?? unit.homeRoom}</span>
    </div>
    <div class="advice-box">${warnings.map((line) => `<p>${line}</p>`).join('')}</div>
    <div class="room-picker" aria-label="配置先">
      <div class="scroll-rail">${rooms.filter((room) => room.capacity > 0).map((room) =>
        roomChoice(room, unit, game)
      ).join('')}</div>
    </div>
    <div class="chips-box" aria-label="チップ">
      <div class="chip-meter">${unit.chips.length}/${unit.int}</div>
      <div class="chip-grid scroll-rail">${visibleChipIds(game, unit).map((id) => chipButton(id, unit, game)).join('')}</div>
    </div>
    ${chipDetail(game, unit)}
    <div class="info-grid">${nextEnemyPanel(game)}${unlockHistory(game)}</div>
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
  return `<aside class="panel battle-panel">
    <header class="panel-head">
      <span>防衛中</span>
      <div class="panel-actions">
        <button data-action="pause">${game.speed === 0 ? '▶' : 'Ⅱ'}</button>
        <button data-action="speed">×${game.speed || 1}</button>
        <button data-action="retry">↻</button>
        <button data-action="retreat">撤退</button>
      </div>
    </header>
    <div class="boss-box">
      <b>魔王HP ${game.demonLord.hp}/${game.demonLord.maxHp}</b>
      ${hpBar(game.demonLord.hp, game.demonLord.maxHp)}
    </div>
    <div class="battle-stats">
      <span>⏱ ${Math.round(game.elapsed)}s</span>
      <span>⚔ ${game.defeated}</span>
      <span>⛓ ${game.captured.length}</span>
      <span>${game.partyKnowledge.throneKnown ? '❗発見済' : '？探索中'}</span>
      <span>与ダメ ${game.metrics?.allyDamage ?? 0}</span>
      <span>被ダメ ${game.metrics?.enemyDamage ?? 0}</span>
    </div>
    <div class="status-strip"><span>運搬 ${carrying}</span><span>ダウン ${downed}</span></div>
    ${entity ? `<div class="battle-detail">
      <div class="detail-title">
        <img src="${entity.sprite}" alt="${entity.name}" />
        <div><b>${entity.name}</b><small>${entity.room ? roomById[entity.room]?.name ?? entity.room : '戦場'}</small></div>
      </div>
      ${entityStatus ? `<div class="mini-stat">${entityStatus}</div>` : ''}
      ${entity.maxHp ? `<div class="mini-stat">${entity.level ? `LV ${entity.level} / ` : ''}HP ${entity.hp}/${entity.maxHp}${entity.atk ? ` / ATK ${entity.atk}` : ''}${entity.int != null ? ` / INT ${entity.int}` : ''}</div>${hpBar(entity.hp, entity.maxHp)}` : ''}
      ${isAlly ? `<div class="battle-chips">${entity.chips.map((id) => `<span>${chips[id]?.icon ?? '□'} ${chips[id]?.name ?? id}</span>`).join('')}</div>` : ''}
      ${isEnemy ? `<div class="battle-chips">${entity.chips.map((id) => `<span>${enemyChips[id]?.icon ?? '□'} ${enemyChips[id]?.name ?? id}</span>`).join('')}</div>` : ''}
    </div>` : ''}
    <div class="panel-actions map-focus-row">
      <button data-mapaction="focusSelected">選択へ</button>
      <button data-mapaction="focusEnemy">侵入者へ</button>
      <button data-action="toggleLog">${game.showLog ? 'ログ隠す' : 'ログ表示'}</button>
    </div>
    ${game.showLog ? `<div class="log">${game.log.map((line) => `<p>${line}</p>`).join('')}</div>` : '<div class="log compact-log"><p>ログ非表示</p></div>'}
  </aside>`;
}

function resultPanel(game) {
  const result = game.result;
  return `<aside class="panel result-panel">
    <header class="panel-head"><span>${result.won ? '撃退成功' : '敗北'}</span></header>
    <div class="result-grid">
      <span>撃退<b>${result.defeated}</b></span>
      <span>捕獲<b>${result.captured}</b></span>
      <span>魔王HP<b>${result.lordHp}</b></span>
      <span>時間<b>${result.elapsed}s</b></span>
      <span>与ダメ<b>${game.metrics?.allyDamage ?? 0}</b></span>
      <span>被ダメ<b>${game.metrics?.enemyDamage ?? 0}</b></span>
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
    <div class="unit-picker feed-targets" aria-label="養分対象">
      <div class="unit-list">${game.allies.map((ally) => unitCard(ally, game)).join('')}</div>
    </div>
    ${feedCompare(target, captured)}
    <div class="info-box"><b>研究候補</b><small>${researchPreview(game)}</small></div>
    <div class="upgrade-actions">
      <button data-upgrade="convert" data-captured="${captured.uid}">🧠 眷属化</button>
      <button data-upgrade="feed" data-captured="${captured.uid}" data-target="${target.uid}">🩸 ${target.name} ${feedText}</button>
      <button data-upgrade="research" data-captured="${captured.uid}">📜 研究</button>
    </div>
    <button class="wide" data-action="nextStage">処理を終えて次へ</button>
  </aside>`;
}

function endPanel(game, won) {
  return `<aside class="panel result-panel">
    <header class="panel-head"><span>${won ? '魔王軍勝利' : '魔王敗北'}</span></header>
    <p class="empty">${won ? '三度の侵入を退けた。' : '魔王が討たれた。'}</p>
    <button class="primary wide" data-action="newRun">新しいラン</button>
  </aside>`;
}

export function renderApp(root, game, commit) {
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
    const unit = selectedUnit(state);
    if (!canPlaceAlly(state, button.dataset.place, unit)) return;
    unit.room = button.dataset.place;
    unit.homeRoom = unit.room;
    unit.x = roomById[unit.room].x;
    unit.y = roomById[unit.room].y;
    unit.movingTo = null;
  })));
  root.querySelectorAll('[data-room]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    state.selectedRoomId = button.dataset.room;
    const blocked = ['entrance', 'throne'];
    if (state.phase === 'setup' && !blocked.includes(button.dataset.room)) {
      const unit = selectedUnit(state);
      if (!canPlaceAlly(state, button.dataset.room, unit)) return;
      unit.room = button.dataset.room;
      unit.homeRoom = unit.room;
      unit.x = roomById[unit.room].x;
      unit.y = roomById[unit.room].y;
      unit.movingTo = null;
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
  root.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    if (button.dataset.action === 'start') startStage(state);
    if (button.dataset.action === 'pause') state.speed = state.speed === 0 ? 1 : 0;
    if (button.dataset.action === 'speed') state.speed = state.speed <= 1 ? 2 : state.speed === 2 ? 4 : 1;
    if (button.dataset.action === 'retry') startStage(state);
    if (button.dataset.action === 'retreat') resetToSetup(state);
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
  const focusCameraOn = (state, entity) => {
    if (!entity) return;
    state.camera ??= { zoom: 0.78, x: 16, y: 16 };
    const zoom = Math.max(0.72, state.camera.zoom);
    state.camera.zoom = zoom;
    state.camera.x = Math.round(window.innerWidth * 0.42 - (entity.x ?? 0) * zoom);
    state.camera.y = Math.round(window.innerHeight * 0.42 - (entity.y ?? 0) * zoom);
  };
  root.querySelectorAll('[data-mapaction]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    state.camera ??= { zoom: 1, x: 0, y: 0 };
    if (button.dataset.mapaction === 'zoomIn') state.camera.zoom = Math.min(1.65, +(state.camera.zoom + 0.15).toFixed(2));
    if (button.dataset.mapaction === 'zoomOut') state.camera.zoom = Math.max(0.42, +(state.camera.zoom - 0.15).toFixed(2));
    if (button.dataset.mapaction === 'panLeft') state.camera.x += 72;
    if (button.dataset.mapaction === 'panRight') state.camera.x -= 72;
    if (button.dataset.mapaction === 'panUp') state.camera.y += 72;
    if (button.dataset.mapaction === 'panDown') state.camera.y -= 72;
    if (button.dataset.mapaction === 'reset') state.camera = { zoom: 0.78, x: 16, y: 16 };
    if (button.dataset.mapaction === 'focusSelected') focusCameraOn(state, selectedEntity(state));
    if (button.dataset.mapaction === 'focusEnemy') focusCameraOn(state, state.enemies[0] ?? state.downed[0]);
  })));

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
      const camera = game.camera ?? { zoom: 0.78, x: 16, y: 16 };
      const next = { ...camera };
      const delta = event.deltaY < 0 ? 0.1 : -0.1;
      next.zoom = Math.max(0.42, Math.min(1.9, +(next.zoom + delta).toFixed(2)));
      applyCamera(next);
      commit((state) => {
        state.camera ??= { zoom: 0.78, x: 16, y: 16 };
        const delta = event.deltaY < 0 ? 0.1 : -0.1;
        state.camera.zoom = Math.max(0.42, Math.min(1.9, +(state.camera.zoom + delta).toFixed(2)));
      });
    }, { passive: false });
    mapShell.addEventListener('pointerdown', (event) => {
      if (event.target.closest('.room, .actor, .map-controls')) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      try {
        mapShell.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic and some touch events can fail capture; map gestures still work without it.
      }
      draftCamera = { ...(game.camera ?? { zoom: 0.78, x: 16, y: 16 }) };
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = {
          distance: getDistance(a, b),
          center: getCenter(a, b),
          camera: { ...draftCamera }
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
        const nextZoom = Math.max(0.42, Math.min(1.9, +(pinch.camera.zoom * (distance / pinch.distance)).toFixed(3)));
        draftCamera.zoom = nextZoom;
        draftCamera.x = pinch.camera.x + (center.x - pinch.center.x);
        draftCamera.y = pinch.camera.y + (center.y - pinch.center.y);
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
