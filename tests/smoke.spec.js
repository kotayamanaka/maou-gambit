import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { chips } from '../src/data/chips.js';
import { roomById, worldSize } from '../src/data/rooms.js';
import { spriteAnimations } from '../src/data/spriteAnimations.js';
import { allyTemplates, demonLord, enemyTemplates } from '../src/data/units.js';

async function assertNoDocumentScroll(page) {
  const metrics = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    sh: document.documentElement.scrollHeight,
    iw: window.innerWidth,
    ih: window.innerHeight
  }));
  expect(metrics.sw).toBeLessThanOrEqual(metrics.iw + 2);
  expect(metrics.sh).toBeLessThanOrEqual(metrics.ih + 2);
}

function pngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function expectSpriteEntry(entry, expected) {
  if (Array.isArray(entry)) expect(entry).toContain(expected.replace(/\.png$/, '-0.png'));
  else expect(entry).toBe(expected);
}

test('layout fits without page scroll', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('第一侵入隊').first()).toBeVisible();
  await expect(page.locator('.map-shell')).toBeVisible();
  await expect(page.locator('.unit-picker')).toBeVisible();
  await assertNoDocumentScroll(page);
});

test('map uses generated dungeon texture tiles and continuous corridors', async ({ page }) => {
  await page.goto('/');
  const mapBackground = await page.locator('.map-shell').evaluate((el) => getComputedStyle(el).backgroundImage);
  const roomBackground = await page.locator('.room').first().evaluate((el) => getComputedStyle(el).backgroundImage);
  const corridor = await page.locator('.corridor-path.floor').first().evaluate((el) => ({
    d: el.getAttribute('d'),
    stroke: getComputedStyle(el).stroke,
    strokeWidth: getComputedStyle(el).strokeWidth,
    lineCap: getComputedStyle(el).strokeLinecap,
    lineJoin: getComputedStyle(el).strokeLinejoin
  }));

  expect(mapBackground).toContain('floor-stone');
  expect(roomBackground).toContain('room-stone');
  expect(worldSize.width).toBeGreaterThanOrEqual(4600);
  expect(roomById.atrium.w).toBeGreaterThanOrEqual(700);
  expect(roomById.atrium.h).toBeGreaterThanOrEqual(500);
  expect(corridor.d).toContain('L');
  expect(corridor.stroke).not.toBe('none');
  expect(corridor.strokeWidth).not.toBe('0px');
  expect(corridor.lineCap).toBe('square');
  expect(corridor.lineJoin).toBe('miter');
  await assertNoDocumentScroll(page);
});

test('setup reveals only the selected menu section', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.setup-section')).toHaveCount(1);
  await expect(page.locator('[data-room="hallA"]')).toHaveCount(0);
  await expect(page.locator('[data-room="hallB"]')).toHaveCount(0);
  await expect(page.locator('[data-room="atrium"]')).toBeVisible();
  await expect(page.locator('[data-room="storage"]')).toBeVisible();
  await expect(page.locator('[data-room="jail"]')).toBeVisible();
  await expect(page.locator('[data-ui-panel="unit"]')).toContainText('配下');
  await expect(page.locator('[data-ui-panel="place"]')).toContainText('配置');
  await expect(page.locator('[data-ui-panel="chips"]')).toContainText('チップ');
  await expect(page.locator('[data-ui-panel="build"]')).toHaveCount(0);
  await expect(page.locator('[data-ui-panel="object"]')).toHaveCount(0);
  await expect(page.locator('[data-place="storage"]')).toHaveCount(0);
  await page.locator('[data-ui-panel="place"]').click();
  await expect(page.locator('[data-place="storage"]')).toBeVisible();
  await expect(page.locator('[data-place="hallA"]')).toHaveCount(0);
  await expect(page.locator('[data-place="hallB"]')).toHaveCount(0);
  await expect(page.locator('[data-chip="attack"]')).toHaveCount(0);
  await page.locator('[data-ui-panel="chips"]').click();
  await expect(page.locator('[data-chip="attack"]')).toBeVisible();
  await expect(page.locator('[data-place="storage"]')).toHaveCount(0);
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      game.stageIndex = 1;
    });
  });
  await expect(page.locator('[data-ui-panel="build"]')).toBeVisible();
  await expect(page.locator('[data-ui-panel="object"]')).toBeVisible();
  await assertNoDocumentScroll(page);
});

test('setup supports drag placement and chip assignment', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const unit = document.querySelector('[data-unit]');
    const room = document.querySelector('[data-room="storage"]');
    const data = new DataTransfer();
    unit.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: data }));
    room.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: data }));
    room.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data }));
  });
  expect(await page.evaluate(() => window.__MAOU_GAME__.allies[0].room)).toBe('storage');

  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      const unit = game.allies[0];
      unit.chips = [];
      game.selectedUnitId = unit.uid;
      game.selectedEntity = { type: 'ally', id: unit.uid };
      game.uiPanel = 'chips';
    });
  });
  await page.evaluate(() => {
    const chip = document.querySelector('[data-chip="attack"]');
    const unit = document.querySelector('[data-drop-unit]');
    const data = new DataTransfer();
    chip.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: data }));
    unit.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: data }));
    unit.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data }));
  });
  expect(await page.evaluate(() => window.__MAOU_GAME__.allies[0].chips)).toContain('attack');

  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      game.gold = 1000;
      game.uiPanel = 'build';
      game.selectedBuildFrom = 'atrium';
    });
  });
  await page.evaluate(() => {
    const room = document.querySelector('[data-build-room="treasure"]');
    const slot = document.querySelector('[data-build-slot="north"]');
    const data = new DataTransfer();
    room.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: data }));
    slot.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: data }));
    slot.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data }));
  });
  expect(await page.evaluate(() => window.__MAOU_GAME__.builtRooms.has('treasure'))).toBe(true);

  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      game.uiPanel = 'object';
      game.selectedRoomId = 'treasure';
    });
  });
  await page.evaluate(() => {
    const object = document.querySelector('[data-install-object="savePoint"]');
    const room = document.querySelector('[data-room="treasure"]');
    const data = new DataTransfer();
    object.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: data }));
    room.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: data }));
    room.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data }));
  });
  expect(await page.evaluate(() => window.__MAOU_GAME__.roomObjects.treasure)).toBe('savePoint');
  await assertNoDocumentScroll(page);
});

