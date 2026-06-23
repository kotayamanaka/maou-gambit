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
  await page.locator('[data-chip="chaseNearest"]').click();
  const state = await page.evaluate(() => {
    const unit = window.__MAOU_GAME__.allies.find((ally) => ally.uid === window.__MAOU_GAME__.selectedUnitId);
    return { room: unit.room, chips: unit.chips };
  });
  expect(state.room).toBe('storage');
  expect(state.chips).toContain('chaseNearest');
  expect(state.chips).not.toContain('carryDowned');
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
  await expect(page.getByText(/探索中|発見済/)).toBeVisible();
  await expect(page.getByText(/撃退成功|魔王敗北/)).toBeVisible({ timeout: 35000 });
  await assertNoDocumentScroll(page);
});

test('allies intercept before enemies reach the demon lord', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-action="start"]').click();
  await page.locator('[data-action="speed"]').click();
  await page.waitForFunction(() => window.__MAOU_GAME__?.elapsed > 12);
  const snapshot = await page.evaluate(() => ({
    lordHp: window.__MAOU_GAME__.demonLord.hp,
    maxLordHp: window.__MAOU_GAME__.demonLord.maxHp,
    throneEnemies: window.__MAOU_GAME__.enemies.filter((enemy) => enemy.room === 'throne').length,
    allyRooms: window.__MAOU_GAME__.allies.map((ally) => ally.room)
  }));
  expect(snapshot.lordHp).toBe(snapshot.maxLordHp);
  expect(snapshot.throneEnemies).toBe(0);
  expect(snapshot.allyRooms).not.toEqual(['atrium', 'hallB', 'hallA']);
  await assertNoDocumentScroll(page);
});

test('result can continue into upgrade flow after a win', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-action="start"]').click();
  await page.locator('[data-action="speed"]').click();
  await expect(page.getByText('撃退成功')).toBeVisible({ timeout: 35000 });
  await page.getByRole('button', { name: /捕獲処理へ/ }).click();
  await expect(page.getByText(/捕獲処理|強化/)).toBeVisible();
  await expect(page.getByRole('button', { name: /次の防衛へ|処理を終えて次へ/ })).toBeVisible();
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
