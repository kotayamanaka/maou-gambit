import { rooms } from '../data/rooms.js';
import { roomById } from '../data/rooms.js';
import { chips } from '../data/chips.js';
import { enemyChips } from '../data/enemyChips.js';
import { currentStage, startStage } from '../game/state.js';
import { consumeCaptured, finishUpgrade } from '../systems/progression.js';
import { allyCountInRoom, canPlaceAlly, roomCapacity } from '../systems/placement.js';
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

function unitCard(unit, game) {
  return `<button class="unit-card ${unit.uid === game.selectedUnitId ? 'on' : ''}" data-unit="${unit.uid}">
    <img src="${unit.sprite}" alt="${unit.name}" />
    <span><b>${unit.name}</b><small>LV${unit.level ?? 1} HP${unit.maxHp} ATK${unit.atk} INT${unit.int}</small><em>${unit.chips.map((id) => chips[id]?.icon ?? '□').join('')}</em></span>
  </button>`;
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
  const available = (game.chipBag[chipId] ?? 0) - used;
  const disabled = !inUnit && (available <= 0 || unit.chips.length >= unit.int);
  return `<button class="chip ${inUnit ? 'on' : ''}" data-chip="${chipId}" ${disabled ? 'disabled' : ''} title="${chip.description}">
    <b>${chip.icon}</b><span>${chip.name}</span><small>${inUnit ? '装備中' : `残${available}`}</small>
  </button>`;
}

function visibleChipIds(game, unit) {
  return Object.keys(chips).filter((id) => unit.chips.includes(id) || (game.chipBag[id] ?? 0) > 0);
}

function setupPanel(game) {
  const unit = selectedUnit(game);
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
      <span class="core">INT ${unit.int}</span><span>CRY ${unit.carry}</span><span>RNG ${unit.range}</span>
    </div>
    <div class="room-picker" aria-label="配置先">
      <div class="scroll-rail">${rooms.filter((room) => room.capacity > 0).map((room) =>
        roomChoice(room, unit, game)
      ).join('')}</div>
    </div>
    <div class="chips-box" aria-label="チップ">
      <div class="chip-meter">${unit.chips.length}/${unit.int}</div>
      <div class="chip-grid scroll-rail">${visibleChipIds(game, unit).map((id) => chipButton(id, unit, game)).join('')}</div>
    </div>
  </aside>`;
}

function battlePanel(game) {
  const entity = selectedEntity(game);
  const isAlly = entity?.type === 'ally';
  const isEnemy = entity?.type === 'enemy';
  return `<aside class="panel battle-panel">
    <header class="panel-head">
      <span>防衛中</span>
      <button data-action="speed">${game.speed === 0 ? '▶' : game.speed === 1 ? '×2' : 'Ⅱ'}</button>
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
    </div>
    ${entity ? `<div class="battle-detail">
      <div class="detail-title">
        <img src="${entity.sprite}" alt="${entity.name}" />
        <div><b>${entity.name}</b><small>${entity.room ? roomById[entity.room]?.name ?? entity.room : '戦場'}</small></div>
      </div>
      ${entity.maxHp ? `<div class="mini-stat">${entity.level ? `LV ${entity.level} / ` : ''}HP ${entity.hp}/${entity.maxHp}${entity.atk ? ` / ATK ${entity.atk}` : ''}${entity.int != null ? ` / INT ${entity.int}` : ''}</div>${hpBar(entity.hp, entity.maxHp)}` : ''}
      ${isAlly ? `<div class="battle-chips">${entity.chips.map((id) => `<span>${chips[id]?.icon ?? '□'} ${chips[id]?.name ?? id}</span>`).join('')}</div>` : ''}
      ${isEnemy ? `<div class="battle-chips">${entity.chips.map((id) => `<span>${enemyChips[id]?.icon ?? '□'} ${enemyChips[id]?.name ?? id}</span>`).join('')}</div>` : ''}
    </div>` : ''}
    <div class="log">${game.log.map((line) => `<p>${line}</p>`).join('')}</div>
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
    </div>
    <button class="primary wide" data-action="${result.won ? 'upgrade' : 'restart'}">${result.won ? '捕獲処理へ' : '再挑戦'}</button>
  </aside>`;
}

function upgradePanel(game) {
  const captured = game.captured[0];
  const target = selectedUnit(game);
  if (!captured) {
    return `<aside class="panel upgrade-panel">
      <header class="panel-head"><span>強化</span></header>
      <p class="empty">捕獲なし。報酬チップを受け取り、次へ進む。</p>
      <button class="primary wide" data-action="nextStage">次の防衛へ</button>
    </aside>`;
  }
  return `<aside class="panel upgrade-panel">
    <header class="panel-head"><span>捕獲処理</span></header>
    <div class="detail-card">
      <div class="detail-title"><img src="${captured.sprite}" alt="${captured.name}" /><div><b>${captured.name}</b><small>牢屋で拘束中</small></div></div>
    </div>
    <div class="unit-picker feed-targets" aria-label="養分対象">
      <div class="unit-list">${game.allies.map((ally) => unitCard(ally, game)).join('')}</div>
    </div>
    <div class="upgrade-actions">
      <button data-upgrade="convert" data-captured="${captured.uid}">🧠 眷属化</button>
      <button data-upgrade="feed" data-captured="${captured.uid}" data-target="${target.uid}">🩸 ${target.name} LV${target.level ?? 1}→${(target.level ?? 1) + 1}</button>
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
    if (unit.chips.includes(chipId)) unit.chips = unit.chips.filter((id) => id !== chipId);
    else if (unit.chips.length < unit.int) unit.chips.push(chipId);
  })));
  root.querySelectorAll('[data-upgrade]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    consumeCaptured(state, button.dataset.captured, button.dataset.upgrade, button.dataset.target);
  })));
  root.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    if (button.dataset.action === 'start') startStage(state);
    if (button.dataset.action === 'speed') state.speed = state.speed === 0 ? 1 : state.speed === 1 ? 2 : 0;
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
    state.camera ??= { zoom: 1, x: 0, y: 0 };
    if (button.dataset.mapaction === 'zoomIn') state.camera.zoom = Math.min(1.65, +(state.camera.zoom + 0.15).toFixed(2));
    if (button.dataset.mapaction === 'zoomOut') state.camera.zoom = Math.max(0.42, +(state.camera.zoom - 0.15).toFixed(2));
    if (button.dataset.mapaction === 'panLeft') state.camera.x += 72;
    if (button.dataset.mapaction === 'panRight') state.camera.x -= 72;
    if (button.dataset.mapaction === 'panUp') state.camera.y += 72;
    if (button.dataset.mapaction === 'panDown') state.camera.y -= 72;
    if (button.dataset.mapaction === 'reset') state.camera = { zoom: 0.78, x: 16, y: 16 };
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
