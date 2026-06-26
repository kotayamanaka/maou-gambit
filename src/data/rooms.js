export const rooms = [
  {
    id: 'entrance',
    name: '入口',
    type: 'spawn',
    capacity: 0,
    x: 360,
    y: 630,
    w: 570,
    h: 390,
    built: true,
    connectionLimit: 1,
    connections: ['storage']
  },
  {
    id: 'hallA',
    name: '前通路',
    type: 'hall',
    capacity: 1,
    x: 1170,
    y: 630,
    w: 540,
    h: 390,
    built: false,
    buildCost: 140,
    connectionLimit: 4,
    upgradeCost: 120,
    connections: ['entrance', 'storage', 'atrium']
  },
  {
    id: 'storage',
    name: '物置',
    type: 'side',
    capacity: 1,
    x: 1170,
    y: 1680,
    w: 570,
    h: 390,
    built: true,
    connectionLimit: 2,
    upgradeCost: 90,
    connections: ['entrance', 'atrium']
  },
  {
    id: 'atrium',
    name: '広間',
    type: 'battle',
    capacity: 3,
    x: 2160,
    y: 1155,
    w: 720,
    h: 510,
    built: true,
    connectionLimit: 4,
    upgradeCost: 160,
    connections: ['storage', 'jail', 'throne']
  },
  {
    id: 'jail',
    name: '牢屋',
    type: 'jail',
    capacity: 0,
    x: 2160,
    y: 2205,
    w: 630,
    h: 435,
    built: true,
    connectionLimit: 1,
    upgradeCost: 180,
    connections: ['atrium']
  },
  {
    id: 'library',
    name: '禁書庫',
    type: 'research',
    capacity: 1,
    x: 2160,
    y: 285,
    w: 630,
    h: 405,
    built: false,
    connectionLimit: 1,
    buildCost: 210,
    upgradeCost: 160,
    effect: { kind: 'researchDiscount', value: 10 },
    risk: { kind: 'knowledgeLeak' },
    connections: ['atrium']
  },
  {
    id: 'deadEnd',
    name: '袋小路',
    type: 'side',
    capacity: 1,
    x: 3030,
    y: 2070,
    w: 615,
    h: 420,
    built: false,
    connectionLimit: 1,
    buildCost: 160,
    upgradeCost: 120,
    connections: ['atrium']
  },
  {
    id: 'nest',
    name: '魔物巣',
    type: 'barracks',
    capacity: 3,
    x: 3120,
    y: 375,
    w: 690,
    h: 450,
    built: false,
    connectionLimit: 2,
    buildCost: 190,
    upgradeCost: 150,
    effect: { kind: 'summonDiscount', value: 15 },
    risk: { kind: 'panic' },
    connections: ['atrium', 'treasure']
  },
  {
    id: 'hallB',
    name: '奥通路',
    type: 'hall',
    capacity: 2,
    x: 3240,
    y: 1155,
    w: 630,
    h: 420,
    built: false,
    buildCost: 150,
    connectionLimit: 4,
    upgradeCost: 150,
    connections: ['atrium', 'treasure', 'throne']
  },
  {
    id: 'treasure',
    name: '宝物庫',
    type: 'side',
    capacity: 1,
    x: 3960,
    y: 570,
    w: 630,
    h: 420,
    built: false,
    connectionLimit: 2,
    buildCost: 260,
    upgradeCost: 180,
    effect: { kind: 'inventoryLimit', value: 4 },
    risk: { kind: 'plunder' },
    connections: ['atrium']
  },
  {
    id: 'armory',
    name: '武具庫',
    type: 'side',
    capacity: 2,
    x: 3960,
    y: 2475,
    w: 645,
    h: 420,
    built: false,
    connectionLimit: 2,
    buildCost: 230,
    upgradeCost: 170,
    effect: { kind: 'allyAtkRoom', value: 1 },
    risk: { kind: 'armedInvader' },
    connections: ['atrium']
  },
  {
    id: 'throne',
    name: '魔王部屋',
    type: 'throne',
    capacity: 0,
    x: 4050,
    y: 1770,
    w: 690,
    h: 480,
    built: true,
    connectionLimit: 1,
    connections: ['atrium']
  }
];

export const worldSize = { width: 4620, height: 2700 };
export const roomById = Object.fromEntries(rooms.map((room) => [room.id, room]));

export const buildSlots = [
  { id: 'far-west-high', x: 570, y: 285 },
  { id: 'far-west-mid', x: 570, y: 1155 },
  { id: 'far-west-low', x: 570, y: 2070 },
  { id: 'north-west', x: 1170, y: 285 },
  { id: 'west', x: 1170, y: 1155 },
  { id: 'north', x: 2160, y: 285 },
  { id: 'center-low', x: 2160, y: 1680 },
  { id: 'south', x: 2160, y: 2475 },
  { id: 'north-east', x: 3120, y: 375 },
  { id: 'west-low', x: 1170, y: 1680 },
  { id: 'east-high', x: 3240, y: 735 },
  { id: 'east-low', x: 3240, y: 1680 },
  { id: 'east-far-mid', x: 3960, y: 1410 },
  { id: 'far-east-high', x: 3960, y: 570 },
  { id: 'far-east-low', x: 3960, y: 2475 }
];