test('corridors use orthogonal door segments and build slots', async ({ page }) => {
  await page.goto('/');
  const segments = await page.locator('.corridor-path.floor').evaluateAll((items) => items.map((el) => ({
    d: el.getAttribute('d'),
    lineCap: getComputedStyle(el).strokeLinecap,
    lineJoin: getComputedStyle(el).strokeLinejoin
  })));
  expect(segments.length).toBeGreaterThan(0);
  expect(segments.every((item) => item.d.includes('L'))).toBe(true);
  expect(segments.every((item) => item.lineCap === 'square')).toBe(true);
  expect(segments.every((item) => item.lineJoin === 'miter')).toBe(true);

  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      game.stageIndex = 1;
      game.uiPanel = 'build';
      game.selectedBuildRoom = 'treasure';
      game.selectedBuildDoor = 'east';
      game.selectedBuildSlot = 'north';
    });
  });
  await expect(page.locator('.build-slot[data-build-slot="north"]')).toBeVisible();
  await expect(page.locator('.build-slot[data-build-slot="north"]')).toContainText('北');
  await expect(page.locator('.build-slot')).toHaveCount(15);
  await expect(page.locator('.build-slot[data-build-slot="center-low"]')).toBeDisabled();
  await expect(page.locator('.build-slot[data-build-slot="center-low"]')).toContainText('重複');
  await expect(page.locator('[data-build-preview-room="treasure"]')).toBeVisible();
  await expect(page.locator('[data-build-preview-room="treasure"]')).toContainText('宝物庫');
  await expect(page.locator('.corridor-path.build-preview.floor')).toHaveCount(1);
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      game.selectedBuildSlot = 'center-low';
    });
  });
  await expect(page.locator('[data-build-preview-room="treasure"]')).toHaveClass(/blocked/);
  await expect(page.locator('[data-build-preview-room="treasure"]')).toContainText('重複');
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      game.selectedBuildRoom = 'hallA';
      game.selectedBuildSlot = 'north';
      game.selectedBuildDoor = 'west';
      game.customBuildSlot = null;
      game.gold = 1000;
      game.camera = { zoom: 1, x: -1250, y: 0 };
    });
  });
  await page.locator('[data-map-shell]').click({ position: { x: 200, y: 100 } });
  await expect(page.locator('.build-slot')).toHaveCount(16);
  await expect(page.locator('.build-slot.custom-slot')).toContainText('自由');
  await expect(page.locator('[data-build-preview-room="hallA"]')).toBeVisible();
  await expect(page.locator('[data-build-preview-room="hallA"]')).not.toHaveClass(/blocked/);
  const { customSlot, selectedBuildSlot } = await page.evaluate(() => ({
    customSlot: window.__MAOU_GAME__.customBuildSlot,
    selectedBuildSlot: window.__MAOU_GAME__.selectedBuildSlot
  }));
  expect(customSlot).toMatchObject({ label: '自由', custom: true, x: 1440, y: 360 });
  expect(customSlot.id).toBe(selectedBuildSlot);
  await page.locator('[data-build-room="hallA"]').click();
  const customBuild = await page.evaluate(() => ({
    built: window.__MAOU_GAME__.builtRooms.has('hallA'),
    position: window.__MAOU_GAME__.roomPositions.hallA
  }));
  expect(customBuild.built).toBe(true);
  expect(customBuild.position).toMatchObject({ x: 1440, y: 360, slotId: customSlot.id });
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      game.builtRooms.delete('hallA');
      delete game.roomPositions.hallA;
      game.roomConnections.hallA = [];
      game.roomConnections.atrium = (game.roomConnections.atrium ?? []).filter((id) => id !== 'hallA');
      game.roomConnectionDoors = {};
      game.selectedBuildRoom = 'hallA';
      game.selectedBuildDoor = 'west';
      game.customBuildSlot = null;
      game.selectedBuildSlot = 'north';
      game.gold = 1000;
      game.camera = { zoom: 1, x: -1250, y: 0 };
    });
  });
  await page.evaluate(() => {
    const map = document.querySelector('[data-map-shell]');
    const data = new DataTransfer();
    window.__MAOU_DRAG_PAYLOAD__ = { kind: 'buildRoom', id: 'hallA' };
    map.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: data, clientX: 200, clientY: 100 }));
  });
  await expect(page.locator('.build-slot.custom-slot')).toContainText('自由');
  await expect(page.locator('[data-build-preview-room="hallA"]')).toBeVisible();
  const dragPreview = await page.evaluate(() => ({
    customSlot: window.__MAOU_GAME__.customBuildSlot,
    selectedBuildRoom: window.__MAOU_GAME__.selectedBuildRoom
  }));
  expect(dragPreview.customSlot).toMatchObject({ label: '自由', custom: true, x: 1440, y: 360 });
  expect(dragPreview.selectedBuildRoom).toBe('hallA');
  await page.evaluate(() => {
    const map = document.querySelector('[data-map-shell]');
    const data = new DataTransfer();
    window.__MAOU_DRAG_PAYLOAD__ = { kind: 'buildRoom', id: 'hallA' };
    map.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data, clientX: 200, clientY: 100 }));
  });
  const dragBuild = await page.evaluate(() => ({
    built: window.__MAOU_GAME__.builtRooms.has('hallA'),
    position: window.__MAOU_GAME__.roomPositions.hallA,
    mapReady: document.querySelector('.map-shell').classList.contains('drop-ready')
  }));
  expect(dragBuild.built).toBe(true);
  expect(dragBuild.position).toMatchObject({ x: 1440, y: 360, slotId: dragPreview.customSlot.id });
  expect(dragBuild.mapReady).toBe(false);
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      game.builtRooms.delete('hallA');
      delete game.roomPositions.hallA;
      game.roomConnections.hallA = [];
      game.roomConnections.atrium = (game.roomConnections.atrium ?? []).filter((id) => id !== 'hallA');
      game.roomConnectionDoors = {};
      game.selectedBuildRoom = 'hallA';
      game.selectedBuildDoor = 'west';
      game.customBuildSlot = null;
      game.selectedBuildSlot = 'north';
      game.gold = 1000;
      game.camera = { zoom: 1, x: -1250, y: 0 };
    });
  });
  await page.evaluate(() => {
    const map = document.querySelector('[data-map-shell]');
    const rect = map.getBoundingClientRect();
    const data = new DataTransfer();
    window.__MAOU_DRAG_PAYLOAD__ = { kind: 'buildRoom', id: 'hallA' };
    map.dispatchEvent(new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
      dataTransfer: data,
      clientX: rect.right - 8,
      clientY: rect.top + rect.height / 2
    }));
  });
  const edgeDrag = await page.evaluate(() => ({
    camera: window.__MAOU_GAME__.camera,
    customSlot: window.__MAOU_GAME__.customBuildSlot
  }));
  expect(edgeDrag.camera.x).toBeLessThan(-1250);
  expect(edgeDrag.customSlot).toMatchObject({ label: '自由', custom: true });
  expect(edgeDrag.customSlot.x).toBeGreaterThan(1440);
  const previewClearance = await page.evaluate(() => {
    const preview = document.querySelector('[data-build-preview-room="hallA"]')?.getBoundingClientRect();
    const panel = document.querySelector('.panel')?.getBoundingClientRect();
    if (!preview || !panel || window.innerWidth <= 720) return { checked: false, clear: true };
    const verticalOverlap = preview.bottom > panel.top && preview.top < panel.bottom;
    return { checked: true, clear: !verticalOverlap || preview.right < panel.left - 8 };
  });
  expect(previewClearance.clear).toBe(true);
  await assertNoDocumentScroll(page);
});

test('setup supports monster selection, placement, and chip editing', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.unit-picker')).toBeVisible();
  await expect(page.locator('[data-unit]')).toHaveCount(1);
  await page.locator('.actor.ally').first().click();
  await page.locator('[data-ui-panel="place"]').click();
  await page.locator('[data-place="storage"]').click();
  await page.locator('[data-ui-panel="chips"]').click();
  await page.locator('[data-chip="carryDowned"]').click();
  const state = await page.evaluate(() => {
    const unit = window.__MAOU_GAME__.allies.find((ally) => ally.uid === window.__MAOU_GAME__.selectedUnitId);
    return {
      room: unit.room,
      homeRoom: unit.homeRoom,
      chips: unit.chips,
      visibleChips: [...document.querySelectorAll('[data-chip]')].map((el) => el.dataset.chip),
      lockedChips: [...document.querySelectorAll('[data-chip][data-locked="1"]')].map((el) => el.dataset.chip)
    };
  });
  expect(state.room).toBe('storage');
  expect(state.homeRoom).toBe('storage');
  expect(state.chips).not.toContain('carryDowned');
  expect(state.visibleChips).toContain('chaseNearest');
  expect(state.visibleChips).toContain('returnHome');
  expect(state.lockedChips).toContain('returnHome');
  expect(state.lockedChips).toContain('focusMage');
  await assertNoDocumentScroll(page);
});

test('setup enforces room capacity', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      const base = game.allies[0];
      game.allies.push({
        ...base,
        uid: 'test-second-ally',
        name: 'テスト配下',
        room: 'hallA',
        homeRoom: 'hallA',
        x: 390,
        y: 210,
        chips: ['attack'],
        carrying: null,
        movingTo: null,
        status: []
      });
    });
  });
  await page.locator('[data-unit]').nth(0).click();
  await page.locator('[data-ui-panel="place"]').click();
  await page.locator('[data-place="storage"]').click();
  await page.locator('[data-unit]').nth(1).click();
  await expect(page.locator('[data-place="storage"]')).toBeDisabled();
  const rooms = await page.evaluate(() => window.__MAOU_GAME__.allies.map((ally) => ({ name: ally.name, room: ally.room })));
  expect(rooms.find((ally) => ally.name === 'ゴブリン').room).toBe('storage');
  expect(rooms.find((ally) => ally.name === 'テスト配下').room).not.toBe('storage');
  await assertNoDocumentScroll(page);
});

test('setup shows advice, chip detail, next enemies, and unlock history', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/チップ枠余り|前線が空き|編成チェックOK/)).toBeVisible();
  await page.locator('[data-ui-panel="chips"]').click();
  await page.locator('[data-chip="focusMage"]').click();
  await expect(page.getByText('攻撃対象系 / 未発見')).toBeVisible();
  await expect(page.getByText('????').first()).toBeVisible();
  await expect(page.getByText('未発見').first()).toBeVisible();
  await page.locator('[data-ui-panel="info"]').click();
  await expect(page.getByText('次の敵情報')).toBeVisible();
  await expect(page.getByText(/戦士x1/)).toBeVisible();
  await expect(page.getByText(/戦士 捕獲1 残12s .*眷属 堕ちた戦士 .*養分 体力\+4 攻撃\+1/)).toBeVisible();
  await expect(page.getByText(/盗賊 捕獲2 残10s .*落 G20 斥候の靴 .*眷属 影走り/)).toBeVisible();
  await expect(page.getByText('図鑑', { exact: true })).toBeVisible();
  await expect(page.getByText('チップ解放履歴')).toBeVisible();
  await assertNoDocumentScroll(page);
});

test('setup scout panel exposes high-value intelligence capture targets', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      game.stageIndex = 11;
      game.uiPanel = 'info';
    });
  });
  const scout = page.locator('.next-enemies');
  await expect(scout.getByText('12/20 賢者の下見')).toBeVisible();
  await expect(scout.getByText(/賢者 捕獲5 残7s .*落 G55 賢者のインク 魔素の粉 .*眷属 影託者 .*養分 攻撃\+1 知識\+6/)).toBeVisible();
  await assertNoDocumentScroll(page);
});

test('setup keeps monster selector visible on a short phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 700 });
  await page.goto('/');
  const box = await page.locator('.unit-picker').boundingBox();
  expect(box).toBeTruthy();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(700);
  await expect(page.locator('[data-unit]').first()).toBeVisible();
  await assertNoDocumentScroll(page);
});

