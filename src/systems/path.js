import { roomById } from '../data/rooms.js';

export function roomConnections(game, roomId) {
  return game?.roomConnections?.[roomId] ?? roomById[roomId]?.connections ?? [];
}

export function connectionCount(game, roomId) {
  return roomConnections(game, roomId).length;
}

export function canConnectRoom(game, roomId) {
  const room = roomById[roomId];
  if (!room) return false;
  return connectionCount(game, roomId) < (room.connectionLimit ?? 4);
}

export function shortestPath(from, to, game = null) {
  if (from === to) return [from];
  const queue = [[from]];
  const seen = new Set([from]);
  while (queue.length) {
    const path = queue.shift();
    const last = path[path.length - 1];
    for (const next of roomConnections(game, last)) {
      if (seen.has(next)) continue;
      const nextPath = [...path, next];
      if (next === to) return nextPath;
      seen.add(next);
      queue.push(nextPath);
    }
  }
  return [from];
}

export function distanceRooms(from, to, game = null) {
  return Math.max(0, shortestPath(from, to, game).length - 1);
}

export function nextStep(from, to, game = null) {
  const path = shortestPath(from, to, game);
  return path[1] ?? from;
}

export function nearestRoom(from, roomIds, game = null) {
  return [...roomIds].sort((a, b) => distanceRooms(from, a, game) - distanceRooms(from, b, game))[0];
}
