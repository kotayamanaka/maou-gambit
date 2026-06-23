import { roomById } from '../data/rooms.js';

export function shortestPath(from, to) {
  if (from === to) return [from];
  const queue = [[from]];
  const seen = new Set([from]);
  while (queue.length) {
    const path = queue.shift();
    const last = path[path.length - 1];
    for (const next of roomById[last].connections) {
      if (seen.has(next)) continue;
      const nextPath = [...path, next];
      if (next === to) return nextPath;
      seen.add(next);
      queue.push(nextPath);
    }
  }
  return [from];
}

export function distanceRooms(from, to) {
  return Math.max(0, shortestPath(from, to).length - 1);
}

export function nextStep(from, to) {
  const path = shortestPath(from, to);
  return path[1] ?? from;
}

export function nearestRoom(from, roomIds) {
  return [...roomIds].sort((a, b) => distanceRooms(from, a) - distanceRooms(from, b))[0];
}
