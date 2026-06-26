# PROGRESS

## 2026-06-26 後半敵の職シルエット強化

### 目的

後半敵職の一部がベース職の色違いに見えやすく、戦闘中に「何の職が来たか」を読み取りづらかった。専用生成シートへ置き換える前の中間改善として、既存の亜種生成スクリプトに職ごとの装備/記号差分を加える。

### 修正

- `scripts/make_enemy_variant_sprites.py` を、単純な色替えだけでなく、職ごとの小さな装備差分を描き足す処理へ拡張した。
- `ranger` は弓、`cleric` は聖印と杖、`knight` は槍と兜飾り、`paladin` は槍と聖印、`alchemist` は薬瓶とゴーグル、`sage` は杖と魔術印、`beastTamer` は鞭、`hero` は剣/兜飾りを重ねる。
- `guard` は専用盾兵シートがあるため、亜種生成対象から外し、再生成で上書きしないようにした。
- 8職の `idle / walk / attack / downed` x `front/back/left/right` を再生成し、派生 `walk` 3フレーム、`attack` 2フレームも再生成した。
- `screenshots/sprite-direction-audit-enemies.png` と `screenshots/sprite-animation-audit.png` を更新した。

### 検証結果

- `python scripts/make_enemy_variant_sprites.py`: 8職を再生成。
- `python scripts/make_micro_animation_frames.py`: 24スプライトフォルダ、480フレーム生成・接続。
- `python scripts/make_sprite_direction_audit_enemies.py`: 成功。敵職の監査画像を目視確認。
- `python scripts/make_sprite_animation_audit.py`: 成功。

### 残課題

- 今回の装備差分はプロトタイプ用の自動描き足し。本番では職ごとの専用生成シートへ置き換える。
- レンジャー/獣使いはまだ小さめの差分なので、専用素材化時に弓や鞭のシルエットをもっと大きく取る。

## 2026-06-26 キャラクターモーション再検収

### 目的

`spriteSet` の単一PNG/複数フレーム配列両対応、簡易フレーム生成、PC幅戦闘画面での歩行フレーム切替が現行コードで維持されていることを再確認する。

### 確認内容

- `scripts/make_micro_animation_frames.py` を再実行し、24スプライトフォルダに `walk` 3フレーム、`attack` 2フレームを再生成した。
- `src/data/spriteAnimations.js` が実在ファイル由来で再生成され、配列がない場合は `spriteSetFor` の単一PNG fallback が残ることを確認した。
- `scripts/make_sprite_animation_audit.py` で `screenshots/sprite-animation-audit.png` を再生成し、walk/attackフレームの欠けがないことを目視確認した。
- PlaywrightでPC幅の戦闘画面を固定し、選択中ゴブリンが `walk-right-0..2.png` の3フレームを切り替える状態で `screenshots/sprite-animation-battle-desktop.png` を更新した。

### 検証結果

- `python scripts/make_micro_animation_frames.py`: 24スプライトフォルダ、480フレーム生成・接続。
- `python scripts/make_sprite_animation_audit.py`: 成功。
- Playwright PC幅確認: 選択ゴブリンの `data-sprite-frame` が `1,0,1,2,0` と遷移し、`data-sprite-frame-count="3"` を確認。
- `npm test -- --reporter=line`: 94件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

### 残課題

- 現在の微差分フレームは基盤検証用であり、本番絵ではない。
- 近接、弓、魔法、魔王専用攻撃の差分は、本番用2から4フレーム素材へ置き換える。

## 2026-06-26 捕獲準備UI

### 目的

捕獲レポートで結果は見えるようになったが、防衛開始前に「次は誰を捕獲したいか」「運搬役は足りているか」がまだ散らばっていた。準備画面の情報タブに捕獲準備を追加し、次ステージの高価値捕獲対象と運搬体制を一箇所で確認できるようにする。

### 修正

- 情報タブに `捕獲準備` を追加し、次ステージの捕獲対象、捕獲難度、ダウン猶予、運搬役数、現在のダウン猶予ボーナスを表示するようにした。
- 捕獲価値の高い敵を、捕獲難度と身代金価値から上位表示するようにした。
- 捕獲準備の対象に、身代金、眷属化先、養分効果を表示し、どの敵を捕ると何が嬉しいかを防衛前に読めるようにした。
- `希少狙い` チップに空きがあり、攻撃可能な配下が未装備の場合は、捕獲準備から直接その配下へ `希少狙い` を渡せるようにした。
- `牢屋搬送` チップに空きがあり、運搬可能な配下が未装備の場合は、捕獲準備から直接その配下へ `牢屋搬送` を渡せるようにした。
- Playwrightで、賢者ステージ前に捕獲準備が表示され、ゴブリンへ `希少狙い` と `牢屋搬送` を再装備できることを固定した。

### スクリーンショット

- `screenshots/capture-prep-setup-desktop.png`

### 検証結果

- `npm test -- --reporter=line -g "setup scout panel|setup shows advice"`: 4件成功。
- `npm test -- --reporter=line`: 94件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

## 2026-06-26 捕獲レポートUI

### 目的

捕獲は本作の中核だが、これまでは戦闘結果で捕獲済み数だけが見え、何回捕獲機会があり、何が原因で逃したのかが読み取りづらかった。戦闘結果と戦後処理に捕獲レポートを追加し、次の配置・チップ・アイテム投資へつながる判断材料にする。

### 修正

