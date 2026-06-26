# PROGRESS

## 2026-06-26 初回チュートリアル導線・速度選択・盾兵専用スプライト修正

### 実装

- 初期ダンジョンを入口・物置・広間・牢屋・魔王部屋の最小構成に絞り、前通路/奥通路などは建設後に広がる形へ変更。
- 初期導線を `入口 -> 物置 -> 広間 -> 魔王部屋` にし、入口から魔王部屋へ一直線に抜ける感覚を弱めた。
- 初期配下をゴブリン1体へ戻し、最初は戦闘/牢屋搬送までを1体で覚える導線にした。
- 初期チップ在庫を `接近 x1`、`攻撃 x1`、`牢屋搬送 x1` に戻した。
- 第1防衛報酬でスライムが加入するようにし、同時に `接近`、`攻撃`、`弱敵狙い` が増えて2体編成へ自然に広がるようにした。
- 第1侵入隊の2体目の出現を40秒に遅らせ、ゴブリン1体でも敵2体・捕獲・勝利が成立するようにした。
- 編成の配置候補は建設済み部屋だけを表示するようにし、未建設部屋への配置ネタバレを減らした。
- 初回セットアップでは `配下`、`配置`、`チップ`、`情報` だけを表示し、`建設`、`設備` は第1防衛後に開くようにした。初手から上級メニューを見せず、まず配置とチップを理解させる。
- 捕獲した賢者は `知識+6` の高知性素材として扱い、ゴブリンなら養分化1回で `知性+2` まで伸びることをテストで固定した。
- 速度ボタンを戦闘パネルのヘッダー内から分離し、マップ左上の固定 `battle-speedbar` に移動。スマホでも44px以上のタップ領域を持たせ、パネルスクロールやヘッダー詰まりに影響されず選択できるようにした。
- 盾兵 `guard` を色替え流用から専用生成シートに差し替え、盾を持つシルエットとして判別しやすくした。
- `scripts/slice_dedicated_enemy_sheets.py` を追加し、単体生成した敵職シートを `idle/walk/attack/downed` x `front/back/left/right` に切り出せるようにした。

### 検証結果

- `npx playwright test tests/smoke.spec.js -g "stage runs|result can continue"`: 4件成功
- `npx playwright test tests/smoke.spec.js -g "setup reveals|corridors use|setup supports drag"`: 6件成功
- `npx playwright test tests/smoke.spec.js -g "feeding a captured"`: 4件成功
- `npm test`: 68件成功
- `npm run build`: 成功
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- 初期状態のシミュレーション確認: ゴブリン1体でステージ1は敵2体、魔王無傷、捕獲1体以上で勝利。
- 速度UIは `4x -> 1x -> 2x` の順に選択でき、内部速度値も更新されることをテストで確認。加えて速度ボタン中央が最前面要素になっており、各ボタンが44px以上の実タップ領域を持つことをPC/スマホで固定。
- 目視確認: 初回セットアップで上級タブが隠れ、ダンジョン全体に透過パネルが重なる状態を確認。

### スクリーンショット

- `screenshots/tutorial-setup-minimal-tabs-desktop.png`
- `screenshots/speed-ui-desktop-after.png`
- `screenshots/speed-ui-mobile-after.png`

## 2026-06-26 戦闘表現・速度UI・DnD操作の再修正

### 実装

- 魔王テンプレートにも `spriteSet` を持たせ、マップ/詳細パネルで専用ドット絵が確実に表示されるようにした。
- 攻撃モーションの残り時間をシミュレーション倍速ではなく実時間で減らすように変更。2x/4xでも攻撃姿勢が一瞬で消えない。
- 近接攻撃に短い `swing` エフェクトを追加し、攻撃モーションとダメージ数値を分離した。
- 表示エフェクト数に上限を設け、ダメージ数字が過密に積み上がりすぎないようにした。
- 倍速操作を循環ボタンから `1x`、`2x`、`4x` の明示ボタンへ変更。現在速度は選択色で表示する。
- 画面表示・ログ・素材ラベルに残っていた `HP`、`ATK`、`SPD`、`INT`、`EXP` などの英字表記を日本語へ寄せた。
- 部屋建設候補を配置スロットへドラッグ&ドロップして建設できるようにした。
- 設備を部屋へドラッグ&ドロップして設置する導線をテストで固定した。

### 検証結果

- `npm run build`: 成功
- `npm test`: 64件成功
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- 目視確認: 速度UI、魔王画像、攻撃中フレーム、ダメージ数値、射出/近接エフェクトを確認。

### スクリーンショット

- `screenshots/battle-effects-explicit-after.png`
- `screenshots/battle-effects-speed-ui-after.png`
- `screenshots/demon-lord-visible-after.png`

## 2026-06-26 後半敵職を色違い亜種スプライトに分岐

### 実装

- 後半敵職が `warrior`、`rogue`、`mage` の同一素材を共有していて、職種の多様性が画面上で弱かったため、9職分の暫定亜種スプライトを追加。
- `scripts/make_enemy_variant_sprites.py` を追加し、既存の戦士/盗賊/魔法使いスプライトをベースに、職ごとの色調を変えた4方向/4動作スプライトを書き出すようにした。
- 対象は `guard`、`ranger`、`cleric`、`knight`、`alchemist`、`beastTamer`、`paladin`、`sage`、`hero`。
- `enemyTemplates` を更新し、後半敵もそれぞれ `assets/sprites/<enemy-id>/...` を参照するようにした。
- `scripts/make_sprite_direction_audit_enemies.py` の検収対象を12職へ拡張。
- `tests/smoke.spec.js` に、全敵職のスプライトフォルダが4方向/4動作を持つことを確認するテストを追加。

### 検証結果

- `npm test -- --reporter=line -g "enemy templates|enemy sprite folders"`: 4件成功
- 方向検収画像確認。12職が同一素材の完全共有ではなく、少なくとも職ごとに色と印象で判別できる。
- PCスクリーンショット確認。広間に複数敵職を並べても、戦士/盾兵/弓兵/僧侶/騎士/錬金術師/獣使い/聖騎士/賢者/勇者が色違いで識別できる。

