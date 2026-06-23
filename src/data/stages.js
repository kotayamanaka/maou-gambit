export const stages = [
  {
    id: 1,
    name: '第一侵入隊',
    waves: [
      [{ kind: 'warrior', delay: 0 }, { kind: 'rogue', delay: 4 }, { kind: 'mage', delay: 8 }]
    ],
    reward: { chip: 'carryDowned' }
  },
  {
    id: 2,
    name: '偵察混成隊',
    waves: [
      [{ kind: 'rogue', delay: 0 }, { kind: 'rogue', delay: 2 }, { kind: 'warrior', delay: 5 }, { kind: 'mage', delay: 8 }]
    ],
    reward: { chip: 'focusKnower' }
  },
  {
    id: 3,
    name: '勇者前衛隊',
    waves: [
      [{ kind: 'warrior', delay: 0 }, { kind: 'mage', delay: 2 }, { kind: 'warrior', delay: 5 }, { kind: 'rogue', delay: 7 }, { kind: 'mage', delay: 10 }]
    ],
    reward: { chip: 'focusWeak' }
  }
];
