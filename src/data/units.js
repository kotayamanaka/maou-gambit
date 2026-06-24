export const allyTemplates = {
  goblin: {
    id: 'goblin',
    name: 'ゴブリン',
    type: 'ally',
    role: 'balanced',
    sprite: 'assets/sprites/goblin.png',
    stats: { hp: 48, atk: 9, spd: 1.0, int: 3, carry: 1, range: 1 },
    traits: ['運搬可', '初期主力']
  },
  slime: {
    id: 'slime',
    name: 'スライム',
    type: 'ally',
    role: 'tank',
    sprite: 'assets/sprites/slime.png',
    stats: { hp: 68, atk: 5, spd: 0.65, int: 1, carry: 1, range: 1 },
    traits: ['運搬可', '鈍足付与']
  },
  bat: {
    id: 'bat',
    name: 'コウモリ',
    type: 'ally',
    role: 'scout',
    sprite: 'assets/sprites/bat.png',
    stats: { hp: 36, atk: 6, spd: 1.85, int: 1, carry: 0, range: 1 },
    traits: ['高速', '運搬不可']
  },
  fallenWarrior: {
    id: 'fallenWarrior',
    name: '堕ちた戦士',
    type: 'ally',
    role: 'bruiser',
    sprite: 'assets/sprites/fallen-warrior.png',
    stats: { hp: 54, atk: 8, spd: 0.75, int: 1, carry: 0, range: 1 },
    traits: ['高耐久']
  },
  shadeRunner: {
    id: 'shadeRunner',
    name: '影走り',
    type: 'ally',
    role: 'hunter',
    sprite: 'assets/sprites/shade-runner.png',
    stats: { hp: 26, atk: 5, spd: 1.7, int: 2, carry: 1, range: 1 },
    traits: ['高速', '捕獲補助']
  },
  darkMage: {
    id: 'darkMage',
    name: '闇術師',
    type: 'ally',
    role: 'caster',
    sprite: 'assets/sprites/dark-mage.png',
    stats: { hp: 24, atk: 6, spd: 0.75, int: 2, carry: 0, range: 3 },
    traits: ['遠距離']
  }
};

export const enemyTemplates = {
  warrior: {
    id: 'warrior',
    name: '戦士',
    type: 'enemy',
    sprite: 'assets/sprites/warrior.png',
    stats: { hp: 34, atk: 5, spd: 0.72, range: 1 },
    chips: ['engageGuard', 'exploreUnknown', 'seekThrone'],
    convertTo: 'fallenWarrior'
  },
  rogue: {
    id: 'rogue',
    name: '盗賊',
    type: 'enemy',
    sprite: 'assets/sprites/rogue.png',
    stats: { hp: 22, atk: 3, spd: 1.2, range: 1 },
    chips: ['engageGuard', 'exploreUnknown', 'seekThrone'],
    convertTo: 'shadeRunner'
  },
  mage: {
    id: 'mage',
    name: '魔法使い',
    type: 'enemy',
    sprite: 'assets/sprites/mage.png',
    stats: { hp: 20, atk: 4, spd: 0.62, range: 3 },
    chips: ['focusWeakAlly', 'exploreUnknown', 'seekThrone'],
    convertTo: 'darkMage'
  }
};

export const demonLord = {
  id: 'demonLord',
  name: '魔王',
  type: 'boss',
  sprite: 'assets/sprites/demon-lord.png',
  stats: { hp: 100, atk: 0, spd: 0, int: 0, carry: 0, range: 0 }
};