### スクリーンショット

- `screenshots/enemy-job-variants-desktop.png`
- `screenshots/sprite-direction-audit-enemies.png`

## 2026-06-26 部屋3倍化とUI/UX・戦闘視認性の再整備

### 実装

- ワールドを `4620x2700` に拡張し、各部屋の座標・サイズを約3倍へ変更。広間は `720x510` になり、部屋内で接近・射程・作戦チップが意味を持つ広さにした。
- 部屋内の初期立ち位置を固定ピクセルではなく部屋サイズ比率で散らすようにし、同じ部屋でも近接ユニットが接近してから攻撃する余地を作った。
- 初期カメラを画面サイズから計算する全体俯瞰に変更し、戦闘時は近景、リセット時は全体図へ戻るようにした。
- メニュータブの `U/P/C/B/O/I` 表記を廃止し、`配下`、`配置`、`チップ`、`建設`、`設備`、`情報` の日本語ラベルに変更。
- チップ画面にも配下リストを表示し、誰へチップを渡すかが常に見えるようにした。
- 配下カードを部屋へドラッグして配置、チップを配下カードへドラッグして装備、設備を部屋へドラッグして設置できるようにした。クリック操作も併存。
- 倍速ボタンを `速度 1x/2x/4x` 表記に変更し、押した直後の状態が読めるようにした。
- 遠距離攻撃はキャラ絵側の射出物ではなく、別レイヤの `projectile arrow/magic` エフェクトで表現するようにした。遠距離ユニットの攻撃スプライトは本体構えに寄せ、矢や魔法玉の二重表示を避ける。
- ダメージ表示を `打 -3` / `斬 -3` ではなく `-3` の数値だけに整理。攻撃モーション後に少し遅れて着弾/ダメージが出るよう、エフェクトに `delay` を追加した。
- エフェクト寿命はシミュレーション倍速ではなく実時間で減るようにし、倍速中でも数字が一瞬で消えないようにした。
- 魔王の仮アイコンを画像生成した専用ドット絵へ差し替え、`public/assets/sprites/demonLord/idle-front.png` を参照するようにした。
- 敵冒険者シートのスライス方法を修正。12等分固定で隣のキャラが混ざっていた問題をやめ、背景色から行ごとの実キャラ塊を検出して切り出す方式に変更。盗賊/魔法使いは生成元が3方向だったため、片側を水平反転で補完した。
- 敵スプライト検収用に `scripts/make_sprite_direction_audit_enemies.py` と `screenshots/sprite-direction-audit-enemies.png` を追加。

### 検証結果

- `npm test -- --reporter=line`: 62件成功
- `npm run test:balance`: 成功。キャンペーン勝利まで到達。
- `npm run build:pages`: 成功
- 目視確認: `screenshots/large-rooms-overview-desktop.png`、`screenshots/large-rooms-battle-desktop.png`、`screenshots/ui-ux-setup-rework-desktop.png`、`screenshots/ui-ux-chips-rework-desktop.png`、`screenshots/ui-ux-battle-hit-effect-desktop.png`、`screenshots/sprite-direction-audit-enemies.png`

## 2026-06-26 洗脳後の上位味方3体を専用スプライト化

### 実装

- 画像生成で `boneGuard`、`impArcher`、`oracleShade` の単体4方向シートを作成。
- 生成原本を `assets/generated/characters/<unit-id>/sheet-v1-4dir.png` に保存。
- `scripts/slice_ally_monsters_sheet.py` の対象を7体へ拡張し、3体それぞれを `idle`、`walk`、`attack`、`downed` x `front/back/left/right` に切り出した。
- `boneGuard`、`impArcher`、`oracleShade` を共有素材から専用 `spriteSet` 参照へ切り替えた。
- `scripts/make_sprite_direction_audit.py` の検収対象を7体へ拡張した。
- 能力表示の `CRY` 表記を `運搬` に変更し、ステータス表示の意味を読みやすくした。

### 検証結果

- `npm test -- --reporter=line -g "generated ally sprite folders|converted ally templates"`: 4件成功
- 方向検収画像確認。新規3体も単体4方向シートから切り出され、既存素材の流用ではなくなった。
- PCスクリーンショット確認。骨衛兵、小悪魔射手、影託者が同一画面上で見分けられる。

### スクリーンショット

- `screenshots/ally-specialists-desktop.png`
- `screenshots/sprite-direction-audit-ally-monsters.png`

## 2026-06-26 味方魔物/洗脳後ユニットの4方向生成スプライトと石通路を接続

### 実装

- 画像生成でコウモリ、堕ちた戦士、影走り、闇術師の4種を単体4方向シートとして作成。
- 4体まとめ生成は12列/3方向に崩れたため不採用。右向きミラー補完も採用しない方針に変更。
- 生成原本を `assets/generated/characters/<unit-id>/sheet-v1-4dir.png` に保存。
- `scripts/slice_ally_monsters_sheet.py` を追加し、各キャラ単体シートから `idle`、`walk`、`attack`、`downed` x `front/back/left/right` に切り出すようにした。
- 切り出し先は `assets/generated/characters/<unit-id>/` と `public/assets/sprites/<unit-id>/`。
- `scripts/make_sprite_direction_audit.py` を追加し、`screenshots/sprite-direction-audit-ally-monsters.png` で4方向と動作を検収できるようにした。
- `bat`、`fallenWarrior`、`shadeRunner`、`darkMage` を生成スプライトの `spriteSet` 参照へ切り替えた。
- `boneGuard` は暫定で `fallenWarrior`、`impArcher` は `bat`、`oracleShade` は `darkMage` の素材を共有する。
- 捕獲/研究で増えた味方が旧仮アイコンではなく、魔王軍側に変化した見た目でマップに出るようになった。
- 通路の楕円感と分断感を消すため、部屋の扉同士を直角SVGパスで接続し、通路床に `corridor-stone` タイルパターンを適用した。
- 通路幅がズーム時に部屋とズレないよう、通路のストロークもマップと一緒にスケールする設定にした。

### 検証結果

