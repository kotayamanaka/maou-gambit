import { feedMaterials, growthProfiles } from '../data/growth.js';

export function growthProfile(unit) {
  return growthProfiles[unit.templateId] ?? growthProfiles.default;
}

export function nextLevelExp(unit) {
  return 18 + ((unit.level ?? 1) - 1) * 8;
}

export function nextIntExp(unit) {
  return growthProfile(unit).intNeed;
}

function roundStat(value) {
  return Math.round(value * 100) / 100;
}

function statSnapshot(unit) {
  return {
    level: unit.level ?? 1,
    exp: unit.exp ?? 0,
    intExp: unit.intExp ?? 0,
    maxHp: unit.maxHp,
    atk: unit.atk,
    spd: unit.spd,
    int: unit.int
  };
}

function diffStats(before, after) {
  return {
    level: after.level - before.level,
    maxHp: after.maxHp - before.maxHp,
    atk: after.atk - before.atk,
    spd: roundStat(after.spd - before.spd),
    int: after.int - before.int,
    exp: after.exp - before.exp,
    intExp: after.intExp - before.intExp
  };
}

export function applyFeedGrowth(unit, captured) {
  const before = statSnapshot(unit);
  const material = feedMaterials[captured.templateId] ?? feedMaterials.default;
  const profile = growthProfile(unit);

  unit.level ??= 1;
  unit.exp ??= 0;
  unit.intExp ??= 0;

  unit.exp += material.exp;
  unit.intExp += material.intExp;
  unit.maxHp += material.bonuses.maxHp ?? 0;
  unit.atk += material.bonuses.atk ?? 0;
  unit.spd = roundStat(unit.spd + (material.bonuses.spd ?? 0));

  let levelUps = 0;
  while (unit.exp >= nextLevelExp(unit)) {
    unit.exp -= nextLevelExp(unit);
    unit.level += 1;
    levelUps += 1;
    unit.maxHp += profile.hp;
    if (profile.atkEvery > 0 && unit.level % profile.atkEvery === 0) unit.atk += 1;
    unit.spd = roundStat(unit.spd + profile.spd);
  }

  let intUps = 0;
  while (unit.int < profile.maxInt && unit.intExp >= nextIntExp(unit)) {
    unit.intExp -= nextIntExp(unit);
    unit.int += 1;
    intUps += 1;
  }
  if (unit.int >= profile.maxInt) unit.intExp = Math.min(unit.intExp, nextIntExp(unit) - 1);

  unit.hp = unit.maxHp;

  const after = statSnapshot(unit);
  return {
    material,
    levelUps,
    intUps,
    diff: diffStats(before, after)
  };
}

export function previewFeedGrowth(unit, captured) {
  const clone = {
    ...unit,
    status: [...(unit.status ?? [])],
    chips: [...(unit.chips ?? [])],
    traits: [...(unit.traits ?? [])]
  };
  return applyFeedGrowth(clone, captured);
}
