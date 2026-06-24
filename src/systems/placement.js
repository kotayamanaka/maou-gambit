import { rooms, roomById } from '../data/rooms.js';

export function allyCountInRoom(game, roomId, exceptUnitId = null) {
  return game.allies.filter((ally) => ally.hp > 0 && ally.uid !== exceptUnitId && ally.room === roomId).length;
}

export function roomCapacity(roomId) {
  return roomById[roomId]?.capacity ?? 0;
}

export function canPlaceAlly(game, roomId, unit = null) {
  const room = roomById[roomId];
  if (!room || room.type === 'spawn' || room.type === 'throne' || room.type === 'jail') return false;
  return allyCountInRoom(game, roomId, unit?.uid) < roomCapacity(roomId);
}

export function firstOpenAllyRoom(game) {
  return rooms.find((room) => canPlaceAlly(game, room.id))?.id ?? 'atrium';
}
