import { rooms } from '../data/rooms.js';
import { roomById } from '../data/rooms.js';
import { chips } from '../data/chips.js';
import { currentStage, startStage } from '../game/state.js';
import { consumeCaptured, finishUpgrade } from '../systems/progression.js';
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

function hpBar(current, max) {
  return `<span class="bar"><b style="width:${Math.max(0, Math.min(100, (current / max) * 100))}%"></b></span>`;
}

function unitCard(unit, game) {
  return `<button class="unit-card ${unit.uid === game.selectedUnitId ? 'on' : ''}" data-unit="${unit.uid}">
    <img src="${unit.sprite}" alt="${unit.name}" />
    <span><b>${unit.name}</b><small>HP${unit.maxHp} ATK${unit.atk} INT${unit.int}</small></span>
    <em>${unit.chips.map((id) => chips[id]?.icon ?? '□').join('')}</em>
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

function setupPanel(game) {
  const unit = selectedUnit(game);
  return `<aside class="panel setup-panel">
    <header class="panel-head">
      <span>編成</span>
      <button class="primary" data-action="start">▶ 侵入開始</button>
    </header>
    <div class="stage-pill">Stage ${currentStage(game).id} / 3 ${currentStage(game).name}</div>
    <div class="unit-list">${game.allies.map((ally) => unitCard(ally, game)).join('')}</div>
    <div class="detail-card">
      <div class="detail-title">
        <img src="${unit.sprite}" alt="${unit.name}" />
        <div><b>${unit.name}</b><small>${unit.traits.join(' / ') || '眷属'}</small></div>
      </div>
      <div class="stats">
        <span>HP ${unit.maxHp}</span><span>ATK ${unit.atk}</span><span>SPD ${unit.spd}</span>
        <span class="core">INT ${unit.int}</span><span>CARRY ${unit.carry}</span><span>RANGE ${unit.range}</span>
      </div>
    </div>
    <div class="room-picker">
      <b>配置</b>
      <div>${rooms.filter((room) => room.type !== 'spawn' && room.type !== 'throne').map((room) =>
        `<button class="mini ${unit.room === room.id ? 'on' : ''}" data-place="${room.id}">${room.name}</button>`
      ).join('')}</div>
    </div>
    <div class="chips-box">
      <b>チップ ${unit.chips.length}/${unit.int}</b>
      <div class="chip-grid">${Object.keys(chips).map((id) => chipButton(id, unit, game)).join('')}</div>
    </div>
  </aside>`;
}

function battlePanel(game) {
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
    <div class="upgrade-actions">
      <button data-upgrade="convert" data-captured="${captured.uid}">🧠 眷属化</button>
      <button data-upgrade="feed" data-captured="${captured.uid}" data-target="${target.uid}">🩸 ${target.name}の養分</button>
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
    <section class="topbar">
      <div><b>魔王のガンビット</b><span>INT=チップ数 / 捕獲運搬プロト</span></div>
      <div class="top-status"><span>Stage ${game.stageIndex + 1}/3</span><span>味方 ${game.allies.length}</span></div>
    </section>
    <section class="playfield">
      ${renderMap(game, phase)}
      ${panel}
    </section>
  </main>`;

  root.querySelectorAll('[data-unit]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    state.selectedUnitId = button.dataset.unit;
  })));
  root.querySelectorAll('[data-place]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    const unit = selectedUnit(state);
    unit.room = button.dataset.place;
    unit.x = roomById[unit.room].x;
    unit.y = roomById[unit.room].y;
    unit.movingTo = null;
  })));
  root.querySelectorAll('[data-room]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    state.selectedRoomId = button.dataset.room;
    const blocked = ['entrance', 'throne'];
    if (state.phase === 'setup' && !blocked.includes(button.dataset.room)) {
      const unit = selectedUnit(state);
      unit.room = button.dataset.room;
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
  root.querySelectorAll('[data-mapaction]').forEach((button) => button.addEventListener('click', () => commit((state) => {
    state.camera ??= { zoom: 1, x: 0, y: 0 };
    if (button.dataset.mapaction === 'zoomIn') state.camera.zoom = Math.min(1.65, +(state.camera.zoom + 0.15).toFixed(2));
    if (button.dataset.mapaction === 'zoomOut') state.camera.zoom = Math.max(0.85, +(state.camera.zoom - 0.15).toFixed(2));
    if (button.dataset.mapaction === 'panLeft') state.camera.x += 4;
    if (button.dataset.mapaction === 'panRight') state.camera.x -= 4;
    if (button.dataset.mapaction === 'panUp') state.camera.y += 4;
    if (button.dataset.mapaction === 'panDown') state.camera.y -= 4;
    if (button.dataset.mapaction === 'reset') state.camera = { zoom: 1, x: 0, y: 0 };
  })));

  const mapShell = root.querySelector('[data-map-shell]');
  if (mapShell) {
    let dragging = false;
    let last = null;
    mapShell.addEventListener('wheel', (event) => {
      event.preventDefault();
      commit((state) => {
        state.camera ??= { zoom: 1, x: 0, y: 0 };
        const delta = event.deltaY < 0 ? 0.1 : -0.1;
        state.camera.zoom = Math.max(0.85, Math.min(1.65, +(state.camera.zoom + delta).toFixed(2)));
      });
    }, { passive: false });
    mapShell.addEventListener('pointerdown', (event) => {
      if (event.target.closest('.room, .map-controls')) return;
      dragging = true;
      last = { x: event.clientX, y: event.clientY };
      mapShell.setPointerCapture(event.pointerId);
    });
    mapShell.addEventListener('pointermove', (event) => {
      if (!dragging || !last) return;
      const rect = mapShell.getBoundingClientRect();
      const dx = ((event.clientX - last.x) / rect.width) * 100;
      const dy = ((event.clientY - last.y) / rect.height) * 100;
      last = { x: event.clientX, y: event.clientY };
      commit((state) => {
        state.camera ??= { zoom: 1, x: 0, y: 0 };
        state.camera.x += dx;
        state.camera.y += dy;
      });
    });
    mapShell.addEventListener('pointerup', () => {
      dragging = false;
      last = null;
    });
  }
}
