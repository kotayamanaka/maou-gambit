import { allyTemplates, demonLord } from '../data/units.js';
import { initialChipBag } from '../data/chips.js';
import { stages } from '../data/stages.js';
import { roomById } from '../data/rooms.js';

let nextId = 1;

function unitFromTemplate(template, room, chips = []) {
  const start = roomById[room];
  return {
    uid: `${template.id}-${nextId++}`,
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
    int: template.stats.int ?? 0,
    carry: template.stats.carry ?? 0,
    range: template.stats.range,
    traits: [...(template.traits ?? [])],
    room,
    homeRoom: room,
    x: start.x,
    y: start.y,
    movingTo: null,
    chips,
    moveClock: 0,
    attackClock: 0,
    carrying: null,
    status: []
  };
}

export function createGame() {
  nextId = 1;
  const allies = [
    unitFromTemplate(allyTemplates.goblin, 'atrium', ['carryDowned', 'attack']),
    unitFromTemplate(allyTemplates.slime, 'hallB', ['attack']),
    unitFromTemplate(allyTemplates.bat, 'hallA', ['attack'])
  ];

  return {
    phase: 'setup',
    stageIndex: 0,
    speed: 1,
    selectedUnitId: allies[0].uid,
    selectedRoomId: 'atrium',
    selectedChipId: 'attack',
    selectedCapturedId: null,
    showLog: true,
    camera: { zoom: 0.78, x: 16, y: 16 },
    selectedEntity: { type: 'ally', id: allies[0].uid },
    elapsed: 0,
    log: ['魔王軍、配置待機。'],
    chipBag: { ...initialChipBag },
    chipUnlocks: ['攻撃 x3', '牢屋搬送 x1'],
    gold: 40,
    inventory: {},
    lootLog: [],
    allies,
    enemies: [],
    downed: [],
    captured: [],
    defeated: 0,
    escaped: 0,
    partyKnowledge: { throneKnown: false, visited: new Set(['entrance']) },
    waveQueue: [],
    result: null,
    demonLord: unitFromTemplate(demonLord, 'throne', []),
    metrics: { allyDamage: 0, enemyDamage: 0, lordDamage: 0 },
    effects: []
  };
}

export function currentStage(game) {
  return stages[game.stageIndex];
}

export function addLog(game, text) {
  game.log = [text, ...game.log].slice(0, 5);
}

export function startStage(game) {
  game.phase = 'battle';
  game.elapsed = 0;
  game.enemies = [];
  game.downed = [];
  game.captured = [];
  game.defeated = 0;
  game.escaped = 0;
  game.result = null;
  game.metrics = { allyDamage: 0, enemyDamage: 0, lordDamage: 0 };
  game.lootLog = [];
  game.partyKnowledge = { throneKnown: false, visited: new Set(['entrance']) };
  game.waveQueue = currentStage(game).waves.flat().map((spawn, index) => ({ ...spawn, id: `${spawn.kind}-${index}`, spawned: false }));
  game.allies.forEach((unit) => {
    unit.hp = unit.maxHp;
    unit.carrying = null;
    unit.moveClock = 0;
    unit.attackClock = 0;
  });
  game.demonLord.hp = game.demonLord.maxHp;
  addLog(game, `${currentStage(game).name}、侵入開始。`);
}

export function resetToSetup(game) {
  game.phase = 'setup';
  game.enemies = [];
  game.downed = [];
  game.effects = [];
  game.allies.forEach((unit) => {
    const room = unit.homeRoom ?? unit.room;
    unit.room = room;
    unit.x = roomById[room].x;
    unit.y = roomById[room].y;
    unit.movingTo = null;
    unit.carrying = null;
  });
  addLog(game, '次の侵入に備えて再配置。');
}
