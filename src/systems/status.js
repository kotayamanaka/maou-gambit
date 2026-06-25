import { statuses } from '../data/statuses.js';

export function applyStatus(unit, id, duration, power = 1) {
  if (!unit || !statuses[id]) return false;
  unit.status ??= [];
  const existing = unit.status.find((item) => item.id === id);
  if (existing) {
    existing.duration = Math.max(existing.duration, duration);
    existing.power = Math.max(existing.power ?? 1, power);
    return true;
  }
  unit.status.push({ id, duration, power });
  return true;
}

export function statusIconList(unit) {
  return (unit.status ?? [])
    .filter((item) => item.duration > 0)
    .map((item) => statuses[item.id]?.icon ?? '?');
}

export function statusNameList(unit) {
  return (unit.status ?? [])
    .filter((item) => item.duration > 0)
    .map((item) => `${statuses[item.id]?.name ?? item.id}${Math.ceil(item.duration)}s`);
}

export function speedMultiplier(unit) {
  return (unit.status ?? []).reduce((multiplier, item) => {
    if (item.duration <= 0) return multiplier;
    if (item.id === 'slow') return multiplier * Math.max(0.35, 1 - 0.35 * (item.power ?? 1));
    if (item.id === 'haste') return multiplier * (1 + 0.25 * (item.power ?? 1));
    return multiplier;
  }, 1);
}

export function attackMultiplier(unit) {
  return (unit.status ?? []).reduce((multiplier, item) => {
    if (item.duration <= 0) return multiplier;
    if (item.id === 'might') return multiplier * (1 + 0.25 * (item.power ?? 1));
    return multiplier;
  }, 1);
}

export function tickStatuses(unit, dt, game) {
  if (!unit?.status?.length || unit.hp <= 0) return;
  for (const item of unit.status) {
    if (item.duration <= 0) continue;
    if (item.id === 'poison') {
      const damage = Math.min(unit.hp, Math.max(0.15, (item.power ?? 1) * 0.75) * dt);
      unit.hp = Math.max(0, +(unit.hp - damage).toFixed(2));
      if (game?.metrics) {
        if (unit.type === 'enemy') game.metrics.allyDamage += damage;
        if (unit.type === 'ally') game.metrics.enemyDamage += damage;
      }
    }
    item.duration -= dt;
  }
  unit.status = unit.status.filter((item) => item.duration > 0 && unit.hp > 0);
}
