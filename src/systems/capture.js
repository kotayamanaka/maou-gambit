import { addLog } from '../game/state.js';

export function createDownedEnemy(enemy, game = null) {
  return {
    uid: `downed-${enemy.uid}`,
    templateId: enemy.templateId,
    name: enemy.name,
    sprite: enemy.sprite,
    spriteSet: enemy.spriteSet ? structuredClone(enemy.spriteSet) : null,
    facing: enemy.facing ?? 'front',
    convertTo: enemy.convertTo,
    capture: enemy.capture,
    drop: enemy.drop,
    room: enemy.room,
    x: enemy.x,
    y: enemy.y,
    ttl: (enemy.capture?.ttl ?? 12) + (game?.captureTtlBonus ?? 0),
    carriedBy: null
  };
}

export function pickupDowned(unit, downed, game) {
  if (!downed || downed.carriedBy || unit.carry <= 0) return false;
  if (unit.room !== downed.room) return false;
  const distance = Math.hypot((unit.x ?? 0) - (downed.x ?? 0), (unit.y ?? 0) - (downed.y ?? 0));
  if (distance > 38) return false;
  unit.carrying = downed.uid;
  downed.carriedBy = unit.uid;
  addLog(game, `${unit.name}が${downed.name}を担いだ。`);
  return true;
}

export function resolveCaptures(game, dt) {
  for (const body of game.downed) {
    if (body.carriedBy) {
      const carrier = game.allies.find((unit) => unit.uid === body.carriedBy);
      if (!carrier || carrier.hp <= 0) {
        if (carrier) carrier.carrying = null;
        body.carriedBy = null;
      } else {
        body.room = carrier.room;
        body.x = carrier.x;
        body.y = carrier.y;
      }
    } else {
      body.ttl -= dt;
    }
  }

  for (const unit of game.allies.filter((ally) => ally.hp > 0)) {
    if (!unit.carrying || unit.room !== 'jail') continue;
    const body = game.downed.find((item) => item.uid === unit.carrying);
    if (!body) {
      unit.carrying = null;
      continue;
    }
    game.captured.push({ ...body, capturedAt: game.elapsed });
    game.downed = game.downed.filter((item) => item.uid !== body.uid);
    unit.carrying = null;
    addLog(game, `${body.name}を牢屋に捕獲。`);
    game.effects.push({ id: crypto.randomUUID(), type: 'capture', room: 'jail', ttl: 1.0, label: '捕獲' });
  }

  const expired = game.downed.filter((body) => body.ttl <= 0);
  for (const body of expired) {
    const carrier = game.allies.find((unit) => unit.carrying === body.uid);
    if (carrier) carrier.carrying = null;
  }
  if (expired.length) addLog(game, `${expired.length}体のダウン敵が消滅。`);
  game.downed = game.downed.filter((body) => body.ttl > 0);
}
