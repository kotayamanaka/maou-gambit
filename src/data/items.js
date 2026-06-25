export const items = {
  rustyBlade: {
    id: 'rustyBlade',
    name: '錆びた剣',
    type: 'gear',
    value: 18,
    description: '売却用。鍛え直せば配下のATK素材にもなる',
    use: { target: 'ally', stat: 'atk', value: 1, label: 'ATK+1' }
  },
  scoutBoots: {
    id: 'scoutBoots',
    name: '斥候の靴',
    type: 'gear',
    value: 24,
    description: 'SPD強化素材',
    use: { target: 'ally', stat: 'spd', value: 0.08, label: 'SPD+0.08' }
  },
  manaDust: {
    id: 'manaDust',
    name: '魔素の粉',
    type: 'research',
    value: 28,
    description: '作戦チップ研究に使える粉',
    use: { target: 'ally', stat: 'intExp', value: 2, label: '知+2' }
  },
  silverChain: {
    id: 'silverChain',
    name: '銀の拘束具',
    type: 'capture',
    value: 34,
    description: '捕獲難度の高い敵を拘束する研究素材',
    use: { target: 'room', room: 'jail', stat: 'captureTtlBonus', value: 3, label: 'ダウン猶予+3s' }
  },
  roomStone: {
    id: 'roomStone',
    name: '拡張石材',
    type: 'room',
    value: 40,
    description: '部屋拡張や新部屋建設の素材',
    use: { target: 'room', stat: 'capacity', value: 1, label: '容量+1' }
  },
  sageInk: {
    id: 'sageInk',
    name: '賢者のインク',
    type: 'research',
    value: 55,
    description: '高位チップ研究に使える希少素材',
    use: { target: 'ally', stat: 'intExp', value: 4, label: '知+4' }
  }
};