test('goblin uses generated directional action sprites', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      const goblin = game.allies.find((ally) => ally.templateId === 'goblin');
      goblin.movingTo = 'hallA';
      goblin.facing = 'left';
      goblin.anim = 'walk';
      goblin.animTtl = 0;
      game.selectedEntity = { type: 'ally', id: goblin.uid };
    });
  });
  await expect(page.locator('.actor.ally.selected img')).toHaveAttribute('src', /goblin\/walk-left-[0-2]\.png/);

  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      const goblin = game.allies.find((ally) => ally.templateId === 'goblin');
      goblin.movingTo = null;
      goblin.facing = 'front';
      goblin.anim = 'attack';
      goblin.animTtl = 0.3;
      game.selectedEntity = { type: 'ally', id: goblin.uid };
    });
  });
  await expect(page.locator('.actor.ally.selected img')).toHaveAttribute('src', /goblin\/attack-front-[0-1]\.png/);
  await assertNoDocumentScroll(page);
});

test('slime variants use generated directional action sprites', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      game.phase = 'upgrade';
      game.gold = 300;
      game.captured = [];
      game.collections.allies = new Set([
        'goblin',
        'poisonSlime',
        'darkSlime',
        'bat',
        'fallenWarrior',
        'shadeRunner',
        'darkMage',
        'boneGuard',
        'goblinChief',
        'plagueSlime',
        'impArcher',
        'oracleShade'
      ]);
    });
  });
  await page.locator('[data-ui-panel="research"]').click();
  await page.locator('[data-research-monster]').click();
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      const slime = game.allies.find((ally) => ally.templateId === 'slime');
      slime.movingTo = 'hallA';
      slime.facing = 'right';
      slime.anim = 'walk';
      slime.animTtl = 0;
      game.selectedEntity = { type: 'ally', id: slime.uid };
    });
  });
  await expect(page.locator('.actor.ally.selected img')).toHaveAttribute('src', /slime\/walk-right-[0-2]\.png/);

  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      const slime = game.allies.find((ally) => ally.templateId === 'slime');
      slime.movingTo = null;
      slime.facing = 'front';
      slime.anim = 'attack';
      slime.animTtl = 0.3;
      game.selectedEntity = { type: 'ally', id: slime.uid };
    });
  });
  await expect(page.locator('.actor.ally.selected img')).toHaveAttribute('src', /slime\/attack-front-[0-1]\.png/);
  await assertNoDocumentScroll(page);
});

test('micro animation sprite frames are generated and connected for sprite folders', () => {
  const animatedFolders = Object.keys(spriteAnimations).sort();
  const spriteRoot = path.join(process.cwd(), 'public', 'assets', 'sprites');
  const foldersWithFrames = fs.readdirSync(spriteRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((id) => ['walk', 'attack'].every((action) => ['front', 'back', 'left', 'right'].every((direction) => (
      fs.existsSync(path.join(spriteRoot, id, `${action}-${direction}-0.png`))
      && fs.existsSync(path.join(spriteRoot, id, `${action}-${direction}-1.png`))
    ))))
    .sort();
  expect(animatedFolders).toEqual(foldersWithFrames);
  for (const required of ['goblin', 'slime', 'warrior', 'rogue', 'mage', 'guard']) {
    expect(animatedFolders).toContain(required);
  }

  for (const id of animatedFolders) {
    const animation = spriteAnimations[id];
    expect(Array.isArray(animation.walk.front), `${id} walk front`).toBe(true);
    expect(Array.isArray(animation.attack.front), `${id} attack front`).toBe(true);
    expect(animation.walk.front.length).toBeGreaterThanOrEqual(2);
    expect(animation.walk.front.length).toBeLessThanOrEqual(4);
    expect(animation.attack.front.length).toBeGreaterThanOrEqual(2);
    expect(animation.attack.front.length).toBeLessThanOrEqual(4);
    for (const direction of ['front', 'back', 'left', 'right']) {
      for (const pathName of [...animation.walk[direction], ...animation.attack[direction]]) {
        const file = path.join(process.cwd(), 'public', pathName);
        expect(fs.existsSync(file), `${id}/${pathName}`).toBe(true);
        const size = pngSize(file);
        expect(size.width).toBeGreaterThan(8);
        expect(size.height).toBeGreaterThan(8);
      }
    }
  }

  for (const [id, template] of Object.entries({ ...allyTemplates, ...enemyTemplates, demonLord })) {
    const spritePath = template.spriteSet?.idle?.front ?? '';
    const folder = spritePath.split('/').at(-2);
    if (!spriteAnimations[folder]) continue;
    expect(Array.isArray(template.spriteSet.walk.front), `${id} uses animated ${folder} walk`).toBe(true);
    expect(Array.isArray(template.spriteSet.attack.front), `${id} uses animated ${folder} attack`).toBe(true);
    expect(template.spriteSet.idle.front).toBe(`assets/sprites/${folder}/idle-front.png`);
  }
});

test('walk and attack sprites advance animation frames in render state', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      game.phase = 'battle';
      game.speed = 0;
      game.elapsed = 0;
      const goblin = game.allies.find((ally) => ally.templateId === 'goblin');
      goblin.movingTo = 'hallA';
      goblin.facing = 'right';
      goblin.anim = 'walk';
      goblin.animTtl = 0;
      game.selectedEntity = { type: 'ally', id: goblin.uid };
    });
  });

  const walkFrames = [];
  for (let i = 0; i < 5; i += 1) {
    await page.evaluate(() => {
      window.__MAOU_COMMIT__((game) => {
        game.elapsed += 0.18;
      });
    });
    walkFrames.push(await page.locator('.actor.ally.selected').getAttribute('data-sprite-frame'));
  }
  expect(new Set(walkFrames).size).toBeGreaterThan(1);
  await expect(page.locator('.actor.ally.selected img')).toHaveAttribute('src', /goblin\/walk-right-[0-2]\.png/);

  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      const goblin = game.allies.find((ally) => ally.templateId === 'goblin');
      goblin.movingTo = null;
      goblin.facing = 'front';
      goblin.anim = 'attack';
      goblin.animTtl = 0.3;
      game.selectedEntity = { type: 'ally', id: goblin.uid };
    });
  });
  expect(await page.locator('.actor.ally.selected').getAttribute('data-sprite-frame')).toBe('0');
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      const goblin = game.allies.find((ally) => ally.templateId === 'goblin');
      goblin.animTtl = 0.08;
    });
  });
  expect(await page.locator('.actor.ally.selected').getAttribute('data-sprite-frame')).toBe('1');
  await expect(page.locator('.actor.ally.selected img')).toHaveAttribute('src', /goblin\/attack-front-1\.png/);
  await assertNoDocumentScroll(page);
});

test('early enemy templates use generated directional action sprites', () => {
  for (const [id, sample] of [
    ['warrior', 'attack-left'],
    ['rogue', 'walk-right'],
    ['mage', 'downed-back'],
    ['guard', 'idle-front'],
    ['ranger', 'attack-right'],
    ['cleric', 'walk-left'],
    ['knight', 'attack-front'],
    ['alchemist', 'idle-right'],
    ['beastTamer', 'walk-front'],
    ['paladin', 'downed-left'],
    ['sage', 'attack-back'],
    ['hero', 'walk-right']
  ]) {
    const [pose, facing] = sample.split('-');
    expect(enemyTemplates[id].sprite).toBe(`assets/sprites/${id}/idle-front.png`);
    expectSpriteEntry(enemyTemplates[id].spriteSet[pose][facing], `assets/sprites/${id}/${sample}.png`);
    expect(enemyTemplates[id].spriteSet.idle.front).toBe(`assets/sprites/${id}/idle-front.png`);
  }
});

test('enemy sprite folders contain four directions for each job', () => {
  const required = [
    'idle-front.png', 'idle-back.png', 'idle-left.png', 'idle-right.png',
    'walk-front.png', 'walk-back.png', 'walk-left.png', 'walk-right.png',
    'attack-front.png', 'attack-back.png', 'attack-left.png', 'attack-right.png',
    'downed.png', 'downed-back.png', 'downed-left.png', 'downed-right.png'
  ];
  for (const id of Object.keys(enemyTemplates)) {
    for (const name of required) {
      const file = path.join(process.cwd(), 'public', 'assets', 'sprites', id, name);
      expect(fs.existsSync(file), `${id}/${name}`).toBe(true);
      const size = pngSize(file);
      expect(size.width).toBeGreaterThan(8);
      expect(size.height).toBeGreaterThan(8);
    }
  }
});

test('converted ally templates use generated directional action sprites', () => {
  for (const [id, sample] of [
    ['bat', 'attack-left'],
    ['fallenWarrior', 'walk-front'],
    ['shadeRunner', 'attack-right'],
    ['darkMage', 'downed-back'],
    ['boneGuard', 'attack-front'],
    ['impArcher', 'walk-left'],
    ['oracleShade', 'attack-right']
  ]) {
    const [pose, facing] = sample.split('-');
    expect(allyTemplates[id].sprite).toBe(`assets/sprites/${id}/idle-front.png`);
    expectSpriteEntry(allyTemplates[id].spriteSet[pose][facing], `assets/sprites/${id}/${sample}.png`);
    expect(allyTemplates[id].spriteSet.idle.front).toBe(`assets/sprites/${id}/idle-front.png`);
  }
});

