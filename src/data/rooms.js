export const rooms = [
  { id: 'entrance', name: '入口', type: 'spawn', x: 7, y: 4, connections: ['hallA'] },
  { id: 'hallA', name: '通路A', type: 'hall', x: 24, y: 4, connections: ['entrance', 'storage', 'atrium'] },
  { id: 'storage', name: '倉庫', type: 'side', x: 24, y: 24, connections: ['hallA'] },
  { id: 'atrium', name: '広間', type: 'battle', x: 43, y: 16, connections: ['hallA', 'jail', 'deadEnd', 'hallB'] },
  { id: 'jail', name: '牢屋', type: 'jail', x: 42, y: 37, connections: ['atrium'] },
  { id: 'deadEnd', name: '行止', type: 'side', x: 60, y: 36, connections: ['atrium'] },
  { id: 'hallB', name: '通路B', type: 'hall', x: 62, y: 16, connections: ['atrium', 'treasure', 'throne'] },
  { id: 'treasure', name: '宝物庫', type: 'side', x: 79, y: 5, connections: ['hallB'] },
  { id: 'throne', name: '魔王部屋', type: 'throne', x: 82, y: 27, connections: ['hallB'] }
];

export const roomById = Object.fromEntries(rooms.map((room) => [room.id, room]));