- `npm test -- --reporter=line -g "map uses generated|corridors use orthogonal"`: 4件成功
- `npm test -- --reporter=line -g "generated ally sprite folders|converted ally templates"`: 4件成功
- `npm test -- --reporter=line`: 60件成功
- `npm run test:balance`: キャンペーン勝利まで成功
- `npm run build:pages`: 成功
- PCスクリーンショット確認。通路は部屋の扉から連続した石通路として表示され、ズーム時も分断しない。
- 方向検収画像確認。味方4種は単体4方向シートから切り出され、12列/3方向素材は使っていない。

### スクリーンショット

- `screenshots/ally-monsters-desktop.png`
- `screenshots/ally-monsters-mobile.png`
- `screenshots/rect-corridors-desktop.png`
- `screenshots/corridors-zoom-desktop.png`
- `screenshots/sprite-direction-audit-ally-monsters.png`

## 2026-06-26 序盤敵スプライトと戦闘近景カメラを改善

### 実装

- 画像生成で戦士、盗賊、魔法使いの3職をまとめた冒険者スプライトシートを作成。
- 生成原本を `assets/generated/characters/enemy-adventurers/sheet-v1.png` に保存。
- `scripts/slice_enemy_adventurers_sheet.py` を追加し、3職それぞれを `idle`、`walk`、`attack`、`downed` x `front/back/left/right` に切り出すようにした。
- `warrior`、`rogue`、`mage` を生成スプライトの `spriteSet` 参照へ切り替えた。
- 後半敵の人型テンプレートも暫定で `warrior`、`rogue`、`mage` の生成素材を共有するようにした。
- 戦闘開始時のカメラを選択中ユニットへ近景フォーカスするようにした。PCはズーム1.38、スマホはズーム1.3を基準にする。
- マップリセットは固定値ではなく、現在の画面サイズに合わせてワールド全体が収まるズームを計算するようにした。
- ホイールズームとピンチズームは、画面/指の中心を基準に拡大縮小するようにした。
- キャラ表示サイズを拡大し、歩行と攻撃のCSSモーションを追加。拡大時に動きが読みやすいよう、部屋内の敵味方の立ち位置も少し広げた。

### 検証結果

- `npm test -- --reporter=line -g "battle supports unit selection|map supports pinch|early enemy templates"`: 6件成功
- `npm run build`: 成功
- PC近景スクリーンショットで味方キャラ幅約80px、スマホ近景スクリーンショットで約62pxを確認。
- PC/スマホとも画面全体スクロールなし。リセットで近景から全体図へ戻ることを確認。

### スクリーンショット

- `screenshots/action-scale-desktop.png`
- `screenshots/action-scale-overview-desktop.png`
- `screenshots/action-scale-mobile.png`
- `screenshots/enemy-adventurers-desktop.png`
- `screenshots/enemy-adventurers-mobile.png`

## 2026-06-26 直角通路・必要時メニュー・配置スロットを実装

### 実装

- 生成画像でダンジョン床、部屋床、通路床の3タイルシートを作成し、`assets/generated/dungeon/tiles/sheet-v1.png` に保存。
- `scripts/slice_dungeon_tiles.py` を追加し、`floor-stone`、`room-stone`、`corridor-stone` を128pxタイルとして `assets/generated/dungeon/tiles/` と `public/assets/tiles/` へ書き出すようにした。
- マップ背景、部屋背景、通路床に生成タイルを接続した。
- 斜め直線通路を廃止し、部屋の扉から水平/垂直セグメントで曲がる直角通路を描画するよう変更。
- 移動処理も部屋中心への斜め移動ではなく、扉点と曲がり角を経由するルート移動へ変更。
- 建設候補部屋の固定ゴースト表示をやめ、建設時に接続元、配置スロット、部屋種を選び、その時点で `game.roomPositions` に座標を確定する形にした。
- 編成/強化の管理UIをタブ式に変更。配下、配置、チップ、建設、設備、情報など、選択中のカテゴリだけを表示する。
- マップ操作ボタンは拡大、縮小、リセット、選択フォーカスへ絞り、パンはドラッグ/ピンチ操作を主にした。
- 部屋とモンスターの表示サイズを拡大し、初期ズームを上げた。ズームアウトで全体を見つつ、拡大時はキャラの動きが読めるサイズにした。
- 牢屋搬送後の帰還は部屋キャパ判定に縛られないよう修正。満員が原因で運搬役が帰れず勝利確定しない問題を解消した。
- 直角通路化で初回が難しくなったため、第一侵入隊を2体に減らし、初期ゴブリンの基礎HP/ATKを少し上げた。

### 検証結果

- `npm test -- --reporter=line`: 54件成功
- `npm run test:balance`: 成功。キャンペーン育成込みで20ステージ勝利。
- `npm run build:pages`: 成功
- PC/スマホ幅スクリーンショット確認。ページ全体スクロールなし、表示メニューは1セクションのみ、マップ上に配置スロット8個、水平/垂直の直角通路が表示される。

### スクリーンショット

- `screenshots/orthogonal-build-menu-desktop.png`
- `screenshots/orthogonal-build-menu-mobile.png`
- `screenshots/zoomed-battle-actors-desktop.png`

## 2026-06-26 スライム系生成スプライトを接続

### 実装

- 画像生成でスライム、ポイズンスライム、ダークスライムの3種をまとめたモーションシートを作成。
- 生成原本を `assets/generated/characters/slime-family/sheet-v1.png` に保存。
- `scripts/slice_slime_family_sheet.py` を追加し、3種それぞれを `idle`、`walk`、`attack`、`downed` x `front/back/left/right` に切り出すようにした。
- 切り出し先は `assets/generated/characters/<unit-id>/` と `public/assets/sprites/<unit-id>/`。
- `slime`、`poisonSlime`、`darkSlime`、`plagueSlime` を `spriteSet` 参照へ切り替えた。`plagueSlime` は暫定で毒スライム系の絵を共有する。

### 検証結果

- `npm run build`: 成功
- `npm test -- --reporter=line`: 48件成功
- `npm run test:balance`: 成功
- PC/スマホ幅スクリーンショット確認。3種のスライムがマップ上・ユニットカード上で別色として表示され、画面全体スクロールなし。

