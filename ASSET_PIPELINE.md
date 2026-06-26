# Asset Pipeline

## 方針

- ゲーム内表示はPCフルスクリーンを主対象にする。
- 文字やUI枠以外のキャラ、部屋、床、通路は、ファイナルファンタジータクティクスを目安にした、少し荒めで読みやすい2Dドット絵へ寄せる。
- 生成画像はすぐ実装参照できるよう、キャラ単位・動作単位で保存する。
- 本実装前の仮スプライトは `assets/sprites/` と `public/assets/sprites/` に置く。
- 生成後の高品質素材は `assets/generated/` に原本を置き、ゲームで使う縮小版を `public/assets/sprites/` へ書き出す。
- ダンジョン床・部屋床・通路床は `assets/generated/dungeon/tiles/` に原本と切り出しを置き、ゲーム参照用を `public/assets/tiles/` へ書き出す。

## ディレクトリ

```text
assets/generated/
  characters/
    enemy-adventurers/
      sheet-v1.png
    <unit-id>/
      sheet-v1-4dir.png
      idle-front.png
      idle-back.png
      idle-left.png
      idle-right.png
      walk-front.png
      walk-back.png
      walk-left.png
      walk-right.png
      attack-front.png
      attack-back.png
      attack-left.png
      attack-right.png
      downed.png
      sheet.png
  dungeon/
    rooms/
      <room-id>.png
    tiles/
      floor-stone.png
      room-stone.png
      corridor-stone.png
      sheet-v1.png
  effects/
    slash.png
    projectile-arcane.png
    capture-chain.png
```

## 書き出しスクリプト

- ゴブリンの生成シートは `scripts/slice_goblin_sheet.py` で 4列x4行に切り出す。
- 入力: `assets/generated/characters/goblin/sheet-v2-cardinal-fft.png`
- 原本切り出し先: `assets/generated/characters/goblin/`
- ゲーム参照先: `public/assets/sprites/goblin/`
- 行は `idle`、`walk`、`attack`、`downed`、列は `front`、`back`、`left`、`right` として扱う。
- 背景の暗色は透明化する。完全な手修正素材ではないため、後で専用透過・影処理の改善余地あり。
- スライム系の生成シートは `scripts/slice_slime_family_sheet.py` で、横3種 x 4方向 x 4動作に切り出す。
- 入力: `assets/generated/characters/slime-family/sheet-v1.png`
- 対象: `slime`、`poisonSlime`、`darkSlime`
- 原本切り出し先: `assets/generated/characters/<unit-id>/`
- ゲーム参照先: `public/assets/sprites/<unit-id>/`
- 背景の `#ff00ff` は透明化し、ゲーム表示用に半分サイズへ縮小する。
- 序盤敵冒険者の生成シートは `scripts/slice_enemy_adventurers_sheet.py` で、横3職 x 4方向 x 4動作に切り出す。
- 入力: `assets/generated/characters/enemy-adventurers/sheet-v1.png`
- 対象: `warrior`、`rogue`、`mage`
- 原本切り出し先: `assets/generated/characters/<unit-id>/`
- ゲーム参照先: `public/assets/sprites/<unit-id>/`
- 背景の `#ff00ff` は透明化し、ゲーム表示用に半分サイズへ縮小する。
- 味方魔物/洗脳後ユニットの生成シートは `scripts/slice_ally_monsters_sheet.py` で、各ユニットごとの 4方向 x 4動作に切り出す。
- 入力: `assets/generated/characters/<unit-id>/sheet-v1-4dir.png`
- 対象: `bat`、`fallenWarrior`、`shadeRunner`、`darkMage`
- 原本切り出し先: `assets/generated/characters/<unit-id>/`
- ゲーム参照先: `public/assets/sprites/<unit-id>/`
- 背景の `#ff00ff` は透明化し、ゲーム表示用に半分サイズへ縮小する。
- まとめて複数ユニットを生成したシートが3方向や12列に崩れた場合は採用しない。単体生成で4列 `front/back/left/right` が揃ったものだけを切り出す。
- `scripts/make_sprite_direction_audit.py` で `screenshots/sprite-direction-audit-ally-monsters.png` を作成し、4方向と動作の検収をしてから実装へ接続する。
- ダンジョン床タイルの生成シートは `scripts/slice_dungeon_tiles.py` で、横3枚のタイルに切り出す。
- 入力: `assets/generated/dungeon/tiles/sheet-v1.png`
- 対象: `floor-stone`、`room-stone`、`corridor-stone`
- 原本切り出し先: `assets/generated/dungeon/tiles/`
- ゲーム参照先: `public/assets/tiles/`
- ゲーム表示用に128px四方へ縮小し、マップ背景・部屋背景・直角通路のテクスチャとして使う。

