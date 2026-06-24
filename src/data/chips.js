export const chips = {
  chaseNearest: {
    id: 'chaseNearest',
    name: '近敵狙い',
    icon: '🎯',
    description: '同じ部屋で一番近い敵を狙う',
    condition: 'nearestEnemy',
    action: 'moveToTarget'
  },
  attack: {
    id: 'attack',
    name: '攻撃',
    icon: '⚔',
    description: '射程内の敵を攻撃する',
    condition: 'enemyInRange',
    action: 'attack'
  },
  focusWeak: {
    id: 'focusWeak',
    name: '弱敵狙い',
    icon: '🩸',
    description: '同じ部屋でHPが低い敵を優先する',
    condition: 'weakEnemy',
    action: 'moveToTarget'
  },
  focusMage: {
    id: 'focusMage',
    name: '術師狙い',
    icon: '✨',
    description: '同じ部屋の魔法使いを優先する',
    condition: 'mageEnemy',
    action: 'moveToTarget'
  },
  focusKnower: {
    id: 'focusKnower',
    name: '発見者狙い',
    icon: '❗',
    description: '同じ部屋で魔王部屋を知る敵を優先する',
    condition: 'knowsThroneEnemy',
    action: 'moveToTarget'
  },
  carryDowned: {
    id: 'carryDowned',
    name: '牢屋搬送',
    icon: '⛓',
    description: '同じ部屋のダウン敵を牢屋へ運ぶ',
    condition: 'downedEnemy',
    action: 'carryToJail'
  },
  returnAtrium: {
    id: 'returnAtrium',
    name: '広間帰還',
    icon: '↩',
    description: '対象がなければ広間へ戻る',
    condition: 'always',
    action: 'moveAtrium'
  },
  returnThrone: {
    id: 'returnThrone',
    name: '玉座前',
    icon: '🛡',
    description: '対象がなければ魔王部屋前へ戻る',
    condition: 'always',
    action: 'moveHallB'
  }
};

export const initialChipBag = {
  chaseNearest: 0,
  attack: 3,
  focusWeak: 0,
  focusMage: 0,
  focusKnower: 0,
  carryDowned: 1,
  returnAtrium: 1,
  returnThrone: 0
};
