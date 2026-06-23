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
  await expect(page.getByText('魔王のガンビット').first()).toBeVisible();
  await expect(page.getByText('編成')).toBeVisible();
  await assertNoDocumentScroll(page);
});

test('stage runs and reaches result screen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /侵入開始/ }).click();
  await expect(page.getByText('防衛中')).toBeVisible();
  await page.getByRole('button', { name: /×2/ }).click();
  await expect(page.getByText(/探索中|発見済/)).toBeVisible();
  await expect(page.getByText(/撃退成功|魔王敗北/)).toBeVisible({ timeout: 35000 });
  await assertNoDocumentScroll(page);
});

test('result can continue into upgrade flow after a win', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /侵入開始/ }).click();
  await page.getByRole('button', { name: /×2/ }).click();
  await expect(page.getByText('撃退成功')).toBeVisible({ timeout: 35000 });
  await page.getByRole('button', { name: /捕獲処理へ/ }).click();
  await expect(page.getByText(/捕獲処理|強化/)).toBeVisible();
  await expect(page.getByRole('button', { name: /次の防衛へ|処理を終えて次へ/ })).toBeVisible();
  await assertNoDocumentScroll(page);
});

test('battle supports unit selection, room command, and map zoom', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /侵入開始/ }).click();
  await expect(page.getByText('防衛中')).toBeVisible();
  await page.locator('.actor.ally').first().click();
  await expect(page.getByText(/HP \d+\/\d+ \/ ATK/)).toBeVisible();
  await page.getByRole('button', { name: '牢屋へ' }).click();
  await page.getByRole('button', { name: '＋' }).click();
  const transform = await page.locator('.map-world').evaluate((el) => getComputedStyle(el).transform);
  expect(transform).not.toBe('none');
  await assertNoDocumentScroll(page);
});
