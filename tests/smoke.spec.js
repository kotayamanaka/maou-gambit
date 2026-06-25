import { expect, test } from '@playwright/test';

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

test('layout fits without page scroll', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('第一侵入隊').first()).toBeVisible();
  await expect(page.locator('.map-shell')).toBeVisible();
  await expect(page.locator('.unit-picker')).toBeVisible();
  await assertNoDocumentScroll(page);
});

test('setup supports monster selection, placement, and chip editing', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.unit-picker')).toBeVisible();
  await expect(page.locator('[data-unit]')).toHaveCount(3);
  await page.locator('.actor.ally').first().click();
  await page.locator('[data-place="storage"]').click();
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
  expect(state.visibleChips).toContain('returnHome');
  expect(state.lockedChips).toContain('returnHome');
  expect(state.lockedChips).toContain('focusMage');
  await assertNoDocumentScroll(page);
});

test('setup enforces room capacity', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-unit]').nth(0).click();
  await page.locator('[data-place="storage"]').click();
  await page.locator('[data-unit]').nth(1).click();
  await expect(page.locator('[data-place="storage"]')).toBeDisabled();
  const rooms = await page.evaluate(() => window.__MAOU_GAME__.allies.map((ally) => ({ name: ally.name, room: ally.room })));
  expect(rooms.find((ally) => ally.name === 'ゴブリン').room).toBe('storage');
  expect(rooms.find((ally) => ally.name === 'スライム').room).not.toBe('storage');
  await assertNoDocumentScroll(page);
});

test('setup shows advice, chip detail, next enemies, and unlock history', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/チップ枠余り|編成チェックOK/)).toBeVisible();
  await page.locator('[data-chip="focusMage"]').click();
  await expect(page.getByText('術師狙い').last()).toBeVisible();
  await expect(page.getByText('未発見').first()).toBeVisible();
  await expect(page.getByText('次の敵情報')).toBeVisible();
  await expect(page.getByText(/戦士x1/)).toBeVisible();
  await expect(page.getByText('チップ解放履歴')).toBeVisible();
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

test('stage runs and reaches result screen', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-action="start"]').click();
  await expect(page.getByText('防衛中')).toBeVisible();
  await page.locator('[data-action="speed"]').click();
  await page.evaluate(() => { window.__MAOU_GAME__.speed = 6; });
  await expect(page.getByText(/探索中|発見済/)).toBeVisible();
  await expect(page.getByText(/撃退成功|魔王敗北/)).toBeVisible({ timeout: 55000 });
  await assertNoDocumentScroll(page);
});

test('targeting chips do not sense enemies in other rooms', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const game = window.__MAOU_GAME__;
    game.chipBag.focusMage = 1;
    const bat = game.allies.find((ally) => ally.name === 'コウモリ');
    bat.chips = ['focusMage'];
  });
  await page.locator('[data-action="start"]').click();
  await page.locator('[data-action="speed"]').click();
  await page.evaluate(() => { window.__MAOU_GAME__.speed = 6; });
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
  expect(snapshot.allies.find((ally) => ally.name === 'スライム').room).toBe('hallB');
  expect(snapshot.allies.find((ally) => ally.name === 'コウモリ').room).toBe('hallA');
  expect(snapshot.allies.find((ally) => ally.name === 'コウモリ').chips).toContain('focusMage');
  await assertNoDocumentScroll(page);
});

test('enemies use behavior chips to fight same-room monsters', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-action="start"]').click();
  await page.locator('[data-action="speed"]').click();
  await page.evaluate(() => { window.__MAOU_GAME__.speed = 6; });
  await page.waitForFunction(() => {
    const game = window.__MAOU_GAME__;
    const bat = game?.allies.find((ally) => ally.name === 'コウモリ');
    return game?.enemies.some((enemy) => enemy.chips?.includes('engageGuard')) && bat && bat.hp < bat.maxHp;
  }, { timeout: 55000 });
  const snapshot = await page.evaluate(() => {
    const bat = window.__MAOU_GAME__.allies.find((ally) => ally.name === 'コウモリ');
    const enemy = window.__MAOU_GAME__.enemies.find((item) => item.chips?.includes('engageGuard'));
    return { batHp: bat.hp, batMax: bat.maxHp, enemyChips: enemy.chips };
  });
  expect(snapshot.batHp).toBeLessThan(snapshot.batMax);
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
        x: 560,
        y: 265,
        range: 1,
        chips: ['attack'],
        attackClock: 0,
        movingTo: null
      });
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
        x: 660,
        y: 265,
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
    return goblin.x > 563 && enemy.hp === enemy.maxHp;
  }, null, { timeout: 1200 });
  await page.waitForFunction(() => {
    const enemy = window.__MAOU_GAME__.enemies.find((item) => item.uid === 'melee-range-test');
    return enemy && enemy.hp < enemy.maxHp;
  }, null, { timeout: 3500 });
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
        x: 552,
        y: 265,
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
        maxHp: 20,
        hp: 20,
        atk: 4,
        spd: 0.62,
        range: 3,
        chips: [],
        convertTo: 'darkMage',
        room: 'atrium',
        x: 670,
        y: 265,
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
  await page.locator('[data-action="speed"]').click();
  await page.evaluate(() => { window.__MAOU_GAME__.speed = 6; });
  await expect(page.getByText('撃退成功')).toBeVisible({ timeout: 55000 });
  await page.getByRole('button', { name: /捕獲処理へ/ }).click();
  await expect(page.getByText(/捕獲処理|強化/)).toBeVisible();
  await expect(page.getByRole('button', { name: /次の防衛へ|処理を終えて次へ/ })).toBeVisible();
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
  await page.locator('[data-unit]').filter({ hasText: 'スライム' }).click();
  await page.getByRole('button', { name: /スライム EXP\+6 知\+2 ATK\+1/ }).click();
  const slime = await page.evaluate(() => window.__MAOU_GAME__.allies.find((ally) => ally.name === 'スライム'));
  expect(slime.level).toBe(1);
  expect(slime.exp).toBe(6);
  expect(slime.intExp).toBe(2);
  expect(slime.maxHp).toBe(68);
  expect(slime.atk).toBe(6);
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
  await expect(page.getByText(/EXP\+8/)).toBeVisible();
  await expect(page.getByText('研究候補')).toBeVisible();
  await page.locator('[data-captured-select="cap-warrior"]').click();
  await expect(page.getByText('堕ちた戦士になる')).toBeVisible();
  await assertNoDocumentScroll(page);
});

test('battle supports unit selection and map zoom without direct commands', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-action="start"]').click();
  await expect(page.getByText('防衛中')).toBeVisible();
  await page.locator('.actor.ally').first().click();
  await expect(page.getByText(/HP \d+\/\d+ \/ ATK/)).toBeVisible();
  await expect(page.locator('[data-command-room]')).toHaveCount(0);
  await expect(page.locator('.battle-chips span').first()).toBeVisible();
  await page.getByRole('button', { name: '＋' }).click();
  const transform = await page.locator('.map-world').evaluate((el) => getComputedStyle(el).transform);
  expect(transform).not.toBe('none');
  await assertNoDocumentScroll(page);
});

test('battle supports pause, log toggle, retry, and map focus controls', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-action="start"]').click();
  await page.locator('[data-action="pause"]').click();
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