### スクリーンショット

- `screenshots/slime-sprites-desktop.png`
- `screenshots/slime-sprites-mobile.png`

## 2026-06-26 魔物合成を実装

### 実装

- 配下が2体以上いるとき、選択中の配下をベースにして別の配下を素材消費できる `魔物合成` を追加。
- 捕獲敵の養分化で使っていた成長計算を汎用化し、捕獲素材と配下素材の両方で同じLV/INT成長処理を使うようにした。
- 合成素材は、素材配下のレア度と能力に応じてEXP、知能EXP、HP、ATK、SPDボーナスを決める。
- 強化画面の管理パネルに `魔物合成` を追加し、素材候補、プレビュー、合成実行ボタンを表示する。
- 合成後は素材配下を消費し、ベース配下を選択状態のまま維持する。

### 検証結果

- `npm run build`: 成功
- `npm test -- --reporter=line`: 46件成功
- `npm run test:balance`: 成功
- PC/スマホ幅スクリーンショット確認。PC/スマホとも画面全体スクロールなし、合成素材選択と実行ボタンが表示される。

### スクリーンショット

- `screenshots/monster-fusion-desktop.png`
- `screenshots/monster-fusion-mobile.png`

## 2026-06-26 レア度付き魔物研究を実装

### 実装

- `魔物召喚` を `魔物研究` に寄せ、捕獲以外でも配下を増やせる研究導線として整理した。
- 味方テンプレートに `starter`、`common`、`uncommon`、`rare`、`epic` のレア度を追加。
- 魔物研究は未知モンスターを優先し、候補が残っている間は未発見の配下から抽選する。
- 抽選はレア度ごとの重み付きにし、通常枠は出やすく、希少・伝説枠は低確率にした。
- 研究パネルに候補のレア度内訳と希少以上の目安確率を表示した。
- 魔物巣の軽減表記を `魔物研究費` に揃えた。

### 検証結果

- `npm run build`: 成功
- `npm test -- --reporter=line`: 44件成功
- `npm run test:balance`: 成功
- PC/スマホ幅スクリーンショット確認。PC/スマホとも画面全体スクロールなし、研究ボタンと候補表示が確認できる。スマホは強化パネル内スクロールで研究セクションに到達できる。

### スクリーンショット

- `screenshots/monster-research-desktop.png`
- `screenshots/monster-research-mobile.png`
- `screenshots/monster-research-mobile-focused.png`

## 2026-06-26 既知チップの追加開発を実装

### 実装

- ランダムな `チップ研究` とは別に、発見済みチップを資金で追加開発できるようにした。
- `developKnownChip` と `chipDevelopmentCost` を追加し、所持済みチップだけを開発対象にする。
- 開発コストはチップカテゴリと現在所持数に応じて増える。禁書庫などの研究費軽減も反映される。
- 研究パネルに既知チップの横スクロール開発レーンを追加。
- 未発見チップは開発レーンに出さず、`????` で発見する楽しさを維持する。

### 検証結果

- `npm run build:pages`: 成功
- `npm test -- --reporter=line`: 42件成功
- `npm run test:balance`: 成功
- PC/スマホ幅スクリーンショット確認。PCでは研究パネル内に `チップ研究`、`魔物召喚`、既知チップ開発が表示される。スマホは画面全体スクロールなしで、パネル内スクロールに収まる。

### スクリーンショット

- `screenshots/chip-development-desktop.png`
- `screenshots/chip-development-mobile.png`

## 2026-06-26 ゴブリン生成シートの分割とゲーム内接続

### 実装

- `assets/generated/characters/goblin/sheet-v2-cardinal-fft.png` を 4列x4行として切り出す `scripts/slice_goblin_sheet.py` を追加。
- ゴブリンの `idle`、`walk`、`attack`、`downed` を `front/back/left/right` 別PNGとして書き出し。
- 原本切り出し先は `assets/generated/characters/goblin/`、ゲーム参照先は `public/assets/sprites/goblin/`。
- `goblin` と `goblinChief` に `spriteSet` を追加し、ゲーム内描画で動作・向きに応じてスプライトを切り替えるようにした。
- 移動時に向きを更新し、移動中は `walk`、攻撃直後は `attack` を表示する。
- ダウン体にも `spriteSet` と向きを引き継ぐようにした。

### 検証結果

- `npm run build:pages`: 成功
- `npm run test:balance`: 成功
- `npm run test:smoke -- --reporter=line --workers=1 --timeout=60000 --grep "goblin uses generated|setup supports"`: 4件成功

### 残課題

- 背景透明化は自動しきい値処理。手修正レベルの透明化・影処理は未実施。
- ゴブリン以外の味方/敵はまだ旧仮スプライト参照。
- 歩行は1枚絵切替で、複数フレームアニメーションは未実装。

## 2026-06-26 ダンジョン運営・図鑑・状態異常の土台追加

### 実装

- チップにカテゴリを追加し、未発見チップは名前を出さず `????` とカテゴリだけ表示するよう変更。
- 自軍、敵軍、チップの図鑑率を表示。
- ゴールドの使い道として、アイテム売却、チップ研究、魔物召喚、部屋建設、部屋拡張を追加。
- 部屋ごとに `connectionLimit` を持たせ、建設時にどの既存部屋へ通路接続するか選べるようにした。
- 未建設部屋は接続0から開始し、建設時に `game.roomConnections` へ接続を記録。経路探索・敵AI・マップ描画はこの動的接続を見る。
- 部屋撤去を追加。初期コア部屋は撤去不可。撤去は有料で、配下や設備がある部屋は撤去不可。
- 部屋種類を拡張。禁書庫、魔物巣、武具庫を追加し、宝物庫などにメリット/侵入リスクを設定。
- 宝物庫は所持上限増加。ただし敵に侵入されるとゴールド/アイテム略奪リスク。
- 禁書庫は研究費軽減。ただし侵入されると魔王部屋発見リスク。
- 魔物巣は魔物召喚費軽減。ただし侵入されると配下反応遅延リスク。
- 武具庫はリスク部屋として追加。侵入者が武装してATK+1。
- 部屋オブジェクトを追加。`棘罠`、`セーブポイント`、`回復の泉` を設置できる。
- セーブポイントは敵がその部屋で一度復活する。危険だが撃破/捕獲チャンスが増える。
- 回復の泉は同室の味方・敵の両方を回復する両刃設備。
- 状態異常/強化の共通システムを追加。`毒`、`鈍足`、`加速`、`鼓舞` を実装。
- 味方/敵のテンプレートに簡単なスキルを追加。スライムは鈍足、毒/闇スライムや術師系は毒、コウモリ/盗賊系は加速、指揮系は鼓舞。
- スライム亜種として `ポイズンスライム`、`ダークスライム` を追加。現時点では仮スプライト共有。