test('generated ally sprite folders contain four directions for each action', () => {
  const required = [
    'idle-front.png', 'idle-back.png', 'idle-left.png', 'idle-right.png',
    'walk-front.png', 'walk-back.png', 'walk-left.png', 'walk-right.png',
    'attack-front.png', 'attack-back.png', 'attack-left.png', 'attack-right.png',
    'downed.png', 'downed-back.png', 'downed-left.png', 'downed-right.png'
  ];
  for (const unitId of ['bat', 'fallenWarrior', 'shadeRunner', 'darkMage', 'boneGuard', 'impArcher', 'oracleShade']) {
    const dir = path.resolve('public', 'assets', 'sprites', unitId);
    const files = fs.readdirSync(dir).filter((name) => name.endsWith('.png'));
    for (const name of required) expect(files).toContain(name);
    const source = pngSize(path.resolve('assets', 'generated', 'characters', unitId, 'sheet-v1-4dir.png'));
    expect(source.width).toBeGreaterThan(900);
    expect(source.height).toBeGreaterThan(900);
  }
});

test('stage runs and reaches result screen', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-action="start"]').click();
  await expect(page.getByText('防衛中')).toBeVisible();
  const speed4 = page.locator('.battle-speedbar [data-set-speed="4"]');
  const speed1 = page.locator('.battle-speedbar [data-set-speed="1"]');
  const speed2 = page.locator('.battle-speedbar [data-set-speed="2"]');
  await expect(page.locator('.battle-speedbar')).toBeVisible();
  await expect(speed4).toBeVisible();
  const speedTargets = await page.evaluate(() => [...document.querySelectorAll('.battle-speedbar [data-set-speed], .battle-speedbar [data-speed-pause]')].map((button) => {
    const rect = button.getBoundingClientRect();
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return { width: rect.width, height: rect.height, topIsSelf: top === button };
  }));
  expect(speedTargets.every((target) => target.width >= 44 && target.height >= 44 && target.topIsSelf)).toBe(true);
  await speed4.click();
  await expect(speed4).toHaveClass(/on/);
  expect(await page.evaluate(() => window.__MAOU_GAME__.speed)).toBe(4);
  await speed1.click();
  await expect(speed1).toHaveClass(/on/);
  expect(await page.evaluate(() => window.__MAOU_GAME__.speed)).toBe(1);
  await speed2.click();
  await expect(speed2).toHaveClass(/on/);
  expect(await page.evaluate(() => window.__MAOU_GAME__.speed)).toBe(2);
  await page.evaluate(() => { window.__MAOU_GAME__.speed = 10; });
  await expect(page.getByText(/探索中|発見済/)).toBeVisible();
  await expect(page.getByText(/撃退成功|魔王敗北/)).toBeVisible({ timeout: 55000 });
  await assertNoDocumentScroll(page);
});

test('battle speed controls remain selectable on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.locator('[data-action="start"]').click();

  const speedbar = page.locator('.battle-speedbar');
  await expect(speedbar).toBeVisible();
  const targets = await page.evaluate(() => [...document.querySelectorAll('.battle-speedbar [data-set-speed], .battle-speedbar [data-speed-pause]')].map((button) => {
    const rect = button.getBoundingClientRect();
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return {
      action: button.dataset.setSpeed ?? 'pause',
      width: rect.width,
      height: rect.height,
      topIsSelf: top === button
    };
  }));
  expect(targets).toHaveLength(4);
  expect(targets.every((target) => target.width >= 44 && target.height >= 44 && target.topIsSelf)).toBe(true);

  await page.locator('.battle-speedbar [data-set-speed="4"]').click();
  expect(await page.evaluate(() => window.__MAOU_GAME__.speed)).toBe(4);
  await page.locator('.battle-speedbar [data-speed-pause]').click();
  expect(await page.evaluate(() => window.__MAOU_GAME__.speed)).toBe(0);
  await page.locator('.battle-speedbar [data-set-speed="2"]').click();
  await expect(page.locator('.battle-speedbar [data-set-speed="2"]')).toHaveClass(/on/);
  expect(await page.evaluate(() => window.__MAOU_GAME__.speed)).toBe(2);
  await assertNoDocumentScroll(page);
});

test('targeting chips do not sense enemies in other rooms', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const game = window.__MAOU_GAME__;
    game.chipBag.focusMage = 1;
    const goblin = game.allies.find((ally) => ally.name === 'ゴブリン');
    goblin.chips = ['focusMage'];
  });
  await page.locator('[data-action="start"]').click();
  await page.locator('[data-set-speed="2"]').click();
  await page.evaluate(() => { window.__MAOU_GAME__.speed = 10; });
  await page.waitForFunction(() => window.__MAOU_GAME__?.elapsed > 12);
  const snapshot = await page.evaluate(() => ({
    lordHp: window.__MAOU_GAME__.demonLord.hp,
    maxLordHp: window.__MAOU_GAME__.demonLord.maxHp,
    throneEnemies: window.__MAOU_GAME__.enemies.filter((enemy) => enemy.room === 'throne').length,
    allies: window.__MAOU_GAME__.allies.map((ally) => ({ name: ally.name, room: ally.room, chips: ally.chips, carrying: ally.carrying }))
  }));
  expect(snapshot.lordHp).toBe(snapshot.maxLordHp);
  expect(snapshot.throneEnemies).toBe(0);
  expect(['atrium', 'jail']).toContain(snapshot.allies.find((ally) => ally.name === 'ゴブリン').room);
  expect(snapshot.allies.find((ally) => ally.name === 'ゴブリン').chips).toContain('focusMage');
  await assertNoDocumentScroll(page);
});

test('enemies use behavior chips to fight same-room monsters', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-action="start"]').click();
  await page.locator('[data-set-speed="2"]').click();
  await page.evaluate(() => { window.__MAOU_GAME__.speed = 10; });
  await page.waitForFunction(() => {
    const game = window.__MAOU_GAME__;
    const goblin = game?.allies.find((ally) => ally.name === 'ゴブリン');
    return game?.enemies.some((enemy) => enemy.chips?.includes('engageGuard')) && goblin && goblin.hp < goblin.maxHp;
  }, { timeout: 55000 });
  const snapshot = await page.evaluate(() => {
    const goblin = window.__MAOU_GAME__.allies.find((ally) => ally.name === 'ゴブリン');
    const enemy = window.__MAOU_GAME__.enemies.find((item) => item.chips?.includes('engageGuard'));
    return { goblinHp: goblin.hp, goblinMax: goblin.maxHp, enemyChips: enemy.chips };
  });
  expect(snapshot.goblinHp).toBeLessThan(snapshot.goblinMax);
  expect(snapshot.enemyChips).toContain('engageGuard');
  await assertNoDocumentScroll(page);
});

test('melee units must close distance inside the same room before attacking', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      const goblin = game.allies.find((ally) => ally.name === 'ゴブリン');
      Object.assign(goblin, {
        room: 'atrium',
        homeRoom: 'atrium',
        x: 1900,
        y: 1155,
        range: 1,
        chips: ['attack'],
        attackClock: 0,
        movingTo: null
      });
      game.allies = [goblin];
      game.selectedUnitId = goblin.uid;
      game.selectedEntity = { type: 'ally', id: goblin.uid };
      game.phase = 'battle';
      game.speed = 1;
      game.waveQueue = [];
      game.enemies = [{
        uid: 'melee-range-test',
        templateId: 'warrior',
        name: '戦士',
        type: 'enemy',
        sprite: 'assets/sprites/warrior.png',
        maxHp: 34,
        hp: 34,
        atk: 5,
        spd: 0.72,
        range: 1,
        chips: [],
        convertTo: 'fallenWarrior',
        room: 'atrium',
        x: 2150,
        y: 1155,
        movingTo: null,
        moveClock: 0,
        attackClock: 0,
        searchClock: 999,
        knowsThrone: false
      }];
    });
  });
  await page.waitForFunction(() => {
    const game = window.__MAOU_GAME__;
    const goblin = game.allies.find((ally) => ally.name === 'ゴブリン');
    const enemy = game.enemies.find((item) => item.uid === 'melee-range-test');
    return goblin.x > 1940 && enemy.hp === enemy.maxHp;
  }, null, { timeout: 1600 });
  await page.waitForFunction(() => {
    const enemy = window.__MAOU_GAME__.enemies.find((item) => item.uid === 'melee-range-test');
    return enemy && enemy.hp < enemy.maxHp;
  }, null, { timeout: 6500 });
  await assertNoDocumentScroll(page);
});

test('ranged attacks show projectile effects', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      const goblin = game.allies.find((ally) => ally.name === 'ゴブリン');
      Object.assign(goblin, {
        room: 'atrium',
        homeRoom: 'atrium',
        x: 1980,
        y: 1155,
        range: 3,
        chips: ['attack'],
        attackClock: 0,
        movingTo: null
      });
      game.phase = 'battle';
      game.speed = 1;
      game.waveQueue = [];
      game.enemies = [{
        uid: 'projectile-test',
        templateId: 'mage',
        name: '魔法使い',
        type: 'enemy',
        sprite: 'assets/sprites/mage.png',
        maxHp: 80,
        hp: 80,
        atk: 4,
        spd: 0.62,
        range: 3,
        chips: [],
        convertTo: 'darkMage',
        room: 'atrium',
        x: 2110,
        y: 1155,
        movingTo: null,
        moveClock: 0,
        attackClock: 0,
        searchClock: 999,
        knowsThrone: false
      }];
    });
  });
  await page.waitForFunction(() => window.__MAOU_GAME__.effects.some((effect) => String(effect.type).includes('projectile')), null, { timeout: 2500 });
  await expect(page.locator('.fx.projectile')).toBeVisible();
  await expect(page.locator('.fx.projectile.arrow')).toBeVisible();
  await expect(page.locator('.actor.ally img').first()).toHaveAttribute('src', /goblin\/idle-right\.png/);
  await assertNoDocumentScroll(page);
});