## キャラ動作

- 向きは斜めではなく、上下左右の4方向を基本にする。
- `front`: 画面下向き。
- `back`: 画面上向き。
- `left`: 画面左向き。
- `right`: 画面右向き。
- `idle`: 待機。呼吸や小さな揺れが読み取れる。
- `walk`: 2から4フレーム相当の歩行差分。通路移動で使う。
- `attack`: 近接は踏み込み、遠距離は射出姿勢。
- `downed`: 捕獲前の倒れ状態。

## 実装接続済み

- `goblin` と `goblinChief` は `spriteSet` として `idle`、`walk`、`attack`、`downed` の上下左右スプライトを参照する。
- `slime`、`poisonSlime`、`darkSlime`、`plagueSlime` は `spriteSet` として生成スライム素材を参照する。`plagueSlime` は暫定で `poisonSlime` と同じ素材を使う。
- `warrior`、`rogue`、`mage` は生成した冒険者素材を参照する。後半敵の `guard`、`knight`、`paladin`、`hero` は暫定で `warrior`、`ranger`、`beastTamer` は `rogue`、`cleric`、`alchemist`、`sage` は `mage` の素材を共有する。
- `bat`、`fallenWarrior`、`shadeRunner`、`darkMage` は生成した味方魔物素材を参照する。`boneGuard` は暫定で `fallenWarrior`、`impArcher` は `bat`、`oracleShade` は `darkMage` の素材を共有する。
- ダンジョンマップは `floor-stone` を背景床、`room-stone` を部屋床、`corridor-stone` を通路床として参照する。
- 通路は部屋中心同士の斜め直線ではなく、部屋の扉から水平・垂直の直角セグメントとして描画する。
- ゲーム中は座標移動の向きから `front/back/left/right` を更新し、移動中は `walk`、攻撃直後は `attack` を表示する。
- まだ専用化されていない後半亜種は既存生成素材を共有している。

## 初期生成対象

- 味方: `goblin`, `slime`, `bat`, `fallenWarrior`, `shadeRunner`, `darkMage`, `boneGuard`, `goblinChief`, `plagueSlime`, `impArcher`, `oracleShade`
- 敵: `warrior`, `rogue`, `mage`, `guard`, `ranger`, `cleric`, `knight`, `alchemist`, `beastTamer`, `paladin`, `sage`, `hero`
- 部屋: `entrance`, `storage`, `atrium`, `jail`, `hallA`, `hallB`, `deadEnd`, `treasure`, `throne`

## 生成プロンプト基準

```text
Use case: stylized-concept
Asset type: 2D pixel-art game sprite sheet
Primary request: <unit name> for a dungeon management game
Style/medium: tactical RPG pixel art inspired by Final Fantasy Tactics, slightly coarse hand-placed pixels, readable at small size
Composition/framing: straight four-direction RPG sprite views, front/back/left/right, full body, generous padding, no UI
Lighting/mood: dungeon torchlight, readable silhouette, fantasy RPG
Color palette: rich but restrained, not monochrome, avoid muddy low-contrast colors
Constraints: create separate idle, walk, attack, and downed poses for the four cardinal directions where applicable; no diagonal/isometric-only poses; no text; no watermark
Avoid: modern anime splash art, photorealism, smooth painterly rendering, high-detail realistic rendering, blurry pixels, giant weapons that hide the body
```