- 戦闘状態に `captureStats` を追加し、ステージ開始時に捕獲機会、成功、消滅、運搬中断をリセットするようにした。
- 敵をダウンさせた時点で捕獲機会を記録し、牢屋搬送成功、ダウン猶予切れ、運搬役の死亡/無効化による中断を集計するようにした。
- 戦闘結果と戦後処理に `捕獲レポート` を表示し、機会、成功、消滅、成功率、失敗理由を確認できるようにした。
- ダウン猶予切れが多い場合は、牢屋搬送役や `銀の拘束具` を示唆する文言を出し、捕獲改善の投資判断へつなげる。
- `銀の拘束具` を所持していて牢屋が使える場合は、捕獲レポートから戦後処理の戦利品タブへ直接移り、牢屋への使用候補を確認できるようにした。
- Playwrightで、捕獲機会を逃した結果画面から戦後処理へ進んでも、捕獲レポートが表示され続けることを固定した。

### スクリーンショット

- `screenshots/capture-report-result-desktop.png`

### 検証結果

- `npm test -- --reporter=line -g "capture report|upgrade investment|upgrade management"`: 6件成功。
- `npm test -- --reporter=line`: 94件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

## 2026-06-26 戦後投資提案UI

### 目的

戦後処理で、チップ研究、魔物研究、部屋拡張、部屋建設、アイテム使用の選択肢は揃ってきたが、次の敵に向けて何へ資金を使うべきかはまだ読み取りづらかった。次ステージの敵傾向、所持チップ、所持品、配下数、部屋キャパから投資提案を出し、ダンジョン強化の意思決定をつなげる。

### 修正

- 投資タブに `投資提案` を追加し、上位4件の推奨行動を表示するようにした。
- 戦後処理中の敵情報/投資判断は、クリア済みステージではなく次ステージを見るようにした。
- 次敵対策チップが未所持ならチップ研究、高難度捕獲かつ `銀の拘束具` 所持なら戦利品使用、配下数が不足していれば魔物研究を提案する。
- 未発見チップが残っていれば `禁書庫`、配下増加余地があれば `魔物巣`、所持品上限が近ければ `宝物庫` の建設提案を出す。
- 提案行クリックで、研究/戦利品/建設など該当タブへ移り、部屋や建設候補も選択状態にする。
- Playwrightで、賢者後の戦後処理から `銀の拘束具` 提案で戦利品タブへ、`禁書庫建設` 提案で建設タブへ移れることを固定した。

### スクリーンショット

- `screenshots/investment-advice-desktop.png`

### 検証結果

- `npm test -- --reporter=line -g "investment advice|upgrade management"`: 4件成功。
- `npm test -- --reporter=line`: 92件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

## 2026-06-26 配置提案UI

### 目的

次敵対策チップ提案で「何を意識するか」は見えるようになったが、それをどの部屋配置へ落とすかはまだプレイヤー任せだった。次ステージの敵傾向と配下のチップ/能力から、準備画面で配置候補を提示し、編成判断を一段つなげる。

### 修正

- 配置タブに `配置提案` を追加し、配下ごとに推奨部屋と理由を表示するようにした。
- 次ステージの敵に術師/遠距離/高速/高捕獲難度がいるかを読み、配下の `牢屋搬送`、狙いチップ、速度、射程と合わせて候補部屋を決めるようにした。
- 提案行をクリックすると、対象配下をその部屋へ配置し、担当部屋 `homeRoom` も更新する。
- 部屋キャパを見て、満員部屋は避けて次候補へfallbackする。
- Playwrightで、賢者ステージ前にスライムの配置提案が表示され、クリックで広間へ配置されることを固定した。

### スクリーンショット

- `screenshots/placement-advice-desktop.png`

### 検証結果

- `npm test -- --reporter=line`: 90件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

## 2026-06-26 キャラクターモーション再検収

### 目的

既存の `idle / walk / attack / downed` x `front/back/left/right` 単一PNG切替を壊さず、`walk` と `attack` の複数フレーム配列が実ファイルから再生成・接続・表示できることを確認する。

### 確認内容

- `scripts/make_micro_animation_frames.py` を再実行し、24スプライトフォルダに `walk` 3フレーム、`attack` 2フレームを生成し直した。
- `src/data/spriteAnimations.js` は実在フレーム由来のマニフェストとして再生成され、単一PNG fallback と両立している。
- `scripts/make_sprite_animation_audit.py` で `screenshots/sprite-animation-audit.png` を更新した。
- PlaywrightでPC幅の戦闘画面を作り、歩行中ゴブリンが `walk-right-0..2.png` のフレームを切り替える状態で `screenshots/sprite-animation-battle-desktop.png` を更新した。

### 検証結果

- `python scripts/make_micro_animation_frames.py`: 24スプライトフォルダ、480フレーム生成・接続。
- `python scripts/make_sprite_animation_audit.py`: 成功。
- `npm test -- --reporter=line`: 90件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

### 残課題

- 現在の微差分フレームは基盤検証用であり、本番絵ではない。
- 攻撃は近接/弓/魔法ごとの専用構え差分へ置き換える余地がある。射出物は引き続きキャラ絵ではなくエフェクト側で表現する。

## 2026-06-26 次敵対策チップ提案

### 目的

チップ相性リストで「誰に渡すか」は見えるようになったが、次の敵編成に対してどのチップを意識すべきかはまだプレイヤーが読み解く必要があった。準備画面の戦略感を強めるため、次ステージの敵職、射程、捕獲難度、速度から対策チップを提示する。

### 修正