test('ranged attack poses keep projectiles out of the body sprite', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      game.phase = 'battle';
      game.speed = 0;
      const goblin = game.allies.find((ally) => ally.name === 'ゴブリン');
      Object.assign(goblin, {
        range: 3,
        anim: 'attack',
        animTtl: 0.3,
        facing: 'right',
        movingTo: null
      });
      game.selectedEntity = { type: 'ally', id: goblin.uid };
    });
  });
  const selected = page.locator('.actor.ally.selected');
  await expect(selected).toHaveClass(/anim-attack/);
  await expect(selected).toHaveAttribute('data-sprite-frame-count', '1');
  await expect(selected.locator('img')).toHaveAttribute('src', /goblin\/idle-right\.png/);
  await assertNoDocumentScroll(page);
});

test('carrier returns to assigned room after jail delivery', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      const goblin = game.allies.find((ally) => ally.name === 'ゴブリン');
      Object.assign(goblin, {
        room: 'atrium',
        homeRoom: 'atrium',
        x: 560,
        y: 265,
        chips: ['carryDowned', 'attack'],
        carrying: null,
        movingTo: null
      });
      game.phase = 'battle';
      game.speed = 8;
      game.waveQueue = [];
      game.enemies = [];
      game.downed = [{
        uid: 'downed-carrier-test',
        templateId: 'warrior',
        name: '戦士',
        sprite: 'assets/sprites/warrior.png',
        convertTo: 'fallenWarrior',
        room: 'atrium',
        x: 660,
        y: 265,
        ttl: 20,
        carriedBy: null
      }];
      game.captured = [];
    });
  });
  await page.waitForFunction(() => {
    const game = window.__MAOU_GAME__;
    const goblin = game?.allies.find((ally) => ally.name === 'ゴブリン');
    return game?.captured.length > 0 && goblin?.room === goblin?.homeRoom && !goblin?.carrying;
  }, { timeout: 55000 });
  const goblin = await page.evaluate(() => {
    const unit = window.__MAOU_GAME__.allies.find((ally) => ally.name === 'ゴブリン');
    return { room: unit.room, homeRoom: unit.homeRoom, chips: unit.chips, carrying: unit.carrying };
  });
  expect(goblin.room).toBe('atrium');
  expect(goblin.homeRoom).toBe('atrium');
  expect(goblin.chips).toContain('carryDowned');
  expect(goblin.carrying).toBeFalsy();
  await assertNoDocumentScroll(page);
});

test('result can continue into upgrade flow after a win', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-action="start"]').click();
  await page.locator('[data-set-speed="2"]').click();
  await page.evaluate(() => { window.__MAOU_GAME__.speed = 10; });
  await expect(page.getByText('撃退成功')).toBeVisible({ timeout: 55000 });
  await page.getByRole('button', { name: /捕獲処理へ/ }).click();
  await expect(page.locator('.panel-head span').filter({ hasText: /捕獲処理|強化/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /次の防衛へ|処理を終えて次へ/ })).toBeVisible();
  await assertNoDocumentScroll(page);
});

test('first reward expands the roster with slime after the tutorial defense', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-unit]')).toHaveCount(1);
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      game.phase = 'upgrade';
      game.captured = [];
    });
  });
  await page.getByRole('button', { name: /次の防衛へ/ }).click();
  const state = await page.evaluate(() => ({
    stageIndex: window.__MAOU_GAME__.stageIndex,
    allyNames: window.__MAOU_GAME__.allies.map((ally) => ally.name),
    chipBag: window.__MAOU_GAME__.chipBag,
    unlocks: window.__MAOU_GAME__.chipUnlocks
  }));
  expect(state.stageIndex).toBe(1);
  expect(state.allyNames).toEqual(['ゴブリン', 'スライム']);
  expect(state.chipBag.chaseNearest).toBe(2);
  expect(state.chipBag.attack).toBe(2);
  expect(state.chipBag.focusWeak).toBe(1);
  expect(state.unlocks.join('\n')).toContain('弱敵狙い');
  await expect(page.locator('[data-ui-panel="build"]')).toBeVisible();
  await assertNoDocumentScroll(page);
});

test('feeding a captured enemy applies material exp and growth bias', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      game.phase = 'upgrade';
      game.captured = [{ uid: 'cap-test', templateId: 'mage', name: '魔法使い', sprite: 'assets/sprites/mage.png', convertTo: 'darkMage' }];
    });
  });
  await page.locator('[data-unit]').filter({ hasText: 'ゴブリン' }).click();
  await page.getByRole('button', { name: /ゴブリン 経験\+6 知識\+2 攻撃\+1/ }).click();
  const goblin = await page.evaluate(() => window.__MAOU_GAME__.allies.find((ally) => ally.name === 'ゴブリン'));
  expect(goblin.level).toBe(1);
  expect(goblin.exp).toBe(6);
  expect(goblin.intExp).toBe(2);
  expect(goblin.maxHp).toBe(62);
  expect(goblin.atk).toBe(11);
  await assertNoDocumentScroll(page);
});

test('feeding a captured sage grants immediate intelligence growth', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      game.phase = 'upgrade';
      game.captured = [{
        uid: 'cap-sage',
        templateId: 'sage',
        name: '賢者',
        sprite: 'assets/sprites/sage/idle-front.png',
        convertTo: 'oracleShade',
        capture: { difficulty: 5, ttl: 7 },
        drop: { gold: 55, items: ['sageInk', 'manaDust'] }
      }];
    });
  });
  await expect(page.getByRole('button', { name: /ゴブリン 経験\+12 知識\+6 知性\+2 攻撃\+1/ })).toBeVisible();
  await page.getByRole('button', { name: /ゴブリン 経験\+12 知識\+6 知性\+2 攻撃\+1/ }).click();
  const goblin = await page.evaluate(() => window.__MAOU_GAME__.allies.find((ally) => ally.name === 'ゴブリン'));
  expect(goblin.int).toBe(5);
  expect(goblin.intExp).toBe(0);
  expect(goblin.chips.length).toBeLessThanOrEqual(goblin.int);
  await assertNoDocumentScroll(page);
});

test('upgrade flow supports captured selection and action previews', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      game.phase = 'upgrade';
      game.captured = [
        { uid: 'cap-warrior', templateId: 'warrior', name: '戦士', sprite: 'assets/sprites/warrior.png', convertTo: 'fallenWarrior' },
        { uid: 'cap-rogue', templateId: 'rogue', name: '盗賊', sprite: 'assets/sprites/rogue.png', convertTo: 'shadeRunner' }
      ];
      game.selectedCapturedId = 'cap-rogue';
    });
  });
  await expect(page.getByText('影走りになる')).toBeVisible();
  await expect(page.getByText(/経験\+8/)).toBeVisible();
  await expect(page.getByText(/解析 .*配置帰還.*接近/)).toBeVisible();
  await expect(page.getByRole('button', { name: /研究 .*配置帰還.*接近/ })).toBeVisible();
  await page.locator('[data-captured-select="cap-warrior"]').click();
  await expect(page.getByText('堕ちた戦士になる')).toBeVisible();
  await expect(page.getByRole('button', { name: /身代金 G\+22/ })).toBeVisible();
  await assertNoDocumentScroll(page);
});

test('captured enemy research grants chips tied to the captured job', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      game.phase = 'upgrade';
      game.chipBag.returnHome = 0;
      game.chipBag.chaseNearest = 3;
      game.captured = [{
        uid: 'cap-rogue',
        templateId: 'rogue',
        name: '盗賊',
        sprite: 'assets/sprites/rogue/idle-front.png',
        convertTo: 'shadeRunner',
        capture: { difficulty: 2, ttl: 10 },
        drop: { gold: 20, items: ['scoutBoots'] }
      }];
      game.selectedCapturedId = 'cap-rogue';
    });
  });
  await expect(page.getByRole('button', { name: /研究 .*配置帰還/ })).toBeVisible();
  await page.locator('[data-upgrade="research"]').click();
  const state = await page.evaluate(() => ({
    returnHome: window.__MAOU_GAME__.chipBag.returnHome,
    captured: window.__MAOU_GAME__.captured.length,
    unlock: window.__MAOU_GAME__.chipUnlocks[0],
    log: window.__MAOU_GAME__.log[0]
  }));
  expect(state.returnHome).toBe(1);
  expect(state.captured).toBe(0);
  expect(state.unlock).toContain('盗賊研究');
  expect(state.log).toContain('配置帰還');
  await assertNoDocumentScroll(page);
});

test('captured enemies can be ransomed for gold', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      game.phase = 'upgrade';
      game.gold = 10;
      game.captured = [{
        uid: 'cap-ransom',
        templateId: 'mage',
        name: '魔法使い',
        sprite: 'assets/sprites/mage.png',
        convertTo: 'darkMage',
        capture: { difficulty: 2, ttl: 11 },
        drop: { gold: 24, items: [] }
      }];
      game.selectedCapturedId = 'cap-ransom';
    });
  });
  await expect(page.getByRole('button', { name: /身代金 G\+42/ })).toBeVisible();
  await page.locator('[data-upgrade="ransom"]').click();
  const state = await page.evaluate(() => ({
    gold: window.__MAOU_GAME__.gold,
    captured: window.__MAOU_GAME__.captured.length,
    log: window.__MAOU_GAME__.log[0]
  }));
  expect(state.gold).toBe(52);
  expect(state.captured).toBe(0);
  expect(state.log).toContain('身代金');
  await assertNoDocumentScroll(page);
});

