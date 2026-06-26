# Asset Pipeline

## 方針

- ゲーム内表示はPCフルスクリーンを主対象にする。
- 文字やUI枠以外のキャラ、部屋、床、通路は、ファイナルファンタジータクティクスを目安にした、少し荒めで読みやすい2Dドット絵へ寄せる。
- 生成画像はすぐ実装参照できるよう、キャラ単位・動作単位で保存する。
- 本実装前の仮スプライトは `assets/sprites/` と `public/assets/sprites/` に置く。
- 生成後の高品質素材は `assets/generated/` に原本を置き、ゲームで使う縮小版を `public/assets/sprites/` へ書き出す。
- ダンジョン床・部屋床・通路床は `assets/generated/dungeon/tiles/` に原本と切り出しを置き、ゲーム参照用を `public/assets/tiles/` へ書き出す。
- `spriteSet` は従来の単一PNGパスと、2から4フレーム程度のPNG配列の両方を扱う。単一PNGだけのユニットは従来どおり表示し、配列があるユニットだけ描画時にフレームを切り替える。
- 自動生成した微差分フレームは、本番絵ではなくアニメーション基盤検証用。既存PNGは上書きせず、`walk-front-0.png` のような派生ファイルとして `public/assets/sprites/<unit-id>/` に置く。

## ディレクトリ

```text
assets/generated/
  characters/
    enemy-adventurers/
      sheet-v1.png
    guard/
      sheet-v2-4dir.png
    demonLord/
      source-v1.png
      demonLord-alpha-v1.png
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
- このシートは12等分固定で切らない。生成結果が完全な格子に揃わないため、背景色から行ごとの実キャラ塊を検出して切り出す。盗賊/魔法使いのように生成元が3方向しかない場合は片側を水平反転で補完し、隣のキャラ混入を優先的に避ける。
- 味方魔物/洗脳後ユニットの生成シートは `scripts/slice_ally_monsters_sheet.py` で、各ユニットごとの 4方向 x 4動作に切り出す。
- 入力: `assets/generated/characters/<unit-id>/sheet-v1-4dir.png`
- 対象: `bat`、`fallenWarrior`、`shadeRunner`、`darkMage`、`boneGuard`、`impArcher`、`oracleShade`
- 原本切り出し先: `assets/generated/characters/<unit-id>/`
- ゲーム参照先: `public/assets/sprites/<unit-id>/`
- 背景の `#ff00ff` は透明化し、ゲーム表示用に半分サイズへ縮小する。
- まとめて複数ユニットを生成したシートが3方向や12列に崩れた場合は採用しない。単体生成で4列 `front/back/left/right` が揃ったものだけを切り出す。
- `scripts/make_sprite_direction_audit.py` で `screenshots/sprite-direction-audit-ally-monsters.png` を作成し、4方向と動作の検収をしてから実装へ接続する。
- `scripts/make_sprite_direction_audit_enemies.py` で `screenshots/sprite-direction-audit-enemies.png` を作成し、敵冒険者の切り出しに隣接キャラ混入や欠けがないか検収する。
- 後半敵職の暫定亜種スプライトは `scripts/make_enemy_variant_sprites.py` で、`warrior`、`rogue`、`mage` をベースに職ごとの色調を変えて書き出す。
- 対象: `guard`、`ranger`、`cleric`、`knight`、`alchemist`、`beastTamer`、`paladin`、`sage`、`hero`
- 原本切り出し先: `assets/generated/characters/<unit-id>/`
- ゲーム参照先: `public/assets/sprites/<unit-id>/`
- これは本格専用生成前の暫定多様化。ゲーム中で職が判別できることを優先し、後で職ごとの専用シートに差し替える。
- 専用生成した敵職シートは `scripts/slice_dedicated_enemy_sheets.py` で、各ユニットごとの 4方向 x 4動作に切り出す。
- 入力例: `assets/generated/characters/guard/sheet-v2-4dir.png`
- 対象: `guard`
- 原本切り出し先: `assets/generated/characters/<unit-id>/`
- ゲーム参照先: `public/assets/sprites/<unit-id>/`
- 背景の `#ff00ff` は透明化し、ゲーム表示用に縮小する。暫定色替えから専用シルエットへ置き換える敵職はこの流れで追加する。
- 魔王は `assets/generated/characters/demonLord/source-v1.png` を生成原本にし、クロマキー除去後の `demonLord-alpha-v1.png` から `public/assets/sprites/demonLord/idle-front.png` へ縮小・余白調整して使う。
- ダンジョン床タイルの生成シートは `scripts/slice_dungeon_tiles.py` で、横3枚のタイルに切り出す。
- 入力: `assets/generated/dungeon/tiles/sheet-v1.png`
- 対象: `floor-stone`、`room-stone`、`corridor-stone`
- 原本切り出し先: `assets/generated/dungeon/tiles/`
- ゲーム参照先: `public/assets/tiles/`
- ゲーム表示用に128px四方へ縮小し、マップ背景・部屋背景・直角通路のテクスチャとして使う。
- 基盤検証用の微差分アニメーションフレームは `scripts/make_micro_animation_frames.py` で作る。
- 入力: `public/assets/sprites/<unit-id>/walk-front.png` や `attack-front.png` など既存のゲーム表示用PNG。
- 対象: `goblin`、`slime`、`warrior`、`rogue`、`mage`、`guard`。
- 出力: `walk-<direction>-0..2.png` と `attack-<direction>-0..1.png`。元PNGは上書きしない。
- 透明背景を維持し、ドット絵の拡縮/移動はNEAREST前提。walkは軽い上下/左右差分、attackは踏み込み方向への数px移動と軽い明度差分に留める。
- `scripts/make_sprite_animation_audit.py` で `screenshots/sprite-animation-audit.png` を作成し、walk/attackのフレーム差分を一覧検収する。

