export const rooms = [
  { id: 'entrance', name: '入口', type: 'spawn', capacity: 0, x: 80, y: 120, w: 150, h: 105, connections: ['hallA'] },
  { id: 'hallA', name: '通路A', type: 'hall', capacity: 1, x: 290, y: 120, w: 145, h: 105, connections: ['entrance', 'storage', 'atrium'] },
  { id: 'storage', name: '倉庫', type: 'side', capacity: 1, x: 290, y: 355, w: 150, h: 105, connections: ['hallA'] },
  { id: 'atrium', name: '広間', type: 'battle', capacity: 2, x: 520, y: 265, w: 180, h: 130, connections: ['hallA', 'jail', 'deadEnd', 'hallB'] },
  { id: 'jail', name: '牢屋', type: 'jail', capacity: 0, x: 520, y: 540, w: 155, h: 110, connections: ['atrium'] },
  { id: 'deadEnd', name: '行止', type: 'side', capacity: 1, x: 720, y: 515, w: 155, h: 105, connections: ['atrium'] },
  { id: 'hallB', name: '通路B', type: 'hall', capacity: 2, x: 765, y: 265, w: 155, h: 105, connections: ['atrium', 'treasure', 'throne'] },
  { id: 'treasure', name: '宝物庫', type: 'side', capacity: 1, x: 950, y: 120, w: 155, h: 105, connections: ['hallB'] },
  { id: 'throne', name: '魔王部屋', type: 'throne', capacity: 0, x: 970, y: 430, w: 170, h: 125, connections: ['hallB'] }
];

export const worldSize = { width: 1120, height: 680 };
export const roomById = Object.fromEntries(rooms.map((room) => [room.id, room]));
