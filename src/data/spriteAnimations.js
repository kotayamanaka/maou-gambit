const animatedUnits = [
  'alchemist',
  'bat',
  'beastTamer',
  'boneGuard',
  'cleric',
  'darkMage',
  'darkSlime',
  'fallenWarrior',
  'goblin',
  'guard',
  'hero',
  'impArcher',
  'knight',
  'mage',
  'oracleShade',
  'paladin',
  'poisonSlime',
  'ranger',
  'rogue',
  'sage',
  'shadeRunner',
  'slime',
  'warrior'
];
const directions = ['front', 'back', 'left', 'right'];

function actionFrames(unitId, action, direction, count) {
  return Array.from({ length: count }, (_, index) => `assets/sprites/${unitId}/${action}-${direction}-${index}.png`);
}

function unitFrames(unitId) {
  return {
    walk: Object.fromEntries(directions.map((direction) => [direction, actionFrames(unitId, 'walk', direction, 3)])),
    attack: Object.fromEntries(directions.map((direction) => [direction, actionFrames(unitId, 'attack', direction, 2)]))
  };
}

export const spriteAnimations = Object.fromEntries(animatedUnits.map((unitId) => [unitId, unitFrames(unitId)]));