- `次敵対策` リストを追加し、遠距離職には `遠隔狙い`、術師系には `術師狙い`、捕獲難度が高い敵には `希少狙い` と `牢屋搬送`、速い敵には `接近` を候補として出すようにした。
- 所持しているチップは名前と所持数を表示し、未所持/未発見チップはカテゴリ系 `????` として伏せるようにした。
- 次敵情報パネルとチップ編成画面の両方に表示し、所持済みの対策チップはクリックでチップ詳細へ切り替えられるようにした。
- Playwrightで、賢者ステージの対策表示と、チップ画面で対策行から `術師狙い` 詳細へ切り替わることを固定した。

### スクリーンショット

- `screenshots/next-enemy-chip-advice-desktop.png`

### 検証結果

- `npm test -- --reporter=line -g "scout panel|chip research|setup shows advice"`: 6件成功。
- `npm test -- --reporter=line`: 88件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

## 2026-06-26 チップ相性リスト

### 目的

発見したチップを編成画面へつなげても、どの配下へ持たせると意味があるかはまだ読み取りづらかった。新しいチップを「誰に渡すか」で悩むゲーム性を強めるため、チップ詳細内に配下ごとの相性と直接装備操作を追加する。

### 修正

- チップ詳細に `配下相性` リストを追加し、各配下の知性枠、装備枠、運搬可否、攻撃役/移動向きなどをもとに `相性高`、`有効`、`要検討`、`不可` を表示するようにした。
- 相性行をクリックすると、対象配下を選択し、そのチップを直接装備するようにした。空き枠がある場合は追加、満枠の場合は従来の入替ルールを使う。
- Playwrightで、発見チップから編成画面へ移った後、相性リストからスライムへチップを渡せることを固定した。

### スクリーンショット

- `screenshots/chip-affinity-list-desktop.png`

### 検証結果

- `npm test -- --reporter=line -g "chip research|setup supports monster selection|setup supports drag placement"`: 6件成功。
- `npm test -- --reporter=line`: 88件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

## 2026-06-26 発見チップの編成導線

### 目的

チップ発見カードで新しい作戦内容は読めるようになったが、次に「誰へ持たせるか」を考える導線がまだ弱かった。発見直後の興味をそのままチップ編成へつなげ、段階的に行動選択肢が増える体験を強める。

### 修正

- チップ発見カードに `編成で試す` ボタンを追加した。
- アップグレード中に押すと、次の防衛準備へ進み、チップタブを開き、発見したチップを選択状態にするようにした。
- 最終ステージ後の勝利遷移には干渉しないよう、次ステージがある時だけボタンを表示する。
- Playwrightで、研究で未発見チップを解放した後、`編成で試す` から次ステージ準備のチップ詳細へ着地することを固定した。

### スクリーンショット

- `screenshots/chip-discovery-prepare-chips-desktop.png`

### 検証結果

- `npm test -- --reporter=line -g "chip research|first reward|upgrade management"`: 6件成功。
- `npm test -- --reporter=line`: 88件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

## 2026-06-26 チップ発見カード

### 目的

チップ研究で `????` が判明しても、これまでは小さな履歴とログに埋もれやすかった。段階的に作戦チップが増える体験を強めるため、直近で解放されたチップの名前、カテゴリ、所持数、説明を研究/投資パネル内で読めるようにする。

### 修正

- `lastChipDiscovery` をゲーム状態に追加し、研究、開発、捕獲研究、報酬で増えた直近チップを保持するようにした。
- 研究パネルと投資パネルに `chip-discovery-card` を追加し、新発見/追加開発、カテゴリ、所持数、説明を表示するようにした。
- 研究候補の省略表示を `ほか6` から `他6` に短縮し、狭いカード内で不自然に改行されにくくした。
- Playwrightで、未発見チップ研究後に発見カードと `lastChipDiscovery` が更新されることを固定した。

### スクリーンショット

- `screenshots/chip-discovery-card-desktop.png`

### 検証結果

- `npm test -- --reporter=line -g "chip research|upgrade management|captured enemy research"`: 6件成功。
- `npm test -- --reporter=line`: 88件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

## 2026-06-26 チップ研究の未発見優先

### 目的

チップ研究の表示は `未発見優先` になっていたが、実処理は既知チップも含めてランダム抽選していた。段階的に作戦チップが増える感触を強めるため、研究は未発見チップの解放を優先し、既知チップの枚数追加は開発側に寄せる。

### 修正

- `chipResearchCandidates` を追加し、未発見チップが残っている間は未発見チップだけを研究候補にするようにした。
- すべて発見済みになった後は、従来どおり所持数3未満のチップを追加研究できる。
- 研究プレビューも同じ候補順を使い、未発見チップの `????` 表示が先に出るようにした。
- Playwrightで、既知チップが残っていても未発見チップが先に研究されることを固定した。

### スクリーンショット

- `screenshots/chip-research-unknown-priority-desktop.png`

### 検証結果

- `npm test -- --reporter=line -g "chip research|upgrade management"`: 4件成功。
- `npm test -- --reporter=line`: 88件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

## 2026-06-26 建設プレビューのパネル回避

### 目的

建設候補カードを右端へドラッグした時に、予定部屋が右パネルの下へ潜って見えなくなる状態を防ぐ。マップを主役にしたまま、置こうとしている部屋を見ながら判断できるようにする。

### 修正

- 建設ドラッグ中の予定部屋矩形を画面座標で確認し、右パネルと重なりそうな場合はカメラを左へ逃がすようにした。
- 通常のカメラ境界は維持しつつ、建設プレビュー回避時だけ右パネル幅ぶんの追加余白を許可するようにした。
- `drop` 時はカーソル座標を再計算してズレるのではなく、ドラッグ中に表示していた `自由` 候補をそのまま確定するように修正した。
- Playwrightで、PC幅では予定部屋が右パネルへ食い込まないことを固定した。

