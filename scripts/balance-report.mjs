import { createGame, startStage } from '../src/game/state.js';
import { tickBattle } from '../src/systems/simulation.js';
import { stages } from '../src/data/stages.js';
import { consumeCaptured, finishUpgrade, researchMonster } from '../src/systems/progression.js';
import { chips } from '../src/data/chips.js';
import { roomById } from '../src/data/rooms.js';
import { canPlaceAlly } from '../src/systems/placement.js';

function runStage(stageIndex) {
  const game = createGame();
  game.stageIndex = stageIndex;
  startStage(game);
  return runBattle(game);
}

function runBattle(game) {
  for (let frame = 0; frame < 5000 && game.phase === 'battle'; frame += 1) {
    tickBattle(game, 0.1);
  }
  return {
    stage: stages[game.stageIndex].name,
    phase: game.phase,
    won: game.result?.won ?? false,
    elapsed: game.result?.elapsed ?? Math.round(game.elapsed),
    defeated: game.defeated,
    captured: game.captured.length,
    downed: game.downed.length,
    enemiesLeft: game.enemies.length,
    lordHp: game.demonLord.hp,
    allyDamage: game.metrics.allyDamage,
    enemyDamage: game.metrics.enemyDamage,
    lordDamage: game.metrics.lordDamage,
    allies: game.allies.map((unit) => ({
      name: unit.name,
      hp: unit.hp,
      room: unit.room,
      chips: unit.chips
    }))
  };
}

function assignedChipCounts(game) {
  const counts = {};
  for (const unit of game.allies) {
    for (const chipId of unit.chips) counts[chipId] = (counts[chipId] ?? 0) + 1;
  }
  return counts;
}

function equipChipIfAvailable(game, unit, chipId) {
  if (!unit || unit.chips.includes(chipId) || unit.chips.length >= unit.int) return;
  const counts = assignedChipCounts(game);
  if ((game.chipBag[chipId] ?? 0) - (counts[chipId] ?? 0) > 0) unit.chips.push(chipId);
}

function equipIfAvailable(game, unitName, chipId) {
  equipChipIfAvailable(game, game.allies.find((ally) => ally.name === unitName), chipId);
}

function autoEquipAllies(game) {
  for (const unit of game.allies) {
    const priorities = [
      'chaseNearest',
      'attack',
      unit.carry > 0 ? 'carryDowned' : null,
      unit.range > 1 ? 'focusRanged' : 'focusWeak',
      'focusMage',
      'returnHome'
    ].filter(Boolean);
    for (const chipId of priorities) equipChipIfAvailable(game, unit, chipId);
  }
}

function placeCampaignAllies(game) {
  const preferredRooms = ['atrium', 'hallB', 'hallA', 'storage'];
  for (const unit of game.allies) {
    const roomId = preferredRooms.find((room) => canPlaceAlly(game, room, unit));
    if (!roomId) continue;
    unit.room = roomId;
    unit.homeRoom = roomId;
    unit.x = roomById[roomId].x;
    unit.y = roomById[roomId].y;
    unit.movingTo = null;
  }
}

function autoUpgrade(game) {
  const goblin = game.allies.find((ally) => ally.name === 'ゴブリン');
  const captured = [...game.captured];
  const targetRoster = Math.min(4, game.stageIndex + 2);
  captured.forEach((item, index) => {
    if (index === 0 && goblin) consumeCaptured(game, item.uid, 'feed', goblin.uid);
    else if (game.allies.length < targetRoster && item.convertTo) consumeCaptured(game, item.uid, 'convert', goblin?.uid);
    else consumeCaptured(game, item.uid, 'research', goblin?.uid);
  });
  finishUpgrade(game);
  while (game.allies.length < Math.min(4, game.stageIndex + 1) && researchMonster(game)) {
    // Keep the campaign verifier close to an eager player who spends early gold on roster growth.
  }
  equipIfAvailable(game, 'ゴブリン', 'focusWeak');
  equipIfAvailable(game, 'コウモリ', 'focusMage');
  equipIfAvailable(game, 'スライム', 'focusKnower');
  autoEquipAllies(game);
  placeCampaignAllies(game);
}

function runCampaign() {
  const game = createGame();
  const results = [];
  while (game.phase !== 'victory' && game.phase !== 'defeat') {
    startStage(game);
    const result = runBattle(game);
    results.push(result);
    if (!result.won) break;
    game.phase = 'upgrade';
    autoUpgrade(game);
  }
  return {
    won: game.phase === 'victory',
    phase: game.phase,
    chipBag: Object.fromEntries(Object.entries(game.chipBag).filter(([, count]) => count > 0).map(([id, count]) => [chips[id]?.name ?? id, count])),
    allies: game.allies.map((unit) => ({
      name: unit.name,
      level: unit.level,
      exp: unit.exp,
      intExp: unit.intExp,
      hp: unit.hp,
      maxHp: unit.maxHp,
      atk: unit.atk,
      int: unit.int,
      chips: unit.chips.map((id) => chips[id]?.name ?? id)
    })),
    results
  };
}

const results = stages.map((_, index) => runStage(index));
const wins = results.filter((result) => result.won).length;
console.log(JSON.stringify({
  rawStageChecks: {
    runs: results.length,
    winRate: wins / results.length,
    avgCaptured: results.reduce((sum, result) => sum + result.captured, 0) / results.length,
    avgLordDamage: results.reduce((sum, result) => sum + result.lordDamage, 0) / results.length,
    results
  },
  campaign: runCampaign()
}, null, 2));
