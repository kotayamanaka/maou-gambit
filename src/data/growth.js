export const feedMaterials = {
  warrior: {
    exp: 12,
    intExp: 0,
    bonuses: { maxHp: 4, atk: 1 },
    label: '体力+4 攻撃+1'
  },
  rogue: {
    exp: 8,
    intExp: 1,
    bonuses: { maxHp: 2, spd: 0.05 },
    label: '体力+2 速さ+0.05'
  },
  mage: {
    exp: 6,
    intExp: 2,
    bonuses: { atk: 1 },
    label: '攻撃+1 知識+2'
  },
  guard: {
    exp: 14,
    intExp: 0,
    bonuses: { maxHp: 6 },
    label: '体力+6'
  },
  ranger: {
    exp: 10,
    intExp: 1,
    bonuses: { atk: 1, spd: 0.04 },
    label: '攻撃+1 速さ+0.04'
  },
  cleric: {
    exp: 8,
    intExp: 3,
    bonuses: { maxHp: 2 },
    label: '体力+2 知識+3'
  },
  knight: {
    exp: 18,
    intExp: 0,
    bonuses: { maxHp: 6, atk: 1 },
    label: '体力+6 攻撃+1'
  },
  alchemist: {
    exp: 10,
    intExp: 3,
    bonuses: { atk: 1 },
    label: '攻撃+1 知識+3'
  },
  beastTamer: {
    exp: 14,
    intExp: 1,
    bonuses: { maxHp: 3, spd: 0.06 },
    label: '体力+3 速さ+0.06'
  },
  paladin: {
    exp: 22,
    intExp: 1,
    bonuses: { maxHp: 8, atk: 1 },
    label: '体力+8 攻撃+1'
  },
  sage: {
    exp: 12,
    intExp: 6,
    bonuses: { atk: 1 },
    label: '攻撃+1 知識+6'
  },
  hero: {
    exp: 30,
    intExp: 4,
    bonuses: { maxHp: 10, atk: 2, spd: 0.05 },
    label: '体力+10 攻撃+2 速さ+0.05 知識+4'
  },
  default: {
    exp: 8,
    intExp: 0,
    bonuses: { maxHp: 2 },
    label: '体力+2'
  }
};

export const growthProfiles = {
  goblin: { label: 'バランス型', hp: 5, atkEvery: 2, spd: 0.02, intNeed: 3, maxInt: 5 },
  slime: { label: '体力型', hp: 9, atkEvery: 3, spd: 0, intNeed: 5, maxInt: 3 },
  poisonSlime: { label: '毒体力型', hp: 8, atkEvery: 4, spd: 0.01, intNeed: 4, maxInt: 4 },
  darkSlime: { label: '闇攻撃型', hp: 9, atkEvery: 2, spd: 0, intNeed: 4, maxInt: 4 },
  bat: { label: '高速型', hp: 3, atkEvery: 3, spd: 0.05, intNeed: 4, maxInt: 4 },
  fallenWarrior: { label: '攻撃体力型', hp: 7, atkEvery: 2, spd: 0, intNeed: 5, maxInt: 3 },
  shadeRunner: { label: '高速知性型', hp: 4, atkEvery: 3, spd: 0.06, intNeed: 3, maxInt: 5 },
  darkMage: { label: '知性型', hp: 3, atkEvery: 3, spd: 0, intNeed: 2, maxInt: 6 },
  boneGuard: { label: '守備型', hp: 8, atkEvery: 3, spd: 0, intNeed: 5, maxInt: 3 },
  goblinChief: { label: '指揮型', hp: 6, atkEvery: 2, spd: 0.03, intNeed: 3, maxInt: 6 },
  plagueSlime: { label: '巨大体力型', hp: 11, atkEvery: 3, spd: 0, intNeed: 5, maxInt: 3 },
  impArcher: { label: '遠隔高速型', hp: 3, atkEvery: 2, spd: 0.05, intNeed: 3, maxInt: 5 },
  oracleShade: { label: '高知性型', hp: 3, atkEvery: 4, spd: 0.02, intNeed: 2, maxInt: 7 },
  default: { label: '標準型', hp: 5, atkEvery: 2, spd: 0.02, intNeed: 4, maxInt: 4 }
};