### 検証結果

- `npm run build:pages`: 成功
- `npm run test:smoke -- --reporter=line --workers=1 --timeout=60000`: 38件成功
- `npm run test:balance`: 成功。raw stage winRate 0.75、campaign は victory。

### 残課題

- 部屋配置は現時点では「候補地選択 + 接続元選択」。完全なドラッグ自由配置は未実装。
- 部屋オブジェクトは3種のみ。罠、敵有利設備、環境ギミックを追加する余地あり。
- 亜種モンスターの色違いドット絵は未作成。現状はデータ上の差分のみ。
- 状態異常の効果量・表示は暫定。戦闘ログ/エフェクトの見やすさは継続改善対象。

## 2026-06-24

### 実装

- Vite ベースの静的ブラウザゲームとして作成。
- データ/ロジック/UI/描画/アセットを分離。
- 固定ダンジョン、敵探索AI、自軍チップAI、戦闘、ダウン、牢屋搬送、捕獲、戦闘後処理を実装。
- PC/スマホ両対応のフルスクリーンUIを実装。
- マップ内ズーム/パン操作を実装。画面全体スクロールはなし。
- 32pxプロト用ドットPNGを配置。

### 自律改善サイクル

#### 1周目

- 検証：`npm run build` 成功。Playwright 初回実行。
- 問題：Playwright ブラウザ本体が未インストール、スマホプロジェクトが WebKit 依存。
- 修正：`npx playwright install chromium` を実行し、モバイル検証も Chromium 幅に変更。
- 結果：PC/スマホのレイアウトと基本戦闘フローが通過。

#### 2周目

- 検証：PC/スマホのスクリーンショット確認。
- 問題：編成画面のチップ欄が下で切れ気味。
- 修正：編成パネルのチップを4列化し、スマホのマップ/パネル配分を調整。
- 結果：スマホ390px相当で全チップが画面内に収まった。

#### 3周目

- 検証：リザルトから強化画面までの自動テストを追加。
- 問題：PC右パネルの味方一覧が縦に窮屈。
- 修正：味方カードを横3列に変更し、情報密度を安定化。
- 結果：`npm run test:smoke` 6件成功。

#### 4周目

- 検証：ユーザー指摘「通路が細すぎる/部屋ジャンプに見える」。
- 問題：部屋間を線でつないでおり、キャラが部屋単位で移動していた。
- 修正：キャラに描画座標 `x/y` を持たせ、部屋間をリアルタイム移動するよう変更。通路を幅のあるSVG corridorとして描画。
- 追加修正：最初の corridor が太すぎたため、歩行幅として見える幅に再調整。
- 結果：通路上をキャラが連続移動し、マップ内ズーム/パンも可能になった。

### 検証結果

- `npm run build`: 成功
- `npm run build:pages`: 成功
- `npm run test:smoke`: 6件成功
- GitHub Pages deploy: 成功
- 公開URL HTTP確認: `200`
- 公開URL Playwright確認: PC/スマホ幅で表示、画面全体スクロールなし
- スクリーンショット:
  - `screenshots/desktop-setup-v2.png`
  - `screenshots/mobile-setup-v2.png`
  - `screenshots/desktop-battle-v4.png`
  - `screenshots/mobile-battle-v3.png`
  - `screenshots/pages-desktop.png`
  - `screenshots/pages-mobile.png`

### 仕様調整

- 指定パラメータは概ね維持。
- 戦闘テンポ確認のため、テストでは速度2倍を使用。
- 通路は論理部屋接続を維持しつつ、描画上は幅のある道として表示。

### 残課題

- 捕獲が毎回自然に発生するほどのチューニングは未完。
- チップ「戻る」系は動くが、役割の違いをもっと強める余地あり。
- 敵探索の視覚フィードバックは最低限。探索済み/未踏の見せ方は改善余地あり。
- 本格的なドット絵/アニメーションは未着手。

### URL

- 実装場所：`C:\Users\kota\Documents\maou-gambit`
- GitHub：https://github.com/kotayamanaka/maou-gambit
- 公開URL：https://kotayamanaka.github.io/maou-gambit/

## 2026-06-24 追加修正

## 2026-06-25 攻撃距離・接近戦修正

### 実装

- 攻撃判定を部屋距離ベースから座標距離ベースへ変更。
- 近接攻撃は同じ部屋でも対象に接近しないと成立しないようにした。
- 移動中のユニットが遠くの相手を攻撃し続ける挙動を抑制。
- 遠距離攻撃時に射出エフェクトを発生させ、攻撃元から対象へ飛ぶ表示を追加。
- SPD を攻撃間隔にも反映し、足の速いユニットの価値を接敵速度だけに限定しないよう調整。
- コウモリを HP 42 / ATK 7 に底上げし、初期高速アタッカーとして最低限の手応えを出した。
- ダウン体の拾得も距離判定を持たせ、同室ワープ回収を削減。
- 牢屋搬送後、運搬役が担当部屋へ戻るまで勝利確定を待つようにした。

### 検証結果

- `npm run build:pages`: 成功
- `npm run test:smoke -- --reporter=list --workers=1`: 34件成功
- `npm run test:balance`: 成功。raw stage winRate 1、avgLordDamage 0。第一侵入隊ではコウモリがHP4で生存するケースを確認。

### 残課題

