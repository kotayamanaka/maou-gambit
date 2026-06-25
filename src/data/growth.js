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
  guard: {
    exp: 14,
    intExp: 0,
    bonuses: { maxHp: 6 },
    label: 'HP+6'
  },
  ranger: {
    exp: 10,
    intExp: 1,
    bonuses: { atk: 1, spd: 0.04 },
    label: 'ATK+1 SPD+0.04'
  },
  cleric: {
    exp: 8,
    intExp: 3,
    bonuses: { maxHp: 2 },
    label: 'HP+2 知能+3'
  },
  knight: {
    exp: 18,
    intExp: 0,
    bonuses: { maxHp: 6, atk: 1 },
    label: 'HP+6 ATK+1'
  },
  alchemist: {
    exp: 10,
    intExp: 3,
    bonuses: { atk: 1 },
    label: 'ATK+1 知能+3'
  },
  beastTamer: {
    exp: 14,
    intExp: 1,
    bonuses: { maxHp: 3, spd: 0.06 },
    label: 'HP+3 SPD+0.06'
  },
  paladin: {
    exp: 22,
    intExp: 1,
    bonuses: { maxHp: 8, atk: 1 },
    label: 'HP+8 ATK+1'
  },
  sage: {
    exp: 12,
    intExp: 6,
    bonuses: { atk: 1 },
    label: 'ATK+1 知能+6'
  },
  hero: {
    exp: 30,
    intExp: 4,
    bonuses: { maxHp: 10, atk: 2, spd: 0.05 },
    label: 'HP+10 ATK+2 SPD+0.05 知能+4'
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
  boneGuard: { label: '守備型', hp: 8, atkEvery: 3, spd: 0, intNeed: 5, maxInt: 3 },
  goblinChief: { label: '指揮型', hp: 6, atkEvery: 2, spd: 0.03, intNeed: 3, maxInt: 6 },
  plagueSlime: { label: '巨大HP型', hp: 11, atkEvery: 3, spd: 0, intNeed: 5, maxInt: 3 },
  impArcher: { label: '遠隔SPD型', hp: 3, atkEvery: 2, spd: 0.05, intNeed: 3, maxInt: 5 },
  oracleShade: { label: '高INT型', hp: 3, atkEvery: 4, spd: 0.02, intNeed: 2, maxInt: 7 },
  default: { label: '標準型', hp: 5, atkEvery: 2, spd: 0.02, intNeed: 4, maxInt: 4 }
};
