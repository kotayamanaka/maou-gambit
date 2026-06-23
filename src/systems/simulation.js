import { addLog } from '../game/state.js';
import { decideAllyAction, decideEnemyMove } from './ai.js';
import { attack, enemyDiscoverRoom, moveUnit, spawnDueEnemies } from './combat.js';
import { createDownedEnemy, pickupDowned, resolveCaptures } from './capture.js';

export function tickBattle(game, dt) {
  if (game.phase !== 'battle') return;
  const step = dt * game.speed;
  game.elapsed += step;
  spawnDueEnemies(game);

  for (const unit of game.allies.filter((ally) => ally.hp > 0)) {
    if (unit.attackClock > 0) unit.attackClock -= step;
    const action = decideAllyAction(game, unit);
    if (action.type === 'attack' && unit.attackClock <= 0) {
      const didAttack = attack(unit, action.target, game, '斬');
      if (!didAttack && action.target) moveUnit(unit, action.target.room, step);
    }
    if (action.type === 'move') moveUnit(unit, action.targetRoom, step);
    if (action.type === 'pickup') {
      if (!pickupDowned(unit, action.target, game)) moveUnit(unit, action.target.room, step);
    }
    if (action.type === 'carry') moveUnit(unit, action.targetRoom, step);
  }

  for (const enemy of game.enemies.filter((item) => item.hp > 0)) {
    if (enemy.attackClock > 0) enemy.attackClock -= step;
    enemyDiscoverRoom(game, enemy);
    const sameRoomAlly = game.allies.find((ally) => ally.hp > 0 && ally.room === enemy.room);
    if (sameRoomAlly && enemy.attackClock <= 0) {
      attack(enemy, sameRoomAlly, game, '打');
      continue;
    }
    if (enemy.room === 'throne' && enemy.attackClock <= 0) {
      attack(enemy, game.demonLord, game, '魔王');
      if (game.demonLord.hp <= 0) {
        game.phase = 'defeat';
        game.result = makeResult(game, false);
        addLog(game, '魔王が倒された。');
        return;
      }
      continue;
    }
    const action = decideEnemyMove(game, enemy);
    if (action.type === 'move') {
      const moved = moveUnit(enemy, action.targetRoom, step);
      if (moved) {
        game.effects.push({ id: crypto.randomUUID(), type: 'question', room: enemy.room, ttl: 0.45, label: enemy.knowsThrone ? '!' : '?' });
      }
    }
  }

  for (const enemy of [...game.enemies]) {
    if (enemy.hp > 0) continue;
    game.downed.push(createDownedEnemy(enemy));
    game.enemies = game.enemies.filter((item) => item.uid !== enemy.uid);
    game.defeated += 1;
    addLog(game, `${enemy.name}がダウン。牢屋へ運べる。`);
  }

  resolveCaptures(game, step);
  game.effects = game.effects.map((effect) => ({ ...effect, ttl: effect.ttl - step })).filter((effect) => effect.ttl > 0);

  const allSpawned = game.waveQueue.every((spawn) => spawn.spawned);
  if (allSpawned && game.enemies.length === 0 && game.downed.length === 0) {
    game.phase = 'result';
    game.result = makeResult(game, true);
    addLog(game, '侵入隊を撃退。');
  }
}

function makeResult(game, won) {
  return {
    won,
    defeated: game.defeated,
    captured: game.captured.length,
    lordHp: game.demonLord.hp,
    elapsed: Math.round(game.elapsed)
  };
}
