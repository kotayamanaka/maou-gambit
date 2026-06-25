import { allyTemplates } from '../data/units.js';
import { chips } from '../data/chips.js';
import { currentStage, addLog, resetToSetup } from '../game/state.js';
import { roomById } from '../data/rooms.js';
import { firstOpenAllyRoom } from './placement.js';
import { applyFeedGrowth } from './growth.js';

export function consumeCaptured(game, capturedUid, mode, targetUid) {
  const captured = game.captured.find((item) => item.uid === capturedUid);
  if (!captured) return;

  if (mode === 'convert') {
    const template = allyTemplates[captured.convertTo];
    if (template) {
      const room = firstOpenAllyRoom(game);
      const unit = {
        uid: `${template.id}-${Date.now()}`,
        templateId: template.id,
        name: template.name,
        type: template.type,
        role: template.role,
        sprite: template.sprite,
        maxHp: template.stats.hp,
        hp: template.stats.hp,
        level: 1,
        exp: 0,
        intExp: 0,
        atk: template.stats.atk,
        spd: template.stats.spd,
        int: template.stats.int,
        carry: template.stats.carry,
        range: template.stats.range,
        traits: [...template.traits],
        room,
        homeRoom: room,
        x: roomById[room].x,
        y: roomById[room].y,
        movingTo: null,
        chips: [],
        moveClock: 0,
        attackClock: 0,
        carrying: null,
        status: []
      };
      game.allies.push(unit);
      addLog(game, `${captured.name}を${template.name}として眷属化。`);
    }
  }

  if (mode === 'feed') {
    const target = game.allies.find((unit) => unit.uid === targetUid) ?? game.allies[0];
    const result = applyFeedGrowth(target, captured);
    const gains = [`EXP+${result.material.exp}`];
    if (result.material.intExp) gains.push(`知+${result.material.intExp}`);
    if (result.levelUps) gains.push(`LV+${result.levelUps}`);
    if (result.intUps) gains.push(`INT+${result.intUps}`);
    if (result.diff.maxHp) gains.push(`HP+${result.diff.maxHp}`);
    if (result.diff.atk) gains.push(`ATK+${result.diff.atk}`);
    if (result.diff.spd) gains.push(`SPD+${result.diff.spd}`);
    addLog(game, `${captured.name}を養分化し、${target.name}を強化（${gains.join(' / ') || result.material.label}）。`);
  }

  if (mode === 'research') {
    const candidates = Object.keys(chips).filter((id) => (game.chipBag[id] ?? 0) < 3);
    const chipId = candidates[Math.floor(Math.random() * candidates.length)] ?? 'attack';
    game.chipBag[chipId] = (game.chipBag[chipId] ?? 0) + 1;
    game.chipUnlocks = [`研究: ${chips[chipId].name} +1`, ...(game.chipUnlocks ?? [])].slice(0, 6);
    addLog(game, `${captured.name}を研究し、${chips[chipId].name}を獲得。`);
  }

  game.captured = game.captured.filter((item) => item.uid !== capturedUid);
}

export function finishUpgrade(game) {
  const rewardChip = currentStage(game).reward?.chip;
  if (rewardChip) {
    game.chipBag[rewardChip] = (game.chipBag[rewardChip] ?? 0) + 1;
    game.chipUnlocks = [`報酬: ${chips[rewardChip].name} +1`, ...(game.chipUnlocks ?? [])].slice(0, 6);
  }
  if (game.stageIndex >= 2) {
    game.phase = 'victory';
    addLog(game, '三度の侵入を退け、魔王軍の勝利。');
    return;
  }
  game.stageIndex += 1;
  resetToSetup(game);
}