test('upgrade management supports selling, building, room upgrades, and research', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      game.phase = 'upgrade';
      game.gold = 1000;
      game.inventory = { rustyBlade: 2, manaDust: 1, roomStone: 1, silverChain: 1 };
      game.captured = [];
    });
  });
  await expect(page.locator('.treasury-box b')).toContainText('資金');
  await expect(page.locator('[data-ui-panel="invest"]')).toHaveClass(/on/);
  await expect(page.getByRole('button', { name: /チップ研究.*行動を増やす/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /魔物研究.*配下を増やす/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /広間拡張.*容量\+1/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /攻撃開発.*在庫x1/ })).toBeVisible();
  await expect(page.locator('.investment-grid .decision-card')).toHaveCount(4);
  await expect(page.locator('.focus-strip')).toContainText('ゴブリン');
  await page.locator('[data-ui-panel="loot"]').click();
  await expect(page.locator('.loot-columns')).toBeVisible();
  await expect(page.getByText(/ゴブリン 攻撃\+1/)).toBeVisible();
  await page.locator('[data-ui-panel="research"]').click();
  await expect(page.locator('.research-actions .decision-card')).toHaveCount(2);
  await expect(page.locator('[data-develop-chip="attack"]')).toBeVisible();
  await expect(page.locator('[data-research-monster]')).toContainText('魔物研究');
  await expect(page.getByText(/魔物候補/)).toBeVisible();
  await page.locator('[data-ui-panel="loot"]').click();
  await page.locator('[data-use-item-unit="rustyBlade"]').click();
  await page.locator('[data-use-item-unit="manaDust"]').click();
  await page.locator('[data-use-item-room="roomStone"]').click();
  await page.locator('[data-use-item-room="silverChain"]').click();
  await page.locator('[data-sell-item="rustyBlade"]').click();
  await page.locator('[data-ui-panel="research"]').click();
  await page.locator('[data-develop-chip="attack"]').click();
  await page.locator('[data-ui-panel="build"]').click();
  await expect(page.locator('.build-layout')).toBeVisible();
  await page.locator('[data-build-anchor="atrium"]').click();
  await page.locator('[data-build-door="east"]').click();
  await expect(page.locator('[data-build-door="east"]')).toHaveClass(/on/);
  await page.locator('.build-layout [data-build-slot="north"]').click();
  await expect(page.locator('[data-build-room="treasure"]')).toHaveClass(/decision-card/);
  await page.locator('[data-build-room="treasure"]').focus();
  await expect(page.locator('[data-build-preview-room="treasure"]')).toBeVisible();
  await expect(page.locator('.build-layout')).toContainText('北');
  await page.locator('[data-build-room="treasure"]').click();
  await page.locator('[data-upgrade-room="atrium"]').click();
  await page.locator('[data-ui-panel="object"]').click();
  await expect(page.locator('[data-install-object="savePoint"]')).toHaveClass(/decision-card/);
  await expect(page.locator('[data-install-object="savePoint"]')).toContainText('↻');
  await page.locator('[data-object-room="treasure"]').click();
  await page.locator('[data-install-object="savePoint"]').click();
  await page.locator('[data-ui-panel="research"]').click();
  await page.locator('[data-research-chip]').click();
  await page.locator('[data-research-monster]').click();
  const state = await page.evaluate(() => ({
    gold: window.__MAOU_GAME__.gold,
    rustyBlade: window.__MAOU_GAME__.inventory.rustyBlade,
    treasureBuilt: window.__MAOU_GAME__.builtRooms.has('treasure'),
    treasureConnection: window.__MAOU_GAME__.roomConnections.treasure,
    treasureDoors: window.__MAOU_GAME__.roomConnectionDoors['atrium::treasure'],
    treasurePosition: window.__MAOU_GAME__.roomPositions.treasure,
    treasureObject: window.__MAOU_GAME__.roomObjects.treasure,
    atriumCapacity: window.__MAOU_GAME__.roomCapacityBonus.atrium,
    captureTtlBonus: window.__MAOU_GAME__.captureTtlBonus,
    goblin: window.__MAOU_GAME__.allies.find((ally) => ally.name === 'ゴブリン'),
    attackChips: window.__MAOU_GAME__.chipBag.attack,
    knownChips: window.__MAOU_GAME__.collections.chips.size,
    allyCount: window.__MAOU_GAME__.allies.length
  }));
  expect(state.gold).toBeLessThan(1000);
  expect(state.rustyBlade).toBe(0);
  expect(state.goblin.atk).toBe(11);
  expect(state.goblin.intExp).toBe(2);
  expect(state.treasureBuilt).toBe(true);
  expect(state.treasureConnection).toContain('atrium');
  expect(state.treasureDoors.atrium).toBe('east');
  expect(state.treasurePosition.slotId).toBe('north');
  expect(state.treasureObject).toBe('savePoint');
  expect(state.atriumCapacity).toBe(2);
  expect(state.captureTtlBonus).toBe(3);
  expect(state.attackChips).toBeGreaterThanOrEqual(2);
  expect(state.knownChips).toBeGreaterThan(2);
  expect(state.allyCount).toBeGreaterThan(1);
  await assertNoDocumentScroll(page);
});

test('chip research prioritizes undiscovered chips before known upgrades', async ({ page }) => {
  await page.goto('/');
  const allChipIds = Object.keys(chips);
  await page.evaluate((chipIds) => {
    window.__MAOU_COMMIT__((game) => {
      game.phase = 'upgrade';
      game.uiPanel = 'research';
      game.gold = 1000;
      game.chipBag = Object.fromEntries(chipIds.map((id) => [id, 1]));
      game.chipBag.focusRare = 0;
      game.collections.chips = new Set(chipIds.filter((id) => id !== 'focusRare'));
    });
  }, allChipIds);

  await expect(page.locator('.research-actions')).toContainText('攻撃対象系????');
  await page.locator('[data-research-chip]').click();
  const state = await page.evaluate(() => ({
    focusRare: window.__MAOU_GAME__.chipBag.focusRare,
    knownFocusRare: window.__MAOU_GAME__.collections.chips.has('focusRare'),
    unlock: window.__MAOU_GAME__.chipUnlocks[0]
  }));
  expect(state.focusRare).toBe(1);
  expect(state.knownFocusRare).toBe(true);
  expect(state.unlock).toContain('希少狙い');
});

test('risky rooms trigger concrete tradeoffs when invaders enter', async ({ page }) => {
  await page.goto('/');
  const riskRooms = Object.fromEntries(['library', 'nest', 'treasure', 'armory'].map((id) => [
    id,
    { x: roomById[id].x, y: roomById[id].y, w: roomById[id].w, h: roomById[id].h }
  ]));
  await page.evaluate((roomsForTest) => {
    const roomPoint = (roomId, side = -0.28) => {
      const room = roomsForTest[roomId];
      return { x: room.x + room.w * side, y: room.y };
    };
    const enemy = (uid, room, atk = 4) => ({
      uid,
      templateId: 'rogue',
      name: uid,
      type: 'enemy',
      sprite: 'assets/sprites/rogue/idle-front.png',
      spriteSet: null,
      maxHp: 40,
      hp: 40,
      atk,
      spd: 1,
      range: 1,
      skills: [],
      chips: [],
      capture: { difficulty: 1, ttl: 10 },
      drop: { gold: 0, items: [] },
      room,
      ...roomPoint(room),
      facing: 'right',
      anim: 'idle',
      animTtl: 0,
      movingTo: null,
      moveClock: 0,
      attackClock: 0,
      searchClock: 999,
      knowsThrone: false,
      status: []
    });

    window.__MAOU_COMMIT__((game) => {
      game.phase = 'battle';
      game.speed = 1;
      game.gold = 100;
      game.inventory = { rustyBlade: 1 };
      game.waveQueue = [];
      game.enemies = [
        enemy('treasure-raider', 'treasure'),
        enemy('library-scout', 'library'),
        enemy('nest-intruder', 'nest'),
        enemy('armory-looter', 'armory', 4)
      ];
      for (const roomId of ['library', 'nest', 'treasure', 'armory']) {
        game.builtRooms.add(roomId);
        game.roomPositions[roomId] = { ...roomPoint(roomId, 0), slotId: `test-${roomId}` };
      }
      game.roomConnections.library = ['atrium'];
      game.roomConnections.nest = ['atrium', 'treasure'];
      game.roomConnections.treasure = ['atrium'];
      game.roomConnections.armory = ['atrium'];
      const goblin = game.allies[0];
      goblin.room = 'nest';
      goblin.homeRoom = 'nest';
      goblin.chips = [];
      goblin.attackClock = 0;
      Object.assign(goblin, roomPoint('nest', 0.3));
      game.partyKnowledge = { throneKnown: false, visited: new Set(['entrance']) };
      game.effects = [];
      game.log = [];
    });
  }, riskRooms);

  await page.waitForFunction(() => {
    const game = window.__MAOU_GAME__;
    return game.gold === 84
      && game.inventory.rustyBlade === 0
      && game.partyKnowledge.throneKnown
      && game.enemies.find((enemy) => enemy.uid === 'armory-looter')?.atk === 5
      && game.allies[0].attackClock > 1;
  });

  const state = await page.evaluate(() => ({
    gold: window.__MAOU_GAME__.gold,
    rustyBlade: window.__MAOU_GAME__.inventory.rustyBlade,
    throneKnown: window.__MAOU_GAME__.partyKnowledge.throneKnown,
    libraryScoutKnows: window.__MAOU_GAME__.enemies.find((enemy) => enemy.uid === 'library-scout')?.knowsThrone,
    armoryAtk: window.__MAOU_GAME__.enemies.find((enemy) => enemy.uid === 'armory-looter')?.atk,
    goblinDelay: window.__MAOU_GAME__.allies[0].attackClock,
    logs: window.__MAOU_GAME__.log
  }));
  expect(state.gold).toBe(84);
  expect(state.rustyBlade).toBe(0);
  expect(state.throneKnown).toBe(true);
  expect(state.libraryScoutKnows).toBe(true);
  expect(state.armoryAtk).toBe(5);
  expect(state.goblinDelay).toBeGreaterThan(1);
  expect(state.logs.join('\n')).toContain('荒らされた');
  expect(state.logs.join('\n')).toContain('手掛かり');
  expect(state.logs.join('\n')).toContain('混乱');
  expect(state.logs.join('\n')).toContain('攻撃+1');
  await assertNoDocumentScroll(page);
});

