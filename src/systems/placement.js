import { rooms, roomById } from '../data/rooms.js';

export function allyCountInRoom(game, roomId, exceptUnitId = null) {
  return game.allies.filter((ally) => ally.hp > 0 && ally.uid !== exceptUnitId && ally.room === roomId).length;
}

export function isRoomBuilt(game, roomId) {
  const room = roomById[roomId];
  if (!room) return false;
  return game.builtRooms?.has?.(roomId) ?? room.built !== false;
}

export function roomLevel(game, roomId) {
  return game.roomLevels?.[roomId] ?? 1;
}

export function roomCapacity(roomId, game = null) {
  const base = roomById[roomId]?.capacity ?? 0;
  if (!game) return base;
  return base + (game.roomCapacityBonus?.[roomId] ?? 0);
}

export function canPlaceAlly(game, roomId, unit = null) {
  const room = roomById[roomId];
  if (!room || room.type === 'spawn' || room.type === 'throne' || room.type === 'jail') return false;
  if (!isRoomBuilt(game, roomId)) return false;
  return allyCountInRoom(game, roomId, unit?.uid) < roomCapacity(roomId, game);
}

export function firstOpenAllyRoom(game) {
  return rooms.find((room) => canPlaceAlly(game, room.id))?.id ?? 'atrium';
}