export const doorSides = ['north', 'east', 'south', 'west'];

export const doorSideLabels = {
  north: '北扉',
  east: '東扉',
  south: '南扉',
  west: '西扉'
};

export function doorSideLabel(side) {
  return doorSideLabels[side] ?? side;
}

export const buildSlotLabels = {
  'far-west-high': '西端上',
  'far-west-mid': '西端中',
  'far-west-low': '西端下',
  'north-west': '北西',
  west: '西',
  north: '北',
  'center-low': '中央下',
  south: '南',
  'north-east': '北東',
  'west-low': '西下',
  'east-high': '東上',
  'east-low': '東下',
  'east-far-mid': '東端中',
  'far-east-high': '東端上',
  'far-east-low': '東端下'
};

export function buildSlotLabel(slotId) {
  return buildSlotLabels[slotId] ?? slotId;
}

export function roomView(game, roomId) {
  const room = roomById[roomId];
  if (!room) return null;
  return { ...room, ...(game?.roomPositions?.[roomId] ?? {}) };
}

export function roomViews(game) {
  return rooms.map((room) => roomView(game, room.id));
}

export function slotTaken(game, slotId) {
  const slot = buildSlots.find((item) => item.id === slotId);
  if (!slot) return true;
  return Object.values(game?.roomPositions ?? {}).some((position) => position.slotId === slotId)
    || rooms.some((room) => room.built && room.x === slot.x && room.y === slot.y);
}

function rectFor(room, margin = 0) {
  return {
    left: room.x - room.w / 2 - margin,
    right: room.x + room.w / 2 + margin,
    top: room.y - room.h / 2 - margin,
    bottom: room.y + room.h / 2 + margin
  };
}

function rectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function roomAtBuildSlot(roomId, slotId) {
  const room = roomById[roomId];
  const slot = buildSlots.find((item) => item.id === slotId);
  if (!room || !slot) return null;
  return { ...room, x: slot.x, y: slot.y };
}

export function roomCollidesAtSlot(game, roomId, slotId, margin = 72) {
  const candidate = roomAtBuildSlot(roomId, slotId);
  if (!candidate) return true;
  const candidateRect = rectFor(candidate, margin);
  return roomViews(game)
    .filter((room) => room.id !== roomId && (room.built || game?.builtRooms?.has?.(room.id)))
    .some((room) => rectsOverlap(candidateRect, rectFor(room, margin)));
}

export function buildSlotBlocked(game, slotId, roomId = null) {
  if (slotTaken(game, slotId)) return true;
  return roomId ? roomCollidesAtSlot(game, roomId, slotId) : false;
}

function directionFromDelta(dx, dy) {
  const horizontal = Math.abs(dx) > 220 ? (dx > 0 ? '東' : '西') : '';
  const vertical = Math.abs(dy) > 220 ? (dy > 0 ? '南' : '北') : '';
  return `${vertical}${horizontal}` || '隣接';
}

function distanceLabel(distance) {
  if (distance < 760) return '近距離';
  if (distance < 1260) return '中距離';
  return '遠距離';
}

export function buildSlotRelation(game, slotId, fromRoomId = 'atrium') {
  const slot = buildSlots.find((item) => item.id === slotId);
  const from = roomView(game, fromRoomId);
  if (!slot || !from) {
    return {
      label: buildSlotLabel(slotId),
      direction: buildSlotLabel(slotId),
      distance: '',
      description: '配置点'
    };
  }
  const dx = slot.x - from.x;
  const dy = slot.y - from.y;
  const distance = Math.hypot(dx, dy);
  const direction = directionFromDelta(dx, dy);
  return {
    label: buildSlotLabel(slotId),
    direction,
    distance: distanceLabel(distance),
    description: `${from.name}から${direction} / ${distanceLabel(distance)}`
  };
}

export function connectionKey(a, b) {
  return [a, b].sort().join('::');
}

export function doorPoint(room, side) {
  if (side === 'north') return { x: room.x, y: room.y - room.h / 2 };
  if (side === 'south') return { x: room.x, y: room.y + room.h / 2 };
  if (side === 'east') return { x: room.x + room.w / 2, y: room.y };
  return { x: room.x - room.w / 2, y: room.y };
}

export function autoDoorSide(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'east' : 'west';
  return dy >= 0 ? 'south' : 'north';
}

export function connectionDoorSide(game, from, to) {
  return game?.roomConnectionDoors?.[connectionKey(from.id, to.id)]?.[from.id] ?? autoDoorSide(from, to);
}
