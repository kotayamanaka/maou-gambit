export const chips = {
  chaseNearest: {
    id: 'chaseNearest',
    name: '接近',
    icon: '🎯',
    category: 'target',
    description: '同じ部屋で一番近い敵へ近づく',
    condition: 'nearestEnemy',
    action: 'moveToTarget'
  },
  attack: {
    id: 'attack',
    name: '攻撃',
    icon: '⚔',
    category: 'attack',
    description: '射程内の敵を攻撃する',
    condition: 'enemyInRange',
    action: 'attack'
  },
  focusWeak: {
    id: 'focusWeak',
    name: '弱敵狙い',
    icon: '🩸',
    category: 'target',
    description: '同じ部屋でHPが低い敵を優先する',
    condition: 'weakEnemy',
    action: 'moveToTarget'
  },
  focusMage: {
    id: 'focusMage',
    name: '術師狙い',
    icon: '✨',
    category: 'target',
    description: '同じ部屋の魔法使いを優先する',
    condition: 'mageEnemy',
    action: 'moveToTarget'
  },
  focusKnower: {
    id: 'focusKnower',
    name: '発見者狙い',
    icon: '❗',
    category: 'target',
    description: '同じ部屋で魔王部屋を知る敵を優先する',
    condition: 'knowsThroneEnemy',
    action: 'moveToTarget'
  },
  focusRanged: {
    id: 'focusRanged',
    name: '遠隔狙い',
    icon: '🏹',
    category: 'target',
    description: '同じ部屋の遠距離職を優先する',
    condition: 'rangedEnemy',
    action: 'moveToTarget'
  },
  focusRare: {
    id: 'focusRare',
    name: '希少狙い',
    icon: '◇',
    category: 'target',
    description: '同じ部屋の捕獲が難しい敵を優先する',
    condition: 'rareEnemy',
    action: 'moveToTarget'
  },
  carryDowned: {
    id: 'carryDowned',
    name: '牢屋搬送',
    icon: '⛓',
    category: 'capture',
    description: '同じ部屋のダウン敵を牢屋へ運び、配置部屋へ戻る',
    condition: 'downedEnemy',
    action: 'carryToJail'
  },
  returnHome: {
    id: 'returnHome',
    name: '配置帰還',
    icon: '↩',
    category: 'move',
    description: '対象がなければ配置部屋へ戻る',
    condition: 'always',
    action: 'returnHome'
  },
  returnThrone: {
    id: 'returnThrone',
    name: '玉座前',
    icon: '🛡',
    category: 'move',
    description: '対象がなければ魔王部屋前へ戻る',
    condition: 'always',
    action: 'moveHallB'
  }
};

export const chipCategories = {
  attack: { id: 'attack', name: '攻撃', icon: '⚔' },
  target: { id: 'target', name: '攻撃対象', icon: '🎯' },
  move: { id: 'move', name: '移動', icon: '↩' },
  capture: { id: 'capture', name: '捕獲', icon: '⛓' }
};

export const initialChipBag = {
  chaseNearest: 1,
  attack: 1,
  focusWeak: 0,
  focusMage: 0,
  focusKnower: 0,
  focusRanged: 0,
  focusRare: 0,
  carryDowned: 1,
  returnHome: 0,
  returnThrone: 0
};