### スクリーンショット

- `screenshots/build-preview-panel-clearance-desktop.png`

### 検証結果

- `npm test -- --reporter=line -g "corridors use orthogonal"`: 2件成功。
- Playwright PC幅確認: 予定部屋右端 `876`、パネル左端 `910` で重ならないことを確認。
- `npm test -- --reporter=line`: 86件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

## 2026-06-26 マップカメラの境界制御

### 目的

PCフルスクリーンの広いダンジョンをパン/ズームする時に、視界がワールド外へ抜けすぎて空白ばかりになる状態を防ぐ。建設ドラッグ中の端自動パン、ホイールズーム、ピンチズーム、通常ドラッグを同じ境界ルールへ揃える。

### 修正

- `constrainCamera` を追加し、ワールドが画面より小さい時は中央寄せ、大きい時はPC160px/スマホ80pxの余白だけ許してカメラをクランプするようにした。
- マップ操作ボタン、ホイールズーム、ピンチズーム、ドラッグパン、建設ドラッグ端パンがすべて境界制御を通るようにした。
- Playwrightで、極端なパン操作をしてもカメラがダンジョン境界内に留まることを固定した。

### スクリーンショット

- `screenshots/map-camera-bounds-desktop.png`

### 検証結果

- `npm test -- --reporter=line -g "map supports pinch|map camera stays|battle supports unit selection"`: 6件成功。
- `npm test -- --reporter=line`: 86件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

## 2026-06-26 建設ドラッグ中の端自動パン

### 目的

広いPC向けダンジョンで、建設候補カードをマップ端へドラッグした時に視界も一緒に動くようにする。自由配置が東西南北へ広がっても、いったんドラッグを止めてマップ操作へ持ち替える手間を減らす。

### 修正

- 建設候補の `dragover` / `drop` 時に、カーソルがマップ端88px以内へ入ったらカメラを170px分パンするようにした。
- 自動パン後のカメラ座標でワールド座標を計算し、自由建設候補がパン先の位置へスナップするようにした。
- Playwrightで、右端ドラッグ時にカメラが東側へ動き、通常クリック候補より東側に `自由` 候補が作られることを固定した。

### スクリーンショット

- `screenshots/build-drag-autopan-desktop.png`

### 検証結果

- `npm test -- --reporter=line -g "corridors use orthogonal"`: 2件成功。
- Playwright PC幅確認: 右端ドラッグでカメラ `x=-760 -> -930`、自由候補 `x=4260` を確認。
- `npm test -- --reporter=line`: 84件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

## 2026-06-26 遠距離攻撃スプライト分離の検収追加

### 目的

弓や魔法の射出物をキャラ絵に含めず、射出エフェクトとして別表示する方針をテストで固定する。キャラ本体の `attack` 状態と、表示する本体スプライトを分ける。

### 修正

- 遠距離攻撃中でも、本体画像は `attack-*.png` ではなく `idle-*.png` を使うことをPlaywrightで固定した。
- 既存の射出エフェクト検証と合わせて、キャラ絵と矢/魔法玉の重複表示が再発しないようにした。

### 検証結果

- `npm test -- --reporter=line -g "ranged attacks show|ranged attack poses"`: 4件成功。

## 2026-06-26 キャラクターモーション基盤の補強

### 目的

`idle / walk / attack / downed` x `front/back/left/right` の単一PNG切替を残しつつ、`walk` と `attack` は2〜4フレームのスプライトアニメーションへ拡張できる状態を堅くする。Spine / Live2D / AI動画ではなく、既存ドット絵スプライトパイプラインを伸ばす。

### 修正

- `scripts/make_micro_animation_frames.py` が既存PNGから微差分フレームを生成した後、実在するフレームだけを `src/data/spriteAnimations.js` へ書き出すようにした。
- `spriteAnimations.js` を実ファイル由来の明示マニフェストに更新し、フレームがないユニットは `spriteSetFor` の単一PNG参照にfallbackする運用を明確にした。
- 複数フレーム配列を使うユニットでは、CSSの歩行揺れを止め、攻撃は軽い明度パルスだけにして、画像フレーム切替とCSS踏み込みが喧嘩しないようにした。
- Playwrightの素材テストを、固定24体前提ではなく、`public/assets/sprites/` の実在フレームと `spriteAnimations` が一致することを見る形へ補強した。

### スクリーンショット

- `screenshots/sprite-animation-audit.png`
- `screenshots/sprite-animation-battle-desktop.png`

### 検証結果

- `python scripts/make_micro_animation_frames.py`: 24スプライトフォルダ、480フレーム生成・接続。
- `python scripts/make_sprite_animation_audit.py`: `screenshots/sprite-animation-audit.png` を生成。
- Playwright PC幅確認: 歩行中ゴブリンの `data-sprite-frame` が `0/1/2` に切り替わることを確認し、`screenshots/sprite-animation-battle-desktop.png` を生成。
- `npm test -- --reporter=line`: 82件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

## 2026-06-26 建設カードのドラッグ中プレビュー

### 目的

クリックで自由候補を置く操作からさらに進めて、建設候補カードをマップ上へドラッグしている最中に予定部屋が追従し、ドロップでその場所へ建設できるようにする。部屋をカードとして持ってマップへ置く感覚を強める。

### 修正

