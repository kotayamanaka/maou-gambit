export const rooms = [
  {
    id: 'entrance',
    name: '入口',
    type: 'spawn',
    capacity: 0,
    x: 120,
    y: 210,
    w: 190,
    h: 130,
    built: true,
    connections: ['hallA']
  },
  {
    id: 'hallA',
    name: '前通路',
    type: 'hall',
    capacity: 1,
    x: 390,
    y: 210,
    w: 180,
    h: 130,
    built: true,
    upgradeCost: 120,
    connections: ['entrance', 'storage', 'atrium']
  },
  {
    id: 'storage',
    name: '物置',
    type: 'side',
    capacity: 1,
    x: 390,
    y: 560,
    w: 190,
    h: 130,
    built: true,
    upgradeCost: 90,
    connections: ['hallA']
  },
  {
    id: 'atrium',
    name: '広間',
    type: 'battle',
    capacity: 2,
    x: 720,
    y: 385,
    w: 240,
    h: 170,
    built: true,
    upgradeCost: 160,
    connections: ['hallA', 'jail', 'deadEnd', 'hallB']
  },
  {
    id: 'jail',
    name: '牢屋',
    type: 'jail',
    capacity: 0,
    x: 720,
    y: 735,
    w: 210,
    h: 145,
    built: true,
    upgradeCost: 180,
    connections: ['atrium']
  },
  {
    id: 'deadEnd',
    name: '袋小路',
    type: 'side',
    capacity: 1,
    x: 1010,
    y: 690,
    w: 205,
    h: 140,
    built: false,
    buildCost: 160,
    upgradeCost: 120,
    connections: ['atrium']
  },
  {
    id: 'hallB',
    name: '奥通路',
    type: 'hall',
    capacity: 2,
    x: 1080,
    y: 385,
    w: 210,
    h: 140,
    built: false,
    buildCost: 220,
    upgradeCost: 150,
    connections: ['atrium', 'treasure', 'throne']
  },
  {
    id: 'treasure',
    name: '宝物庫',
    type: 'side',
    capacity: 1,
    x: 1320,
    y: 190,
    w: 210,
    h: 140,
    built: false,
    buildCost: 260,
    upgradeCost: 180,
    connections: ['hallB']
  },
  {
    id: 'throne',
    name: '魔王部屋',
    type: 'throne',
    capacity: 0,
    x: 1350,
    y: 590,
    w: 230,
    h: 160,
    built: true,
    connections: ['hallB']
  }
];

export const worldSize = { width: 1540, height: 900 };
export const roomById = Object.fromEntries(rooms.map((room) => [room.id, room]));