- 捕獲数は配置・誰が倒すかに左右されやすく、平均捕獲はまだ低め。
- コウモリは初期戦では役割が出たが、後半では落ちやすい。育成・チップ・配置で補う設計にするか、回避/離脱系チップを後で検討する。

### ユーザー指摘

- 戦闘画面でキャラを選択できず、操作できない。
- マップ移動/ズームの操作感が悪い。
- マップサイズに対してキャラアイコンが大きすぎる。
- 通路や部屋が手抜きに見える。

### 修正

- マップをパーセント配置から `1120x680` の仮想ワールド座標に変更。
- 部屋に `w/h` を持たせ、通路を幅のあるSVG corridorとして描画。
- キャラアイコンを小さくし、部屋/通路との比率を改善。
- キャラを部屋単位ジャンプではなく、座標ベースで通路上をリアルタイム移動するように変更。
- 戦闘中に味方/敵/ダウン体/魔王をクリック/タップで選択可能にした。
- 戦闘中の味方に「広間へ」「牢屋へ」「魔王前へ」「自動に戻す」の簡易指示を追加。
- 部屋クリックで、選択中の味方にその部屋への移動指示を出せるようにした。
- マップ操作を、画面全体スクロールではなくマップ内パン/ズームとして整理。ドラッグ中に再描画で操作が切れないようにした。
- `touch-action: none` をマップ領域に設定。

### 追加検証

- `npm run build`: 成功
- `npm run build:pages`: 成功
- `npm run test:smoke`: 8件成功
- 追加テスト：戦闘中のユニット選択、部屋指示、マップズーム

## 2026-06-24 迎撃AI/戦闘テンポ修正

### ユーザー指摘

- 敵が魔王部屋へ余裕で到達し、魔王側の最終ラインで処理されていた。
- モンスターたちが棒立ちに見える。
- 魔王部屋付近で倒れた相手をゴブリンが最後に運んでおり、捕獲がシュールに見えた。

### 修正

- 近接攻撃を同じ部屋限定に変更し、隣室から棒立ちで攻撃しているように見える挙動を削減。
- 味方AIに、生存敵を優先して前線へ向かう迎撃処理を追加。
- `術師狙い` のような専門チップは汎用迎撃に巻き込まないよう、チップ役割を分離。
- 運搬チップより、生存敵への迎撃を優先するように変更。
- 敵に部屋探索時の短い待機時間を追加し、未踏探索として見えるテンポに調整。
- 敵と味方の初期パラメータを再調整し、第一侵入隊では魔王部屋到達前に前線撃退できるバランスに変更。
- ダウン体は担がれた後は時間切れで消えないようにし、運搬中の見た目破綻を修正。
- デバッグ/テスト用に `window.__MAOU_GAME__` を公開。

### 追加検証

- `npm run build`: 成功
- `npm run test:smoke`: 10件成功
- 追加テスト：一定時間後に魔王HPが削れていない、敵が魔王部屋に入っていない、味方が初期位置から迎撃へ動いていることを検証。
- 自動シミュレーション結果：第一侵入隊は魔王HP 100/100、魔王部屋到達 0、撃退 3、捕獲 2。
- スクリーンショット:
  - `screenshots/desktop-intercept-fix.png`
  - `screenshots/mobile-intercept-fix.png`

## 2026-06-24 編成操作/戦闘中指示の修正

### ユーザー指摘

- 編成画面でモンスター選択やチップ変更ができない。
- 戦闘中に直接指示できるのは、チップ采配で自動行動させるゲーム性に反している。

### 修正

- マップ上のモンスタータップを、マップドラッグではなく選択として優先するように変更。
- 編成画面で、モンスター選択・配置変更・チップ着脱が通ることをテスト化。
- 戦闘中の「広間へ」「牢屋へ」「魔王前へ」「自動に戻す」指示ボタンを削除。
- 戦闘中の部屋クリックによる手動移動指示を削除。
- AI側に残っていた手動移動フックも削除し、戦闘は装備チップによる自動行動だけに戻した。
- 戦闘中の選択パネルは、直接指示ではなく装備チップ確認として表示。
- 編成画面のユニットカードを `配下` セクションとして明示し、スマホでも縮んで消えないよう固定。
- 短いスマホ画面ではマップ領域を圧縮し、`配下`、`配置`、`チップ` が同時に見えるよう調整。
- その後、マップを常時フルスクリーン表示に変更し、編成/戦闘メニューは透過ドックとしてマップ上に重ねる構成へ変更。
- 部屋候補とチップ候補は、画面全体ではなくドック内レーンだけ横スクロールする設計に変更。
- スマホで二本指ピンチズームを追加。一本指ドラッグ/ホイール/ボタン操作も維持。
- スマホでは操作ドックが下に重なるため、マップ操作ボタンを上側に移動。

### 追加検証

- `npm run build`: 成功
- `npm run build:pages`: 成功
- `npm run test:smoke`: 16件成功
- 追加テスト：編成中のモンスター選択、配置変更、チップ編集。戦闘中に直接指示ボタンが存在しないこと。
- 追加テスト：短いスマホ画面でも `配下` セクションとユニットカードが表示されること。
- 追加テスト：ピンチズームでマップのズーム値が変化し、画面全体スクロールが発生しないこと。
- スクリーンショット:
  - `screenshots/desktop-setup-edit-fix.png`
  - `screenshots/mobile-setup-edit-fix.png`
  - `screenshots/desktop-battle-no-command-fix.png`
  - `screenshots/mobile-battle-no-command-fix.png`
  - `screenshots/mobileShort-unit-picker-fix.png`
  - `screenshots/desktop-fullscreen-map-dock.png`
  - `screenshots/mobile-fullscreen-map-dock.png`
  - `screenshots/mobileShort-fullscreen-map-dock.png`

## 2026-06-24 部屋防衛/移動チップ制へ修正

### ユーザー指摘

- 配置した部屋の中で戦うべきで、ゴブリンが高速で他部屋の敵へ突っ込むのはおかしい。
- 部屋移動もチップでできるようにすべき。

### 修正

