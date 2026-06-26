export const stages = [
  {
    id: 1,
    name: '第一侵入隊',
    waves: [
      [{ kind: 'warrior', delay: 0 }, { kind: 'rogue', delay: 7 }]
    ],
    reward: { chips: ['focusWeak', 'chaseNearest', 'attack'], gold: 30 }
  },
  {
    id: 2,
    name: '偵察混成隊',
    waves: [
      [{ kind: 'rogue', delay: 0 }, { kind: 'rogue', delay: 3 }, { kind: 'warrior', delay: 7 }, { kind: 'mage', delay: 12 }]
    ],
    reward: { chips: ['focusMage', 'attack'], gold: 36 }
  },
  {
    id: 3,
    name: '盾兵の試し',
    waves: [
      [{ kind: 'guard', delay: 0 }, { kind: 'warrior', delay: 5 }, { kind: 'rogue', delay: 10 }]
    ],
    reward: { chip: 'returnHome', gold: 42 }
  },
  {
    id: 4,
    name: '遠矢の巡回',
    waves: [
      [{ kind: 'ranger', delay: 0 }, { kind: 'rogue', delay: 4 }, { kind: 'ranger', delay: 10 }, { kind: 'mage', delay: 16 }]
    ],
    reward: { chip: 'focusRanged', gold: 48 }
  },
  {
    id: 5,
    name: '回復祈祷班',
    waves: [
      [{ kind: 'cleric', delay: 0 }, { kind: 'warrior', delay: 5 }, { kind: 'guard', delay: 12 }, { kind: 'cleric', delay: 20 }]
    ],
    reward: { chip: 'chaseNearest', gold: 54 }
  },
  {
    id: 6,
    name: '第二偵察隊',
    waves: [
      [{ kind: 'rogue', delay: 0 }, { kind: 'ranger', delay: 3 }, { kind: 'rogue', delay: 7 }, { kind: 'mage', delay: 13 }, { kind: 'guard', delay: 20 }]
    ],
    reward: { chip: 'carryDowned', gold: 60 }
  },
  {
    id: 7,
    name: '騎士見習い隊',
    waves: [
      [{ kind: 'knight', delay: 0 }, { kind: 'warrior', delay: 7 }, { kind: 'guard', delay: 14 }, { kind: 'ranger', delay: 22 }]
    ],
    reward: { chip: 'focusRare', gold: 68 }
  },
  {
    id: 8,
    name: '錬金調査団',
    waves: [
      [{ kind: 'alchemist', delay: 0 }, { kind: 'mage', delay: 6 }, { kind: 'guard', delay: 12 }, { kind: 'alchemist', delay: 20 }]
    ],
    reward: { chip: 'focusMage', gold: 76 }
  },
  {
    id: 9,
    name: '獣使いの狩場',
    waves: [
      [{ kind: 'beastTamer', delay: 0 }, { kind: 'rogue', delay: 5 }, { kind: 'ranger', delay: 11 }, { kind: 'beastTamer', delay: 19 }]
    ],
    reward: { chip: 'returnThrone', gold: 84 }
  },
  {
    id: 10,
    name: '聖騎士の踏査',
    waves: [
      [{ kind: 'paladin', delay: 0 }, { kind: 'cleric', delay: 8 }, { kind: 'knight', delay: 18 }]
    ],
    reward: { chip: 'focusRare', gold: 96 }
  },
  {
    id: 11,
    name: '夜襲斥候隊',
    waves: [
      [{ kind: 'rogue', delay: 0 }, { kind: 'rogue', delay: 3 }, { kind: 'ranger', delay: 6 }, { kind: 'ranger', delay: 12 }, { kind: 'alchemist', delay: 20 }]
    ],
    reward: { chip: 'focusWeak', gold: 108 }
  },
  {
    id: 12,
    name: '賢者の下見',
    waves: [
      [{ kind: 'sage', delay: 0 }, { kind: 'guard', delay: 8 }, { kind: 'mage', delay: 16 }, { kind: 'cleric', delay: 24 }]
    ],
    reward: { chip: 'focusRanged', gold: 120 }
  },
  {
    id: 13,
    name: '鉄壁小隊',
    waves: [
      [{ kind: 'guard', delay: 0 }, { kind: 'knight', delay: 6 }, { kind: 'paladin', delay: 14 }, { kind: 'guard', delay: 26 }]
    ],
    reward: { chip: 'carryDowned', gold: 132 }
  },
  {
    id: 14,
    name: '魔法学院の査察',
    waves: [
      [{ kind: 'mage', delay: 0 }, { kind: 'alchemist', delay: 5 }, { kind: 'sage', delay: 14 }, { kind: 'cleric', delay: 25 }]
    ],
    reward: { chip: 'focusMage', gold: 144 }
  },
  {
    id: 15,
    name: '混成討伐隊',
    waves: [
      [{ kind: 'warrior', delay: 0 }, { kind: 'guard', delay: 4 }, { kind: 'ranger', delay: 8 }, { kind: 'knight', delay: 16 }, { kind: 'alchemist', delay: 26 }]
    ],
    reward: { chip: 'chaseNearest', gold: 158 }
  },
  {
    id: 16,
    name: '捕縛破りの盗賊団',
    waves: [
      [{ kind: 'rogue', delay: 0 }, { kind: 'beastTamer', delay: 4 }, { kind: 'rogue', delay: 9 }, { kind: 'ranger', delay: 15 }, { kind: 'sage', delay: 28 }]
    ],
    reward: { chip: 'focusRare', gold: 172 }
  },
  {
    id: 17,
    name: '聖堂の討伐令',
    waves: [
      [{ kind: 'paladin', delay: 0 }, { kind: 'cleric', delay: 8 }, { kind: 'paladin', delay: 20 }, { kind: 'sage', delay: 32 }]
    ],
    reward: { chip: 'returnThrone', gold: 188 }
  },
  {
    id: 18,
    name: '王国精鋭隊',
    waves: [
      [{ kind: 'knight', delay: 0 }, { kind: 'ranger', delay: 6 }, { kind: 'alchemist', delay: 14 }, { kind: 'paladin', delay: 26 }, { kind: 'sage', delay: 40 }]
    ],
    reward: { chip: 'focusRanged', gold: 204 }
  },
  {
    id: 19,
    name: '勇者先触れ',
    waves: [
      [{ kind: 'hero', delay: 0 }, { kind: 'cleric', delay: 10 }, { kind: 'knight', delay: 22 }, { kind: 'sage', delay: 36 }]
    ],
    reward: { chip: 'focusRare', gold: 230 }
  },
  {
    id: 20,
    name: '勇者本隊',
    waves: [
      [{ kind: 'hero', delay: 0 }, { kind: 'paladin', delay: 10 }, { kind: 'sage', delay: 24 }, { kind: 'hero', delay: 42 }]
    ],
    reward: { chip: 'focusKnower', gold: 300 }
  }
];
