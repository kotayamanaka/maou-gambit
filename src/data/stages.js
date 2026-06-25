export const stages = [
  {
    id: 1,
    name: '第一侵入隊',
    waves: [
      [{ kind: 'warrior', delay: 0 }, { kind: 'rogue', delay: 4 }, { kind: 'mage', delay: 8 }]
    ],
    reward: { chip: 'focusWeak' }
  },
  {
    id: 2,
    name: '偵察混成隊',
    waves: [
      [{ kind: 'rogue', delay: 0 }, { kind: 'rogue', delay: 2 }, { kind: 'warrior', delay: 5 }, { kind: 'mage', delay: 8 }]
    ],
    reward: { chip: 'focusMage' }
  },
  {
    id: 3,
    name: '勇者前衛隊',
    waves: [
      [{ kind: 'warrior', delay: 0 }, { kind: 'mage', delay: 5 }, { kind: 'warrior', delay: 11 }, { kind: 'rogue', delay: 17 }, { kind: 'mage', delay: 24 }]
    ],
    reward: { chip: 'focusKnower' }
  }
];