- 味方AIの自動迎撃補助を削除。
- `攻撃` だけを持つ配下は、配置部屋で待ち、同じ部屋に入った敵だけを攻撃するように変更。
- 部屋をまたぐ移動は、明示的な移動チップや `牢屋搬送` の内蔵帰還に限定。
- 担ぎ手が倒れた時にダウン体をその場へ落とし、担ぎ状態が残り続けるバグを修正。
- ダウン体の消滅猶予を12秒に調整し、移動チップ制でも戦闘後の待ち時間が伸びすぎないようにした。

### 追加検証

- `npm run build:pages`: 成功
- `npm run test:smoke`: 16件成功
- 追加テスト：移動チップを持たないゴブリン/スライムが、配置部屋から勝手に離れないこと。

## 2026-06-24 同室ターゲット/キャパ/育成導線の修正

### ユーザー指摘

- `術師狙い` などの狙い系チップが、別部屋の敵を感知して追うのは簡単すぎる。
- 狙い系は「同じ部屋の中で誰を優先して狙うか」の違いであるべき。
- 部屋キャパがないと全員を牢屋横に固められ、集中砲火と全捕獲でつまらない。
- 養分化した時に誰が強化されたか分かりづらく、対象を選べない。
- 初期から全チップが見えており、だんだん選択肢が増える感覚がない。
- 動きが速く、戦闘エフェクトが弱いため何が起きているか分かりづらい。

### 修正

- 狙い系チップを、同じ部屋内の敵に対する優先順位指定へ変更。
- `近敵追跡` を `近敵狙い` に改名し、別部屋追跡ではないことを明確化。
- ダウン体の検知も同じ部屋内に限定。
- 部屋データに `capacity` を追加し、編成時に満員部屋へ配置できないようにした。
- マップ上と配置候補に `現在数/キャパ` を表示。
- 眷属化時の初期配置も空き部屋を使うように変更。
- 捕獲処理画面に養分対象の配下一覧を追加し、対象を選んでから養分化できるようにした。
- 配下に `level` を追加し、養分化で LV+1、HP/ATK 上昇、魔法使い養分時は条件付きで INT 上昇。
- 初期チップ袋を `攻撃`、`牢屋搬送` に絞り、狙い系チップはステージ報酬/研究で増える形に変更。
- 未所持チップは編成UIに表示しないようにし、選択肢が段階的に増える見え方へ変更。
- 移動速度を落とし、攻撃時に対象位置へダメージ/種別エフェクトを表示。
- 敵探索AIが入口側を往復しないよう、隣接未踏がない場合は最寄りの未踏部屋へ向かうよう修正。

### 追加検証

- `npm run build:pages`: 成功
- `npm run test:smoke -- --reporter=list --workers=1`: 20件成功
- 追加テスト：部屋キャパによる配置制限、同室外ターゲット非感知、養分対象選択とLV上昇。

## 2026-06-24 搬送帰還/敵側チップの修正

### ユーザー指摘

- `広間帰還` はおかしい。戻るなら配置部屋へ戻るべき。
- `牢屋搬送` は、牢屋へ運んだ後に配置部屋へ戻るところまでセットでよい。
- 敵がこちらのモンスターを無視して進むのは不自然。侵入者側にもチップが必要。

### 修正

- 配下に `homeRoom` を追加し、編成で配置した部屋を担当部屋として保持。
- 配置変更時と眷属化時に `homeRoom` を設定。
- `広間帰還` を廃止し、任意チップとしては `配置帰還` へ変更。
- 初期装備から帰還チップを外し、`牢屋搬送` に「拾う→牢屋へ運ぶ→配置部屋へ戻る」までを内蔵。
- 戦闘後の再配置時も、配下を担当部屋へ戻す。
- 侵入者側チップ `護衛交戦`、`弱者狙い`、`未踏探索`、`魔王探索` を追加。
- 戦士/盗賊は同じ部屋のモンスターと交戦してから探索、魔法使いは同じ部屋の弱ったモンスターを狙うように変更。
- 敵は同室にモンスターがいる間、攻撃クールダウン中でも移動せず、その場で交戦を継続する。
- 戦闘パネルで選択中の敵チップも表示。

### 追加検証

- `npm run build:pages`: 成功
- `npm run test:smoke -- --reporter=list --workers=1`: 24件成功
- 追加テスト：敵チップで同室モンスターを攻撃すること、搬送後に担当部屋へ戻ること。

## 2026-06-24 養分成長仕様の修正

### ユーザー合意

- `INT=チップ枠` は維持する。上がった時のカタルシスが強いため。
- 養分化は経験値制を持つが、素材タイプごとに伸びる方向が違う。
- 種族ごとの成長傾向も持たせる。
- `INT` は通常EXPとは別の `知能EXP` で上げる。
- チップごとの細かいINT消費制は、プロトタイプでは入れない。

### 修正

- 配下に `exp` と `intExp` を追加。
- 養分素材を `戦士`、`盗賊`、`魔法使い` ごとに分離。
  - 戦士：`EXP+12`、`HP+4`、`ATK+1`
  - 盗賊：`EXP+8`、`知能EXP+1`、`HP+2`、`SPD+0.05`
  - 魔法使い：`EXP+6`、`知能EXP+2`、`ATK+1`
- 種族成長プロファイルを追加。
  - ゴブリン：バランス型、INTも伸ばしやすい
  - スライム：HP型、INTは伸びにくい
  - コウモリ：SPD型、HPは伸びにくい
  - 堕ちた戦士：HP/ATK型
  - 影走り：SPD/INT寄り
  - 闇術師：INT型
- `LV EXP` が必要値に達すると `LV UP` し、種族ごとのHP/ATK/SPD成長を適用。
- `知能EXP` が種族ごとの必要値に達すると `INT+1`。`INT` はチップ装備枠としてそのまま使う。
- 捕獲処理画面の養分ボタンに、実際に入る `EXP`、`知能EXP`、即時ステータス上昇、LV/INT上昇をプレビュー表示。
- 編成画面の配下カードと能力欄に `EXP` と `知能EXP` を表示。

### 追加検証

