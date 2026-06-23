import { allyTemplates } from '../data/units.js';
import { chips } from '../data/chips.js';
import { currentStage, addLog, resetToSetup } from '../game/state.js';
import { roomById } from '../data/rooms.js';

export function consumeCaptured(game, capturedUid, mode, targetUid) {
  const captured = game.captured.find((item) => item.uid === capturedUid);
  if (!captured) return;

  if (mode === 'convert') {
    const template = allyTemplates[captured.convertTo];
    if (template) {
      const unit = {
        uid: `${template.id}-${Date.now()}`,
        templateId: template.id,
        name: template.name,
        type: template.type,
        role: template.role,
        sprite: template.sprite,
        maxHp: template.stats.hp,
        hp: template.stats.hp,
        atk: template.stats.atk,
        spd: template.stats.spd,
        int: template.stats.int,
        carry: template.stats.carry,
        range: template.stats.range,
        traits: [...template.traits],
        room: 'atrium',
        x: roomById.atrium.x,
        y: roomById.atrium.y,
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
    target.maxHp += 8;
    target.hp = target.maxHp;
    target.atk += 1;
    if (target.int < 4 && captured.templateId === 'mage') target.int += 1;
    addLog(game, `${captured.name}を養分化し、${target.name}を強化。`);
  }

  if (mode === 'research') {
    const candidates = Object.keys(chips).filter((id) => (game.chipBag[id] ?? 0) < 3);
    const chipId = candidates[Math.floor(Math.random() * candidates.length)] ?? 'attack';
    game.chipBag[chipId] = (game.chipBag[chipId] ?? 0) + 1;
    addLog(game, `${captured.name}を研究し、${chips[chipId].name}を獲得。`);
  }

  game.captured = game.captured.filter((item) => item.uid !== capturedUid);
}

export function finishUpgrade(game) {
  if (game.stageIndex >= 2) {
    game.phase = 'victory';
    addLog(game, '三度の侵入を退け、魔王軍の勝利。');
    return;
  }
  game.stageIndex += 1;
  const rewardChip = currentStage(game).reward?.chip;
  if (rewardChip) game.chipBag[rewardChip] = (game.chipBag[rewardChip] ?? 0) + 1;
  resetToSetup(game);
}