test('room objects apply traps, revival, and shared healing in battle', async ({ page }) => {
  await page.goto('/');
  const atrium = { x: roomById.atrium.x, y: roomById.atrium.y, w: roomById.atrium.w, h: roomById.atrium.h };

  await page.evaluate((room) => {
    const point = (side) => ({ x: room.x + room.w * side, y: room.y });
    const enemy = (overrides = {}) => ({
      uid: overrides.uid ?? 'object-test-enemy',
      templateId: 'warrior',
      name: overrides.name ?? '設備検証敵',
      type: 'enemy',
      sprite: 'assets/sprites/warrior/idle-front.png',
      spriteSet: null,
      maxHp: overrides.maxHp ?? 40,
      hp: overrides.hp ?? 40,
      atk: 1,
      spd: 1,
      range: 1,
      skills: [],
      chips: [],
      capture: { difficulty: 1, ttl: 10 },
      drop: { gold: 0, items: [] },
      room: 'atrium',
      ...point(-0.28),
      facing: 'right',
      anim: 'idle',
      animTtl: 0,
      movingTo: null,
      moveClock: 0,
      attackClock: 0,
      searchClock: 999,
      knowsThrone: false,
      status: [],
      ...overrides
    });

    window.__MAOU_COMMIT__((game) => {
      game.phase = 'battle';
      game.speed = 2;
      game.waveQueue = [];
      game.roomObjects = { atrium: 'spikeTrap' };
      game.enemies = [enemy({ uid: 'trap-target', hp: 20, maxHp: 30 })];
      game.allies[0].chips = [];
      game.allies[0].room = 'storage';
      game.allies[0].homeRoom = 'storage';
      game.effects = [];
      game.log = [];
    });
  }, atrium);

  await page.waitForFunction(() => window.__MAOU_GAME__.enemies.find((enemy) => enemy.uid === 'trap-target')?.hp === 10);
  const trapState = await page.evaluate(() => ({
    hp: window.__MAOU_GAME__.enemies.find((enemy) => enemy.uid === 'trap-target')?.hp,
    trapLog: window.__MAOU_GAME__.log.join('\n'),
    effect: window.__MAOU_GAME__.effects.some((effect) => String(effect.label).includes('罠'))
  }));
  expect(trapState.hp).toBe(10);
  expect(trapState.trapLog).toContain('棘罠');
  expect(trapState.effect).toBe(true);

  await page.evaluate((room) => {
    const point = (side) => ({ x: room.x + room.w * side, y: room.y });
    window.__MAOU_COMMIT__((game) => {
      game.phase = 'battle';
      game.speed = 2;
      game.waveQueue = [];
      game.roomObjects = { atrium: 'savePoint' };
      game.enemies = [{
        uid: 'revive-target',
        templateId: 'warrior',
        name: '復活検証敵',
        type: 'enemy',
        sprite: 'assets/sprites/warrior/idle-front.png',
        spriteSet: null,
        maxHp: 40,
        hp: 0,
        atk: 1,
        spd: 1,
        range: 1,
        skills: [],
        chips: [],
        capture: { difficulty: 1, ttl: 10 },
        drop: { gold: 0, items: [] },
        room: 'atrium',
        ...point(-0.28),
        facing: 'right',
        anim: 'idle',
        animTtl: 0,
        movingTo: null,
        moveClock: 0,
        attackClock: 0,
        searchClock: 999,
        knowsThrone: false,
        status: []
      }];
      game.downed = [];
      game.defeated = 0;
      game.effects = [];
      game.log = [];
    });
  }, atrium);

  await page.waitForFunction(() => window.__MAOU_GAME__.enemies.find((enemy) => enemy.uid === 'revive-target')?.saveRevived);
  const reviveState = await page.evaluate(() => {
    const enemy = window.__MAOU_GAME__.enemies.find((item) => item.uid === 'revive-target');
    return {
      hp: enemy?.hp,
      saveRevived: enemy?.saveRevived,
      downed: window.__MAOU_GAME__.downed.length,
      log: window.__MAOU_GAME__.log.join('\n')
    };
  });
  expect(reviveState.hp).toBe(20);
  expect(reviveState.saveRevived).toBe(true);
  expect(reviveState.downed).toBe(0);
  expect(reviveState.log).toContain('セーブポイント');

  await page.evaluate((room) => {
    const point = (side) => ({ x: room.x + room.w * side, y: room.y });
    window.__MAOU_COMMIT__((game) => {
      game.phase = 'battle';
      game.speed = 8;
      game.waveQueue = [];
      game.roomObjects = { atrium: 'healingSpring' };
      const goblin = game.allies[0];
      goblin.room = 'atrium';
      goblin.homeRoom = 'atrium';
      goblin.chips = [];
      goblin.maxHp = 40;
      goblin.hp = 20;
      Object.assign(goblin, point(0.3));
      game.enemies = [{
        uid: 'spring-target',
        templateId: 'warrior',
        name: '泉検証敵',
        type: 'enemy',
        sprite: 'assets/sprites/warrior/idle-front.png',
        spriteSet: null,
        maxHp: 40,
        hp: 16,
        atk: 1,
        spd: 1,
        range: 1,
        skills: [],
        chips: [],
        capture: { difficulty: 1, ttl: 10 },
        drop: { gold: 0, items: [] },
        room: 'atrium',
        ...point(-0.28),
        facing: 'right',
        anim: 'idle',
        animTtl: 0,
        movingTo: null,
        moveClock: 0,
        attackClock: 0,
        searchClock: 999,
        knowsThrone: false,
        status: []
      }];
      game.effects = [];
      game.log = [];
    });
  }, atrium);

  await page.waitForFunction(() => {
    const game = window.__MAOU_GAME__;
    const enemy = game.enemies.find((item) => item.uid === 'spring-target');
    return game.allies[0].hp > 20 && enemy?.hp > 16;
  });
  const springState = await page.evaluate(() => ({
    allyHp: window.__MAOU_GAME__.allies[0].hp,
    enemyHp: window.__MAOU_GAME__.enemies.find((enemy) => enemy.uid === 'spring-target')?.hp
  }));
  expect(springState.allyHp).toBeGreaterThan(20);
  expect(springState.enemyHp).toBeGreaterThan(16);
  await assertNoDocumentScroll(page);
});

test('monster research prioritizes unknown monsters with rarity preview', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      game.phase = 'upgrade';
      game.gold = 300;
      game.captured = [];
      game.collections.allies = new Set([
        'goblin',
        'slime',
        'poisonSlime',
        'darkSlime',
        'bat',
        'fallenWarrior',
        'shadeRunner',
        'darkMage',
        'boneGuard',
        'goblinChief',
        'plagueSlime',
        'impArcher'
      ]);
    });
  });

  await page.locator('[data-ui-panel="research"]').click();
  await expect(page.getByText(/魔物候補 .*伝説x1/)).toBeVisible();
  await expect(page.getByRole('button', { name: /魔物研究.*希少100%/ })).toBeVisible();
  await page.locator('[data-research-monster]').click();

  const state = await page.evaluate(() => ({
    names: window.__MAOU_GAME__.allies.map((ally) => ally.name),
    gold: window.__MAOU_GAME__.gold,
    log: window.__MAOU_GAME__.log.join('\n')
  }));
  expect(state.names).toContain('影託者');
  expect(state.gold).toBeLessThan(300);
  expect(state.log).toContain('伝説');
  await assertNoDocumentScroll(page);
});