- 建設候補カードの `dragstart` でドラッグ中ペイロードを保持するようにした。
- マップ上の `dragover` で、カーソル位置をワールド座標へ変換し、`customBuildSlot` をリアルタイム更新するようにした。
- マップ上の `drop` で、更新済みの自由候補へそのまま部屋を建設するようにした。
- 合成DragEventでは `dataTransfer.getData()` が空になりやすいため、ドラッグ中ペイロードのfallbackを追加した。
- Playwrightで、ドラッグ中プレビュー生成とドロップ建設を固定した。

### スクリーンショット

- `screenshots/build-drag-placement-desktop.png`

### 検証結果

- 建設関連のPlaywright絞り込み検証: 成功。
- `npm test -- --reporter=line`: 82件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

## 2026-06-26 マップクリックによる自由建設候補

### 目的

固定配置候補からさらに進めて、建設モード中にマップ上の空き地をクリックし、グリッドにスナップした自由配置候補を作れるようにする。部屋をどこに置くかをマップ上で直接決める感覚に近づける。

### 修正

- `customBuildSlot` を追加し、マップ上クリックで `自由` 配置候補を生成できるようにした。
- 自由配置候補は90pxグリッドへスナップし、部屋がワールド端へはみ出しすぎないよう外周マージンで制限する。
- 固定候補と自由候補を `buildSlotList` でまとめ、配置点カード、マップ上スロット、建設処理が同じ候補リストを見るようにした。
- 自由候補でも既存の部屋サイズ衝突判定を使い、重なる場合は建設不可にする。
- マップ上の自由候補は水色寄りの枠で表示し、固定候補と区別できるようにした。
- Playwrightでマップクリックから自由候補を作り、その位置へ部屋を建設できることを固定した。

### スクリーンショット

- `screenshots/build-free-placement-desktop.png`

### 検証結果

- 建設関連のPlaywright絞り込み検証: 成功。
- `npm test -- --reporter=line`: 82件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

## 2026-06-26 建設配置候補の拡張と衝突判定

### 目的

固定8スロットだけでは部屋配置がリスト選択に見えやすいため、マップ上の候補点を増やし、部屋サイズ込みで既存部屋との重なりを判定する。自由グリッド配置の前段として、配置候補が増えても破綻しない状態にする。

### 修正

- 建設配置候補を8点から15点へ拡張した。
- `roomAtBuildSlot`、`roomCollidesAtSlot`、`buildSlotBlocked` を追加し、選択中の部屋サイズで既存部屋と重ならないか判定するようにした。
- 建設候補カード、配置点カード、マップ上の配置点、実建設処理が同じ衝突判定を見るようにした。
- 既存部屋と近すぎる配置点は `重複` と表示し、選択/建設できないようにした。
- 衝突中の建設プレビューは赤い破線の予定部屋として表示する。

### スクリーンショット

- `screenshots/build-grid-collision-desktop.png`

### 検証結果

- 建設関連のPlaywright絞り込み検証: 成功。
- `npm test -- --reporter=line`: 82件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

## 2026-06-26 部屋建設のマップ上プレビュー

### 目的

建設候補を右パネルのカードだけで選ぶ状態から、マップ上で予定部屋と予定通路を見ながら選べる状態へ寄せる。まだ自由グリッド配置ではないが、どこに何が建つかを事前に読めるようにする。

### 修正

- ゲーム状態に `selectedBuildRoom` を追加し、建設候補のフォーカスでプレビュー対象を切り替えられるようにした。
- 建設モードでは、選択中の配置点に半透明の予定部屋を表示するようにした。
- 選択中の接続元扉から予定部屋の扉まで、点線の予定通路を表示するようにした。
- 建設スロット表示を戦後処理の建設タブでも出すようにし、パネルとマップの選択状態を揃えた。
- 建設候補カードのホバー/フォーカスでプレビューを更新する。ホバー時は短くデバウンスし、横レーン移動中の過剰な再描画を抑えた。

### スクリーンショット

- `screenshots/build-preview-desktop.png`

### 検証結果

- 建設関連のPlaywright絞り込み検証: 成功。
- `npm test -- --reporter=line`: 82件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

## 2026-06-26 部屋建設の接続扉選択

### 目的

部屋建設時に、接続元の部屋からどの扉へ通路を伸ばすかを選べるようにする。配置点だけでなく、北/東/南/西の接続口を明示して、部屋と通路が実在する構造に見える状態へ近づける。

### 修正

- `doorSides`、`doorPoint`、`connectionDoorSide` を追加し、部屋の上下左右の扉点を共有データとして扱うようにした。
- 建設タブに `接続扉` レーンを追加し、接続元、接続扉、配置点、建設候補を順に選ぶ形へ変更した。
- 建設時に選んだ扉方向を `game.roomConnectionDoors` に保存し、マップ描画と戦闘中の移動経路がその扉点を使うようにした。
- 扉指定がない既存接続や古い状態では、従来どおり部屋位置から自動推定した扉へ fallback する。
- 部屋建設候補の説明を `広間東扉から 北へ` のようにし、内部IDではなくプレイヤーが判断できる表現へ寄せた。

### スクリーンショット

- `screenshots/build-door-selection-desktop.png`

### 検証結果