- `npm run build:pages`: 成功
- `npm run test:smoke -- --reporter=list --workers=1`: 24件成功
- 追加テスト：魔法使いをスライムの養分にした時、`EXP+6`、`知能EXP+2`、`ATK+1` が適用され、即時LVアップではなく経験値蓄積になること。

## 2026-06-25 Claude Design 前 UI 機能整備

### 目的

Claude Design に UI 設計を依頼する前に、必要な操作・表示・判断材料をプロトタイプ上に一通り実装する。

### 追加実装

- 編成画面にチップ詳細、未発見チップ表示、チップ入れ替え、編成警告、次の敵情報、チップ解放履歴を追加。
- 配下ステータスに成長傾向、担当部屋、EXP、知能EXPを表示。
- 戦闘画面に一時停止、速度切替、リトライ、撤退、ログ表示/非表示を追加。
- 戦闘画面に運搬中状態、ダウン敵残り時間、魔王部屋発見状態、与ダメ/被ダメ表示を追加。
- マップ操作に選択対象フォーカス、侵入者フォーカスを追加。
- 捕獲処理で複数捕獲敵を選択できるように変更。
- 眷属化プレビュー、養分プレビュー、現在→強化後比較、研究候補表示を追加。
- チップ解放履歴を状態に追加し、ステージ報酬/研究で更新。
- ダメージ実績を `metrics` として記録。
- `npm run test:balance` を追加し、ステージ別/キャンペーンの勝率、捕獲、魔王被ダメ、与ダメ/被ダメを確認できるようにした。
- ステージ報酬が次ステージ報酬になっていたバグを修正。クリアしたステージの報酬を受け取るようにした。
- 第3ステージは敵数を維持しつつ、出現間隔を広げてキャンペーン検収で勝てるテンポに調整。
- `UI_READINESS.md` を追加し、Claude Design 依頼前の機能棚卸しを記録。

### 検収

- `npm run build:pages`: 成功
- `npm run test:smoke -- --reporter=list --workers=1`: 30件成功
- `npm run test:balance`: 成功
- バランス結果：Raw stage は 2/3 勝利、キャンペーン検収は勝利、最終キャンペーン魔王被ダメ 0。
- スクリーンショット更新：
  - `screenshots/desktop-ui-readiness-setup.png`
  - `screenshots/desktop-ui-readiness-battle.png`
  - `screenshots/desktop-ui-readiness-upgrade.png`
  - `screenshots/mobile-ui-readiness-setup.png`

## 2026-06-26 PC前提化・20ステージ化・素材生成導線

### 目的

PCフルスクリーン/ウィンドウで遊ぶゲームとして、広いダンジョン表示、長期キャンペーン、敵職の多様化、ドロップ/資金/アイテム導線、画像生成アセット導線の土台を作る。

### 追加実装

- ステージを3から20へ拡張。
- 敵職を12種へ拡張。
  - 戦士、盗賊、魔法使い、盾兵、弓兵、僧侶、騎士、錬金術師、獣使い、聖騎士、賢者、勇者。
- 捕獲後の眷属化先を追加。
  - 骨衛兵、ゴブリン隊長、瘴気スライム、小悪魔射手、影託者など。
- 敵ごとに捕獲難度、ダウン猶予、ゴールド、ドロップアイテムを追加。
- アイテムデータ `src/data/items.js` を追加。
  - 錆びた剣、斥候の靴、魔素の粉、銀の拘束具、拡張石材、賢者のインク。
- 撃破時にゴールドとアイテムを獲得するようにした。
- ゲーム状態に `gold`、`inventory`、`lootLog` を追加。
- 編成/戦闘/結果画面に資金・所持アイテム・今回獲得ログを表示。
- ステージ報酬にゴールドを追加し、クリア時に受け取るようにした。
- 新チップ `遠隔狙い`、`希少狙い` を追加。
- `術師狙い` は魔法使いだけでなく、僧侶、錬金術師、賢者も対象にした。
- 新敵職に対応した養分化素材効果と成長プロファイルを追加。
- PC向けに仮想ワールドを `1540x900` へ拡張し、部屋間隔を広げた。
- 部屋データに `built`、`buildCost`、`upgradeCost` を追加し、今後の部屋建設/拡張実装の土台を作った。
- UIパネルの透過度を上げ、PCではパネル幅とマップ操作ボタンを少し広げた。
- `ASSET_PIPELINE.md` を追加し、画像生成アセットの保存先、キャラ動作分割、命名規則、生成プロンプト基準を定義。
- `assets/generated/` 配下に生成原本保存用ディレクトリを追加。
- 画像生成でゴブリンの `idle/walk/attack/downed` 風モーションシートを生成し、`assets/generated/characters/goblin/sheet-v1.png` に保存。
- 追加指摘を受け、キャラ向きは斜めではなく上下左右の4方向に変更。絵柄もリアル寄りではなく、ファイナルファンタジータクティクスを目安にした少し荒めのドット絵へ寄せる方針に修正。
- 方針修正版のゴブリンシートを `assets/generated/characters/goblin/sheet-v2-cardinal-fft.png` に保存。
- PC/スマホ確認用スクリーンショットを追加。
  - `screenshots/desktop-wide-setup.png`
  - `screenshots/mobile-wide-setup.png`

### 検証結果

- `npm run build:pages`: 成功
- `npm run test:smoke -- --reporter=list --workers=1`: 34件成功
- `npm run test:balance`: 成功
- バランス結果：
  - Raw stage: 20ステージ中14勝、winRate 0.7、avgCaptured 1、avgLordDamage 30。
  - Campaign: 育成/研究込みで20ステージ勝利。

### 残課題

- 部屋建設/拡張はデータ土台まで。実際にゴールドで建設・拡張する操作は未実装。
- ゴールドの使い道はまだステージ報酬/ドロップ表示まで。ショップ、研究ガチャ、アイテム売却、チップ購入は未実装。
- 生成ゴブリンは原本保存まで。ゲーム内で使うには、透過/切り出し/縮小/アニメーション割当が必要。
- 新敵職は既存スプライトを仮参照している。生成素材への置換が必要。
