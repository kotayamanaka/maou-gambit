export const feedMaterials = {
  warrior: {
    exp: 12,
    intExp: 0,
    bonuses: { maxHp: 4, atk: 1 },
    label: 'HP+4 ATK+1'
  },
  rogue: {
    exp: 8,
    intExp: 1,
    bonuses: { maxHp: 2, spd: 0.05 },
    label: 'HP+2 SPD+0.05'
  },
  mage: {
    exp: 6,
    intExp: 2,
    bonuses: { atk: 1 },
    label: 'ATK+1 知能+2'
  },
  default: {
    exp: 8,
    intExp: 0,
    bonuses: { maxHp: 2 },
    label: 'HP+2'
  }
};

export const growthProfiles = {
  goblin: { label: 'バランス型', hp: 5, atkEvery: 2, spd: 0.02, intNeed: 3, maxInt: 5 },
  slime: { label: 'HP型', hp: 9, atkEvery: 3, spd: 0, intNeed: 5, maxInt: 3 },
  bat: { label: 'SPD型', hp: 3, atkEvery: 3, spd: 0.05, intNeed: 4, maxInt: 4 },
  fallenWarrior: { label: 'HP/ATK型', hp: 7, atkEvery: 2, spd: 0, intNeed: 5, maxInt: 3 },
  shadeRunner: { label: 'SPD/INT型', hp: 4, atkEvery: 3, spd: 0.06, intNeed: 3, maxInt: 5 },
  darkMage: { label: 'INT型', hp: 3, atkEvery: 3, spd: 0, intNeed: 2, maxInt: 6 },
  default: { label: '標準型', hp: 5, atkEvery: 2, spd: 0.02, intNeed: 4, maxInt: 4 }
};