- 建設関連のPlaywright絞り込み検証: 成功。
- `npm test -- --reporter=line`: 82件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

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
- 速度操作を `pointerdown` でも即時反応するようにし、戦闘中の連続再描画中でも `1x/2x/4x` と一時停止を選択しやすくした。停止ボタンは通常アクションから分離し、倍率ボタンは独立したセグメントとして表示する。
- 次の敵情報に、敵ごとの捕獲難度、ダウン猶予、身代金、ドロップ、眷属化先、養分素材を表示。敵数だけでなく「誰を捕獲したいか」を編成時に判断できるようにした。
- 戦後処理の管理タブに `投資` を追加し、チップ研究、魔物研究、選択部屋拡張、既知チップ開発を同じ画面で比較できるようにした。資金をチップ・配下・部屋のどこへ使うかが見えやすくなる。
- 捕獲敵の `研究` を敵職ごとの作戦チップ解析に変更。盗賊なら `配置帰還/接近`、賢者なら `希少狙い/発見者狙い/術師狙い` のように、捕獲対象の特徴から増やせるチップが見える。
- 宝物庫、禁書庫、魔物巣、武具庫のリスクを戦闘tick上のE2Eで固定。敵侵入時に、略奪、魔王部屋発覚、配下混乱、敵武装が実際に発火することを確認できるようにした。
- 盾兵 `guard` を色替え流用から専用生成シートに差し替え、盾を持つシルエットとして判別しやすくした。
- `scripts/slice_dedicated_enemy_sheets.py` を追加し、単体生成した敵職シートを `idle/walk/attack/downed` x `front/back/left/right` に切り出せるようにした。

### 検証結果

- `npx playwright test tests/smoke.spec.js -g "stage runs|result can continue"`: 4件成功
- `npx playwright test tests/smoke.spec.js -g "setup reveals|corridors use|setup supports drag"`: 6件成功
- `npx playwright test tests/smoke.spec.js -g "feeding a captured"`: 4件成功
- `npx playwright test tests/smoke.spec.js -g "setup shows advice|setup scout panel"`: 4件成功
- `npx playwright test tests/smoke.spec.js -g "upgrade management supports"`: 2件成功
- `npx playwright test tests/smoke.spec.js -g "upgrade flow supports captured|captured enemy research"`: 4件成功
- `npm test`: 76件成功
- `npm run build`: 成功
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- 初期状態のシミュレーション確認: ゴブリン1体でステージ1は敵2体、魔王無傷、捕獲1体以上で勝利。
- 速度UIは `4x -> 1x -> 2x` の順に選択でき、内部速度値も更新されることをテストで確認。加えて速度ボタン中央が最前面要素になっており、各ボタンが44px以上の実タップ領域を持つことをPC/スマホで固定。320px幅でも一時停止、`4x`、`2x` を選択できることを追加テストで確認。
- 敵偵察UIは、序盤の戦士/盗賊と、後半の賢者が捕獲価値・ドロップ・眷属化先・養分素材込みで表示されることをテストで確認。
- 投資UIは、チップ研究、魔物研究、広間拡張、攻撃チップ開発が戦後画面で見えることをテストで確認。
- 捕獲研究UIは、研究候補が敵職に紐づいて表示され、盗賊研究で `配置帰還` チップが増えることをテストで確認。
- リスク部屋は、宝物庫で `G-16` とアイテム喪失、禁書庫で魔王部屋発覚、魔物巣で配下の攻撃遅延、武具庫で侵入者攻撃+1が発火することをテストで確認。
- 目視確認: 初回セットアップで上級タブが隠れ、ダンジョン全体に透過パネルが重なる状態を確認。

### スクリーンショット

- `screenshots/tutorial-setup-minimal-tabs-desktop.png`
- `screenshots/speed-ui-desktop-after.png`
- `screenshots/speed-ui-mobile-after.png`
- `screenshots/enemy-scout-desktop.png`
- `screenshots/enemy-scout-mobile.png`
- `screenshots/upgrade-investment-desktop.png`
- `screenshots/upgrade-investment-mobile.png`
- `screenshots/captured-research-desktop.png`
- `screenshots/captured-research-mobile.png`

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

## 2026-06-26 スプライト簡易アニメーション基盤

### 目的

既存の `idle / walk / attack / downed` x `front/back/left/right` の単一PNG切替を壊さず、将来2〜4フレームのドット絵スプライトアニメーションへ拡張できるようにする。

### 追加実装

- `spriteSet` が単一PNGパスと複数フレーム配列の両方を扱えるようにした。
- `src/data/spriteAnimations.js` を追加し、まず `goblin`、`slime`、`warrior`、`rogue`、`mage`、`guard` の `walk` 3フレーム、`attack` 2フレームを接続した。
- `mapView` 側で、移動中は `walk` フレームを時間ループし、攻撃直後は `attack` フレームを残りモーション時間に応じて切り替えるようにした。
- ユニットIDごとに歩行アニメーションの位相をずらし、全員が完全同期して歩かないようにした。
- 配列フレームが存在しないユニットは従来どおり単一PNGを表示する fallback を維持した。
- CSSの既存歩行揺れは残しつつ、フレーム切替と喧嘩しないよう上下動を弱めた。
- `scripts/make_micro_animation_frames.py` を追加し、既存PNGから検証用の簡易 `walk-*-0..2.png` と `attack-*-0..1.png` を自動生成できるようにした。
- `scripts/make_sprite_animation_audit.py` を追加し、生成した歩行/攻撃フレームを一覧する監査画像を作れるようにした。
- 設備効果のE2E検収として、棘罠、セーブポイント、回復の泉の戦闘中効果を確認するテストも保持した。

### 生成物

- `public/assets/sprites/{goblin,slime,warrior,rogue,mage,guard}/walk-*-0..2.png`
- `public/assets/sprites/{goblin,slime,warrior,rogue,mage,guard}/attack-*-0..1.png`
- `screenshots/sprite-animation-audit.png`
- `screenshots/sprite-animation-battle-desktop.png`

### 検証結果

