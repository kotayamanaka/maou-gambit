export const chips = {
  chaseNearest: {
    id: 'chaseNearest',
    name: '近敵追跡',
    icon: '🎯',
    description: '一番近い敵へ向かう',
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
    description: 'HPが低い敵を優先して狙う',
    condition: 'weakEnemy',
    action: 'moveToTarget'
  },
  focusMage: {
    id: 'focusMage',
    name: '術師狙い',
    icon: '✨',
    description: '魔法使いを優先して狙う',
    condition: 'mageEnemy',
    action: 'moveToTarget'
  },
  focusKnower: {
    id: 'focusKnower',
    name: '発見者狙い',
    icon: '❗',
    description: '魔王部屋を知っている敵を優先する',
    condition: 'knowsThroneEnemy',
    action: 'moveToTarget'
  },
  carryDowned: {
    id: 'carryDowned',
    name: '牢屋搬送',
    icon: '⛓',
    description: 'ダウン敵を牢屋へ運ぶ',
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
  chaseNearest: 2,
  attack: 3,
  focusWeak: 1,
  focusMage: 1,
  focusKnower: 1,
  carryDowned: 1,
  returnAtrium: 1,
  returnThrone: 1
};
