# Asset Pipeline

## 方針

- ゲーム内表示はPCフルスクリーンを主対象にする。
- 文字やUI枠以外のキャラ、部屋、床、通路は、画質の良いスーファミ風の2Dピクセルアートへ寄せる。
- 生成画像はすぐ実装参照できるよう、キャラ単位・動作単位で保存する。
- 本実装前の仮スプライトは `assets/sprites/` と `public/assets/sprites/` に置く。
- 生成後の高品質素材は `assets/generated/` に原本を置き、ゲームで使う縮小版を `public/assets/sprites/` へ書き出す。

## ディレクトリ

```text
assets/generated/
  characters/
    <unit-id>/
      idle.png
      walk.png
      attack.png
      downed.png
      sheet.png
  dungeon/
    rooms/
      <room-id>.png
    tiles/
      floor-stone.png
      wall-stone.png
      corridor.png
  effects/
    slash.png
    projectile-arcane.png
    capture-chain.png
```

## キャラ動作

- `idle`: 待機。呼吸や小さな揺れが読み取れる。
- `walk`: 2から4フレーム相当の歩行差分。通路移動で使う。
- `attack`: 近接は踏み込み、遠距離は射出姿勢。
- `downed`: 捕獲前の倒れ状態。

## 初期生成対象

- 味方: `goblin`, `slime`, `bat`, `fallenWarrior`, `shadeRunner`, `darkMage`, `boneGuard`, `goblinChief`, `plagueSlime`, `impArcher`, `oracleShade`
- 敵: `warrior`, `rogue`, `mage`, `guard`, `ranger`, `cleric`, `knight`, `alchemist`, `beastTamer`, `paladin`, `sage`, `hero`
- 部屋: `entrance`, `storage`, `atrium`, `jail`, `hallA`, `hallB`, `deadEnd`, `treasure`, `throne`

## 生成プロンプト基準

```text
Use case: stylized-concept
Asset type: 2D pixel-art game sprite sheet
Primary request: <unit name> for a dungeon management game
Style/medium: high-quality Super Famicom-inspired pixel art, crisp hand-painted 2D sprite, readable at small size
Composition/framing: orthographic three-quarter top-down RPG view, full body, generous padding, no UI
Lighting/mood: dungeon torchlight, readable silhouette, fantasy RPG
Color palette: rich but restrained, not monochrome, avoid muddy low-contrast colors
Constraints: create separate idle, walk, attack, and downed poses; no text; no watermark
Avoid: modern anime splash art, photorealism, blurry pixels, giant weapons that hide the body
```