test('monster fusion consumes an ally to grow the selected monster', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      const goblin = game.allies.find((ally) => ally.name === 'ゴブリン');
      game.phase = 'upgrade';
      game.captured = [];
      game.selectedUnitId = goblin.uid;
      game.allies.push({
        uid: 'fusion-slime',
        templateId: 'slime',
        name: 'スライム',
        type: 'ally',
        role: 'tank',
        sprite: 'assets/sprites/slime.png',
        maxHp: 68,
        hp: 68,
        level: 1,
        exp: 0,
        intExp: 0,
        atk: 5,
        spd: 0.65,
        int: 1,
        carry: 1,
        range: 1,
        skills: ['slowTouch'],
        traits: ['運搬可'],
        room: 'atrium',
        homeRoom: 'atrium',
        x: goblin.x + 18,
        y: goblin.y,
        facing: 'front',
        anim: 'idle',
        animTtl: 0,
        movingTo: null,
        chips: [],
        moveClock: 0,
        attackClock: 0,
        carrying: null,
        status: []
      });
      game.selectedFusionId = 'fusion-slime';
    });
  });

  await page.locator('[data-ui-panel="fusion"]').click();
  await expect(page.getByText('魔物合成')).toBeVisible();
  await expect(page.locator('.fusion-preview')).toContainText('経験+12');
  await expect(page.locator('[data-fusion-material="fusion-slime"]')).toContainText('通常素材');
  await expect(page.locator('[data-fuse-ally="fusion-slime"]')).toContainText('合成実行');
  await page.locator('[data-fuse-ally="fusion-slime"]').click();

  const state = await page.evaluate(() => {
    const goblin = window.__MAOU_GAME__.allies.find((ally) => ally.name === 'ゴブリン');
    return {
      allyNames: window.__MAOU_GAME__.allies.map((ally) => ally.name),
      goblin,
      log: window.__MAOU_GAME__.log[0]
    };
  });
  expect(state.allyNames).toEqual(['ゴブリン']);
  expect(state.goblin.exp).toBe(12);
  expect(state.goblin.intExp).toBe(1);
  expect(state.goblin.maxHp).toBe(64);
  expect(state.log).toContain('合成素材');
  await assertNoDocumentScroll(page);
});

test('skills apply visible status effects for allies and enemies', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      const goblin = game.allies.find((ally) => ally.name === 'ゴブリン');
      Object.assign(goblin, {
        room: 'atrium',
        homeRoom: 'atrium',
        x: 600,
        y: 385,
        skills: ['slowTouch'],
        chips: ['attack'],
        attackClock: 0,
        movingTo: null
      });
      game.phase = 'battle';
      game.speed = 1;
      game.waveQueue = [];
      game.enemies = [{
        uid: 'status-test',
        templateId: 'mage',
        name: '魔法使い',
        type: 'enemy',
        sprite: 'assets/sprites/mage.png',
        maxHp: 20,
        hp: 20,
        atk: 4,
        spd: 0.62,
        range: 3,
        skills: ['poisonTouch'],
        chips: ['engageGuard'],
        convertTo: 'darkMage',
        room: 'atrium',
        x: 635,
        y: 385,
        movingTo: null,
        moveClock: 0,
        attackClock: 0,
        searchClock: 999,
        knowsThrone: false,
        capture: { difficulty: 2, ttl: 10 },
        drop: { gold: 0, items: [] },
        status: []
      }];
    });
  });
  await page.waitForFunction(() => {
    const game = window.__MAOU_GAME__;
    const poisonedAlly = game.allies.find((ally) => ally.status?.some((item) => item.id === 'poison'));
    const enemy = game.enemies.find((item) => item.uid === 'status-test');
    return poisonedAlly && enemy?.status?.some((item) => item.id === 'slow');
  }, null, { timeout: 8000 });
  await expect(page.locator('.status-badge').first()).toBeVisible();
  await assertNoDocumentScroll(page);
});

test('battle supports unit selection and map zoom without direct commands', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-action="start"]').click();
  await expect(page.getByText('防衛中')).toBeVisible();
  const battleCamera = await page.evaluate(() => window.__MAOU_GAME__.camera);
  expect(battleCamera.zoom).toBeGreaterThanOrEqual(0.9);
  const allyActor = page.locator('.actor.ally').first();
  await expect(allyActor).toBeVisible();
  expect(roomById.atrium.w * battleCamera.zoom).toBeGreaterThanOrEqual(630);
  await allyActor.click();
  await expect(page.getByText(/体力 \d+\/\d+ \/ 攻撃/)).toBeVisible();
  await expect(page.locator('[data-command-room]')).toHaveCount(0);
  await expect(page.locator('.battle-chips span').first()).toBeVisible();
  await page.getByRole('button', { name: '＋' }).click();
  const transform = await page.locator('.map-world').evaluate((el) => getComputedStyle(el).transform);
  expect(transform).not.toBe('none');
  await page.locator('[data-mapaction="reset"]').click();
  const overviewCamera = await page.evaluate(() => window.__MAOU_GAME__.camera);
  expect(overviewCamera.zoom).toBeLessThan(battleCamera.zoom);
  await assertNoDocumentScroll(page);
});

test('battle supports pause, log toggle, retry, and map focus controls', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-action="start"]').click();
  await page.locator('[data-speed-pause]').click();
  expect(await page.evaluate(() => window.__MAOU_GAME__.speed)).toBe(0);
  await page.locator('[data-action="toggleLog"]').click();
  expect(await page.evaluate(() => window.__MAOU_GAME__.showLog)).toBe(false);
  await page.locator('[data-mapaction="focusSelected"]').first().click();
  const focused = await page.evaluate(() => window.__MAOU_GAME__.camera);
  expect(Math.abs(focused.x)).toBeGreaterThan(1);
  await page.locator('[data-action="retry"]').click();
  expect(await page.evaluate(() => window.__MAOU_GAME__.phase)).toBe('battle');
  await page.locator('[data-action="retreat"]').click();
  expect(await page.evaluate(() => window.__MAOU_GAME__.phase)).toBe('setup');
  await assertNoDocumentScroll(page);
});

test('map supports pinch zoom while the screen frame stays fixed', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => window.__MAOU_GAME__.camera.zoom);
  await page.evaluate(() => {
    const el = document.querySelector('[data-map-shell]');
    const opts = { bubbles: true, pointerType: 'touch', isPrimary: false };
    el.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerId: 1, clientX: 120, clientY: 180 }));
    el.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerId: 2, clientX: 220, clientY: 180 }));
    el.dispatchEvent(new PointerEvent('pointermove', { ...opts, pointerId: 1, clientX: 90, clientY: 180 }));
    el.dispatchEvent(new PointerEvent('pointermove', { ...opts, pointerId: 2, clientX: 250, clientY: 180 }));
    el.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerId: 1, clientX: 90, clientY: 180 }));
    el.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerId: 2, clientX: 250, clientY: 180 }));
  });
  const after = await page.evaluate(() => window.__MAOU_GAME__.camera.zoom);
  expect(after).toBeGreaterThan(before);
  await assertNoDocumentScroll(page);
});

test('map camera stays inside the dungeon bounds during extreme pan gestures', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__MAOU_COMMIT__((game) => {
      game.camera = { zoom: 1, x: 0, y: 0 };
    });
  });
  await page.evaluate(() => {
    const el = document.querySelector('[data-map-shell]');
    const rect = el.getBoundingClientRect();
    const opts = { bubbles: true, pointerType: 'mouse', pointerId: 41, isPrimary: true };
    const startX = rect.left + Math.min(220, rect.width * 0.45);
    const startY = rect.top + Math.min(220, rect.height * 0.38);
    el.dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientX: startX, clientY: startY }));
    el.dispatchEvent(new PointerEvent('pointermove', { ...opts, clientX: startX + 8000, clientY: startY + 8000 }));
    el.dispatchEvent(new PointerEvent('pointerup', { ...opts, clientX: startX + 8000, clientY: startY + 8000 }));
  });
  const maxed = await page.evaluate(() => ({
    camera: window.__MAOU_GAME__.camera,
    view: { width: window.innerWidth, height: window.innerHeight }
  }));
  const margin = maxed.view.width < 720 ? 80 : 160;
  expect(maxed.camera.x).toBeLessThanOrEqual(margin);
  expect(maxed.camera.y).toBeLessThanOrEqual(margin);

  await page.evaluate(() => {
    const el = document.querySelector('[data-map-shell]');
    const rect = el.getBoundingClientRect();
    const opts = { bubbles: true, pointerType: 'mouse', pointerId: 42, isPrimary: true };
    const startX = rect.left + Math.min(220, rect.width * 0.45);
    const startY = rect.top + Math.min(220, rect.height * 0.38);
    el.dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientX: startX, clientY: startY }));
    el.dispatchEvent(new PointerEvent('pointermove', { ...opts, clientX: startX - 8000, clientY: startY - 8000 }));
    el.dispatchEvent(new PointerEvent('pointerup', { ...opts, clientX: startX - 8000, clientY: startY - 8000 }));
  });
  const mined = await page.evaluate(() => ({
    camera: window.__MAOU_GAME__.camera,
    view: { width: window.innerWidth, height: window.innerHeight }
  }));
  const minMargin = mined.view.width < 720 ? 80 : 160;
  expect(mined.camera.x).toBeGreaterThanOrEqual(Math.round(mined.view.width - worldSize.width * mined.camera.zoom - minMargin));
  expect(mined.camera.y).toBeGreaterThanOrEqual(Math.round(mined.view.height - worldSize.height * mined.camera.zoom - minMargin));
  await assertNoDocumentScroll(page);
});