- `npm test -- --reporter=line`: 82件成功
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。`public/assets/tiles/` 参照に関する既存のVite警告は継続。
- 追加ターゲット検証：スプライト配列参照、生成フレーム存在、歩行/攻撃フレーム切替、既存単一PNG fallback を確認。
- PlaywrightでPC幅の戦闘画面を取得し、歩行フレーム参照が有効な状態を確認。

### 残課題

- 今回の簡易フレームは既存PNGからの自動生成差分であり、本番絵ではない。
- `downed` は単一PNGのまま。必要になった時点で2フレーム以上へ拡張する。
- 対象外ユニットは従来の単一PNG表示のまま。専用素材が増えた順に `spriteAnimations` へ追加する。
- 攻撃モーションは基盤上は切り替わるが、本番では近接/弓/魔法ごとの専用フレーム差分が必要。

## 2026-06-26 ダンジョンタイル参照のPages対応整理

### 目的

PC前提の広いダンジョン表示で使う床・部屋・通路タイルを、ローカルdevとGitHub Pagesの両方で安定して参照できるようにする。

### 修正

- CSSに `../assets/tiles/...` を直接書くのをやめ、`import.meta.env.BASE_URL` から生成した `--floor-tile` / `--room-tile` CSS変数へ切り替えた。
- 通路SVGパターンの `corridor-stone.png` も同じ `BASE_URL` 由来のURLにした。
- `npm run build:pages` で継続していたタイル参照警告が出ないことを確認した。

### 検証結果

- `npm run build:pages`: 成功。タイル参照警告なし。
- `npm test -- --reporter=line`: 82件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。

## 2026-06-26 スプライト簡易アニメーション対象拡張

### 目的

歩行/攻撃のフレーム切替基盤を6体限定の実験から、魔王以外の既存スプライト全体へ広げる。

### 修正

- `scripts/make_micro_animation_frames.py` を固定リストではなく、`walk` と `attack` の上下左右PNGが揃ったスプライトフォルダを自動検出する方式にした。
- `alchemist`、`bat`、`beastTamer`、`boneGuard`、`cleric`、`darkMage`、`darkSlime`、`fallenWarrior`、`goblin`、`guard`、`hero`、`impArcher`、`knight`、`mage`、`oracleShade`、`paladin`、`poisonSlime`、`ranger`、`rogue`、`sage`、`shadeRunner`、`slime`、`warrior` の23フォルダへ `walk` 3フレーム、`attack` 2フレームを生成した。
- `src/data/spriteAnimations.js` も23フォルダへ拡張し、素材を共有するテンプレートも配列フレームを参照できるようにした。
- `scripts/make_sprite_animation_audit.py` を、生成済みフレームが揃ったフォルダの自動検出に変更した。
- `README.md` と `ASSET_PIPELINE.md` を現状に合わせて更新した。

### 生成物

- `public/assets/sprites/<unit-id>/walk-<direction>-0..2.png`
- `public/assets/sprites/<unit-id>/attack-<direction>-0..1.png`
- `screenshots/sprite-animation-audit.png` を23体一覧へ更新。

### 検証結果

- スプライト関連のPlaywright絞り込み検証: 16件成功。
- `npm test -- --reporter=line`: 82件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

### 残課題

- `demonLord` は単体表示素材のままで、歩行/攻撃フレームは未生成。
- 今回も自動生成の微差分であり、本番素材としては専用の2〜4フレーム生成/切り出しが必要。

## 2026-06-26 魔王スプライトセット昇格

### 目的

魔王だけが単体表示素材のまま残っていたため、他ユニットと同じ `idle / walk / attack / downed` x `front/back/left/right` の規約へ乗せる。

### 修正

- `scripts/make_demon_lord_sprites.py` を追加し、既存の専用魔王正面絵から4方向、歩行、攻撃、ダウン素材を派生生成するようにした。
- `public/assets/sprites/demonLord/` に `walk-<direction>.png`、`attack-<direction>.png`、`downed.png`、`downed-back/left/right.png` を追加した。
- 既存の `scripts/make_micro_animation_frames.py` に通し、魔王にも `walk` 3フレーム、`attack` 2フレームを生成した。
- `src/data/spriteAnimations.js` に `demonLord` を追加し、魔王も複数フレーム配列を参照するようにした。
- `screenshots/sprite-animation-audit.png` を24体一覧へ更新した。
- `README.md` と `ASSET_PIPELINE.md` を24スプライトフォルダ対応へ更新した。

### 生成物

- `public/assets/sprites/demonLord/idle-front/back/left/right.png`
- `public/assets/sprites/demonLord/walk-<direction>.png`
- `public/assets/sprites/demonLord/attack-<direction>.png`
- `public/assets/sprites/demonLord/downed.png` と `downed-back/left/right.png`
- `public/assets/sprites/demonLord/walk-<direction>-0..2.png`
- `public/assets/sprites/demonLord/attack-<direction>-0..1.png`

### 検証結果

- スプライト関連のPlaywright絞り込み検証: 4件成功。
- `npm test -- --reporter=line`: 82件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

### 残課題

- 今回の魔王4方向は既存正面絵からの派生生成であり、本番用には専用生成シートで置き換える。

## 2026-06-26 戦後処理UIの投資判断整理

### 目的

戦後処理で、資金をチップ・魔物・部屋・既知チップ開発のどこへ使うかを比較しやすくする。画面全体スクロールは増やさず、透過パネル内と横レーン内で情報を整理する。

### 修正

