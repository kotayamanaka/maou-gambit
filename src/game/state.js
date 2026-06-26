import { allyTemplates, demonLord } from '../data/units.js';
import { initialChipBag } from '../data/chips.js';
import { stages } from '../data/stages.js';
import { rooms, roomView } from '../data/rooms.js';

let nextId = 1;

function initialRoomConnections() {
  const built = new Set(rooms.filter((room) => room.built).map((room) => room.id));
  const entries = rooms.map((room) => [
    room.id,
    built.has(room.id) ? room.connections.filter((target) => built.has(target)) : []
  ]);
  return Object.fromEntries(entries);
}

function initialUnitPoint(roomId, slot = 0) {
  const room = roomView(null, roomId);
  const lane = [-0.18, 0.18, 0, -0.34, 0.34][slot % 5];
  return {
    x: room.x + room.w * 0.28,
    y: room.y + lane * room.h * 0.5
  };
}

function unitFromTemplate(template, room, chips = [], slot = 0) {
  const point = initialUnitPoint(room, slot);
  return {
    uid: `${template.id}-${nextId++}`,
    templateId: template.id,
    name: template.name,
    type: template.type,
    role: template.role,
    sprite: template.sprite,
    spriteSet: template.spriteSet ? structuredClone(template.spriteSet) : null,
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
    skills: [...(template.skills ?? [])],
    traits: [...(template.traits ?? [])],
    room,
    homeRoom: room,
    x: point.x,
    y: point.y,
    facing: 'front',
    anim: 'idle',
    animTtl: 0,
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
    unitFromTemplate(allyTemplates.goblin, 'atrium', ['chaseNearest', 'attack', 'carryDowned'], 0),
    unitFromTemplate(allyTemplates.slime, 'atrium', ['chaseNearest', 'attack'], 1)
  ];

  return {
    phase: 'setup',
    stageIndex: 0,
    speed: 1,
    selectedUnitId: allies[0].uid,
    selectedRoomId: 'atrium',
    selectedChipId: 'attack',
    selectedCapturedId: null,
    uiPanel: 'unit',
    showLog: true,
    camera: null,
    selectedEntity: { type: 'ally', id: allies[0].uid },
    elapsed: 0,
    log: ['魔王軍、配置待機。'],
    chipBag: { ...initialChipBag },
    chipUnlocks: ['接近 x2', '攻撃 x2', '牢屋搬送 x1'],
    collections: {
      allies: new Set(allies.map((ally) => ally.templateId)),
      enemies: new Set(),
      chips: new Set(Object.entries(initialChipBag).filter(([, count]) => count > 0).map(([id]) => id))
    },
    gold: 40,
    inventory: {},
    lootLog: [],
    builtRooms: new Set(rooms.filter((room) => room.built).map((room) => room.id)),
    roomPositions: Object.fromEntries(rooms.filter((room) => room.built).map((room) => [
      room.id,
      { x: room.x, y: room.y, slotId: `initial-${room.id}` }
    ])),
    roomLevels: Object.fromEntries(rooms.map((room) => [room.id, 1])),
    roomCapacityBonus: {},
    roomConnections: initialRoomConnections(),
    selectedBuildFrom: 'atrium',
    selectedBuildSlot: 'north',
    roomObjects: {},
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
    unit.routeTarget = null;
    unit.routePoints = null;
  });
  game.demonLord.hp = game.demonLord.maxHp;
  addLog(game, `${currentStage(game).name}、侵入開始。`);
}

export function resetToSetup(game) {
  game.phase = 'setup';
  game.enemies = [];
  game.downed = [];
  game.effects = [];
  const roomSlots = new Map();
  game.allies.forEach((unit) => {
    const room = unit.homeRoom ?? unit.room;
    const slot = roomSlots.get(room) ?? 0;
    roomSlots.set(room, slot + 1);
    unit.room = room;
    const position = initialUnitPoint(room, slot);
    unit.x = position.x;
    unit.y = position.y;
    unit.anim = 'idle';
    unit.animTtl = 0;
    unit.movingTo = null;
    unit.routeTarget = null;
    unit.routePoints = null;
    unit.carrying = null;
  });
  addLog(game, '次の侵入に備えて再配置。');
}