## キャラ動作

- 向きは斜めではなく、上下左右の4方向を基本にする。
- `front`: 画面下向き。
- `back`: 画面上向き。
- `left`: 画面左向き。
- `right`: 画面右向き。
- `idle`: 待機。呼吸や小さな揺れが読み取れる。
- `walk`: 2から4フレーム相当の歩行差分。通路移動で使う。
- `attack`: 近接は踏み込み。遠距離は構え/詠唱までで、矢や魔法玉などの射出物はキャラ絵に描かない。
- `downed`: 捕獲前の倒れ状態。
- `walk` と `attack` は、`spriteSet.walk.front` が文字列なら単一画像、配列なら時間/攻撃残り時間に応じてフレーム選択する。ユニットごとに位相をずらし、全員が同じ歩幅で同期しないようにする。

## 実装接続済み

- `goblin` と `goblinChief` は `spriteSet` として `idle`、`walk`、`attack`、`downed` の上下左右スプライトを参照する。
- `slime`、`poisonSlime`、`darkSlime`、`plagueSlime` は `spriteSet` として生成スライム素材を参照する。`plagueSlime` は暫定で `poisonSlime` と同じ素材を使う。
- `warrior`、`rogue`、`mage` は生成した冒険者素材を参照する。後半敵の `guard` は専用生成シートを参照する。`ranger`、`cleric`、`knight`、`alchemist`、`beastTamer`、`paladin`、`sage`、`hero` は、ベース3職から作った色違い亜種スプライトを参照する。
- `bat`、`fallenWarrior`、`shadeRunner`、`darkMage`、`boneGuard`、`impArcher`、`oracleShade` は生成した味方魔物素材を参照する。
- `demonLord` は専用生成素材 `public/assets/sprites/demonLord/idle-front.png` を参照する。
- ダンジョンマップは `floor-stone` を背景床、`room-stone` を部屋床、`corridor-stone` を通路床として参照する。
- 通路は部屋中心同士の斜め直線ではなく、部屋の扉から水平・垂直の直角セグメントとして描画する。
- ゲーム中は座標移動の向きから `front/back/left/right` を更新し、移動中は `walk`、攻撃直後は `attack` を表示する。
- `goblin`、`slime`、`warrior`、`rogue`、`mage`、`guard` は、基盤検証用の `walk` 3フレーム、`attack` 2フレーム配列に接続済み。その他のユニットは単一PNG参照のまま従来どおり表示する。
- 遠距離攻撃は `attack` スプライトを直接見せず、キャラ本体は構え姿勢、射出物は `projectile arrow/magic` エフェクトで別表示する。キャラ絵とエフェクトで矢/魔法玉を重複させない。
- まだ完全専用生成されていない後半敵職は、既存生成素材をベースにした色違い亜種として運用し、順次 `slice_dedicated_enemy_sheets.py` で専用シートへ差し替える。

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