- 投資タブの4候補を `decision-card` 化し、費用、効果、図鑑率/希少率/容量/カテゴリを同じカード内で読めるようにした。
- 投資タブ下部に選択配下の `名前 / Lv / 知性 / 担当部屋` を小さな `focus-strip` として表示した。
- 戦利品タブを `使用` と `売却` の2列に分け、アイテム名、個数、使用先/売却額をカード内で揃えた。
- 魔物合成タブに、強化対象、素材、成長結果を並べる `fusion-preview` を追加した。
- スマホ幅では投資/戦利品/合成プレビューを1列へ落とし、画面全体ではなくパネル内で確認できるようにした。

### スクリーンショット

- `screenshots/upgrade-management-refined-desktop.png`
- `screenshots/upgrade-fusion-refined-desktop.png`
- `screenshots/upgrade-management-refined-mobile.png`

### 検証結果

- 戦後処理関連のPlaywright絞り込み検証: 10件成功。
- `npm test -- --reporter=line`: 82件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

## 2026-06-26 戦後処理UIの研究・建設・設備タブ整理

### 目的

投資/戦利品/合成だけでなく、研究、建設、設備も同じカード密度に揃え、戦後処理で「何に資金を使うか」を比較しやすくする。画面全体は固定し、候補が増える部分だけ横レーンで流す。

### 修正

- 研究タブのチップ研究/魔物研究を `decision-card` 化し、費用、候補、未知優先の意味を同じカード内にまとめた。
- チップ研究の候補表示を先頭4件+残件数に抑え、カード内の文字密度を下げた。
- 既知チップ開発を横レーン化し、チップ名、費用、在庫、カテゴリをカード内で読めるようにした。
- 建設タブを `build-layout` に整理し、接続元、配置点、建設候補、拡張、撤去をレーンごとに分けた。
- 建設候補は費用、接続元、配置点、部屋効果/容量を1枚のカードで確認できるようにした。
- 配置点の内部ID表示をやめ、`北`、`北西` などの日本語ラベルにした。
- 設備タブは設置部屋と設備候補をレーン化し、現在の設置状態、費用、効果をカードで確認できるようにした。
- セーブポイントの表示アイコンを英字 `S` から記号 `↻` に変更した。

### スクリーンショット

- `screenshots/upgrade-research-refined-desktop.png`
- `screenshots/upgrade-build-refined-desktop.png`
- `screenshots/upgrade-object-refined-desktop.png`

### 検証結果

- 戦後処理関連のPlaywright絞り込み検証: 6件成功。
- 設備/建設関連の追加絞り込み検証: 4件成功。
- `npm test -- --reporter=line`: 82件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

## 2026-06-26 Claude Design 引き継ぎブリーフ更新

### 目的

本格UI/アートディレクションをClaude Designに依頼する前に、現行プロトタイプの操作面、制約、スクリーンショット、壊したくない設計原則を1ファイルで渡せるようにする。

### 修正

- `UI_READINESS.md` を最新状態に更新し、PC主対象、画面全体スクロール禁止、マップ主役、戦闘中直接指示NG、常時全開示NGを明文化した。
- Setup、Battle、Map、Upgrade の実装済み操作面を棚卸しした。
- 投資/戦利品/研究/合成/建設/設備の最新カード型UIと、スプライト/方向/敵亜種の監査画像を、Claude Design向けスクリーンショットセットとして整理した。
- Claude Designで改善してほしい領域と、実装側の追従なしに変えてはいけない項目を分けて記録した。
- `README.md` から `UI_READINESS.md` と `ASSET_PIPELINE.md` へ辿れるようにした。

### 検証結果

- ドキュメント更新のみ。直前の状態で `npm test -- --reporter=line` 82件成功、`npm run test:balance` 成功、`npm run build:pages` 成功を確認済み。

## 2026-06-26 部屋建設の配置点ラベル改善

### 目的

部屋建設時の配置点が内部IDや固定リストに見えやすかったため、接続元から見た方角と距離が読める表示へ寄せる。

### 修正

- `src/data/rooms.js` に `buildSlotLabel` と `buildSlotRelation` を追加し、配置点の日本語ラベル、方角、距離感を共有データとして扱うようにした。
- 建設タブの配置点カードを、`北西 / 遠距離`、`北 / 中距離` のように、選択中の接続元から見た関係で表示するようにした。
- 建設候補カードの接続説明を、`広間から北 / 中距離` のように変更した。
- マップ上の建設スロットも `配置` ではなく方角ラベルを表示するようにした。
- Playwrightの建設スロット検証を、旧ラベルではなく方角ラベル確認へ更新した。

### スクリーンショット

- `screenshots/build-slot-directions-desktop.png`

### 検証結果

- 建設関連のPlaywright絞り込み検証: 4件成功。
- `npm test -- --reporter=line`: 82件成功。
- `npm run test:balance`: 成功。キャンペーン検収は勝利。
- `npm run build:pages`: 成功。

## 2026-06-26 Claude Design 依頼プロンプト作成

### 目的

Claude Design に、現行プロトタイプのUI/UXとアートディレクションを具体化してもらうための依頼文を、そのまま貼れる形で用意する。

### 修正

- `CLAUDE_DESIGN_PROMPT.md` を追加し、参照ファイル、参照スクリーンショット、ゲーム方向性、デザイン制約、必要アウトプット、検収形式を整理した。
- 複数案の比較ではなく、推奨1案を具体化してもらう依頼文にした。
- README と `UI_READINESS.md` から `CLAUDE_DESIGN_PROMPT.md` へ辿れるようにした。

### 検証結果

- ドキュメント更新のみ。`npm run build:pages`: 成功。
