# UI Readiness for Claude Design

## Purpose

Claude Design に UI / アートディレクション案を依頼するための現状ブリーフ。

このプロトタイプは、ゲーム性と必要な操作面を先に実装した状態。Claude Design には、ここにある機能を削らず、PCフルスクリーン/ウィンドウ前提で「ダンジョンを主役にした見やすい画面」へ整理してもらう。

実際にClaude Designへ貼る依頼文は `CLAUDE_DESIGN_PROMPT.md` にまとめている。

## Product Direction

- ジャンル: 探索型ダンジョン防衛 / 魔王軍運営
- 主体験: 配下、部屋、作戦チップ、捕獲敵、戦利品、研究へ資源を振り分け、次の侵入を迎え撃つ
- 操作思想: 戦闘中に直接命令しない。編成/強化/建設/設備の準備で結果を作る
- 画面思想: ダンジョンマップを最大表示し、その上に必要な時だけ透過パネルを重ねる
- 主対象: PCフルスクリーンまたはPCウィンドウ
- スマホ: 検証用に動くことは必要。ただし主操作の最適化対象ではない
- アート方向: 文字やUI枠以外は、画質の良いスーファミ後期から初代PlayStation手前くらいの読みやすい2Dドット絵。ファイナルファンタジータクティクス寄りの、少し荒めで方向が読めるキャラ

## Hard Constraints

- 画面全体をスクロールさせない。
- マップはフルスクリーン領域で表示し、ズーム/パン/ピンチはマップ内で完結させる。
- パネルや横レーンの中だけがスクロールするのは可。
- 常に全メニューを開示しない。必要なカテゴリだけ表示し、選択で詳細を出す。
- 戦闘中の直接指示は入れない。戦闘中にできるのは選択、観察、速度変更、ログ、フォーカス、撤退/リトライ。
- 英字だけの略称や内部IDをユーザーに見せない。`north` のような配置IDは `北` などに変換する。
- キャラ、部屋、設備、チップは今後増える前提。全候補を縦に常時展開しない。
- キャラ絵に矢や魔法玉を描き込まない。射出物はエフェクトレイヤで表現する。
- 既存の `spriteSet` / `public/assets/sprites/` / `assets/generated/` のパイプラインを崩さない。

## Implemented Interaction Surface

### Setup

- 配下選択
- 配置部屋変更
- 部屋キャパ表示
- チップ着脱
- チップ入れ替え
- チップ詳細表示
- 未発見チップ表示
- INT 装備枠 `x/y`
- 配下ステータス詳細
- 成長傾向
- 担当部屋
- 編成警告
- 次の敵情報
- 捕獲価値、ドロップ、眷属化先、養分素材の偵察表示
- チップ解放履歴
- 戦闘開始
- 配下カードのドラッグ配置
- チップのドラッグ装備
- 部屋/設備のドラッグ設置

### Battle

- 速度切替 `1x / 2x / 4x`
- 一時停止
- リトライ
- 撤退
- 選択中ユニット詳細
- 選択中敵詳細
- 味方チップ確認
- 敵チップ確認
- 運搬状態表示
- ダウン敵残り時間表示
- 魔王部屋発見状態
- 簡易ログ表示/非表示
- 与ダメ/被ダメ表示
- 近接攻撃の `swing` エフェクト
- 遠距離攻撃の projectile エフェクト
- 状態異常/強化アイコン
- 歩行/攻撃の簡易スプライトフレーム切替

### Map

- PC向け大部屋マップ
- 幅のある直角通路
- 部屋ドア表示
- 生成タイルによる床/部屋/通路表現
- ピンチズーム
- ホイールズーム
- ドラッグ移動
- 拡大縮小ボタン
- リセット
- 選択対象へフォーカス
- 侵入者へフォーカス
- 未建設部屋の非表示/建設後表示

### Upgrade

- 捕獲敵選択
- 眷属化
- 眷属化プレビュー
- 養分化
- 養分対象選択
- 養分プレビュー
- 現在ステータスから強化後への比較
- 捕獲研究
- 捕獲敵別の解析チップ候補
- 身代金化
- 投資比較
- チップ研究
- 魔物研究
- 選択部屋拡張
- 既知チップ開発
- 戦利品使用
- アイテム売却
- 部屋建設
- 接続元選択
- 接続扉選択
- 配置点選択
- 部屋撤去
- 設備設置
- 魔物合成
- コレクション表示
- 次の敵情報
- 次の防衛へ

## Current UI Structure

### Setup Panel

- 右側の透過パネルに `配下 / 配置 / チップ / 情報` を表示。
- 第1防衛後に `建設 / 設備` が開く。
- 配下リストや部屋候補、チップ候補は横レーンで表示。
- 画面全体ではなく、候補レーンだけ横スクロールする。

### Battle Panel

- 速度UIはマップ左上に固定。
- 右側パネルは状況、選択対象詳細、ログを表示。
- マップ上のキャラを選択できるが、行動命令は出せない。
- キャラ移動、攻撃、ダウン、運搬、射出エフェクトがマップ上で読める必要がある。

### Upgrade Panel

- タブ: `投資 / 戦利品 / 研究 / 合成 / 建設 / 設備 / 情報`
- 投資: 資金の使い道を4枚の判断カードで比較。
- 戦利品: `使用` と `売却` を2列で分離。
- 研究: チップ研究、魔物研究、既知チップ開発をカード化。
- 合成: 強化対象、素材、成長結果を並べて確認。
- 建設: 接続元、接続扉、配置点、建設候補、拡張、撤去をレーン化。
- 建設配置点: 選択中の接続元から見た方角と距離感を表示し、接続元の北/東/南/西扉を選べる。
- 建設プレビュー: 選択中の部屋候補をマップ上に半透明表示し、選択扉から予定通路を点線で表示する。
- 建設衝突判定: 選択中の部屋サイズで既存部屋と近すぎる配置点を `重複` として無効化する。
- 設備: 設置部屋、設備候補、現在設置状態をカード化。

## Data and Asset State

- 20ステージのキャンペーン定義あり。
- 敵職は `warrior`, `rogue`, `mage`, `guard`, `ranger`, `cleric`, `knight`, `alchemist`, `beastTamer`, `paladin`, `sage`, `hero`。
- 捕獲後の変換先として、堕ちた戦士、影走り、闇術師、骨衛兵、小悪魔射手、影託者、ゴブリン隊長などを実装済み。
- スライム亜種として、スライム、ポイズンスライム、ダークスライム、瘴気スライムを実装済み。
- 部屋は入口、物置、広間、牢屋、魔王部屋、前通路、奥通路、袋小路、宝物庫、禁書庫、魔物巣、武具庫。
- 部屋オブジェクトは棘罠、セーブポイント、回復の泉。
- `spriteSet` は単一PNGと複数フレーム配列の両方に対応。
- 現時点で24スプライトフォルダに `walk` 3フレーム、`attack` 2フレームの検証用自動生成差分を接続済み。
- 自動生成フレームは基盤検証用。本番絵ではない。

## Screenshot Set for Design Review

### Core UI

- `screenshots/tutorial-setup-minimal-tabs-desktop.png`
- `screenshots/large-rooms-overview-desktop.png`
- `screenshots/large-rooms-battle-desktop.png`
- `screenshots/speed-ui-desktop-after.png`
- `screenshots/enemy-scout-desktop.png`

### Upgrade UI

- `screenshots/upgrade-management-refined-desktop.png`
- `screenshots/upgrade-management-refined-mobile.png`
- `screenshots/upgrade-fusion-refined-desktop.png`
- `screenshots/upgrade-research-refined-desktop.png`
- `screenshots/upgrade-build-refined-desktop.png`
- `screenshots/upgrade-object-refined-desktop.png`
- `screenshots/build-slot-directions-desktop.png`
- `screenshots/build-door-selection-desktop.png`
- `screenshots/build-preview-desktop.png`
- `screenshots/build-grid-collision-desktop.png`
- `screenshots/captured-research-desktop.png`

### Art and Motion Audit

- `screenshots/sprite-animation-audit.png`
- `screenshots/sprite-animation-battle-desktop.png`
- `screenshots/sprite-direction-audit-enemies.png`
- `screenshots/sprite-direction-audit-ally-monsters.png`
- `screenshots/ally-specialists-desktop.png`
- `screenshots/enemy-job-variants-desktop.png`

## What Claude Design Should Improve

- PC画面で、マップの迫力を保ったまま右パネルの密度を読みやすくする。
- タブ名や見出しを減らしても、操作カテゴリが迷子にならないアイコン/状態表現にする。
- 戦闘中の選択対象、運搬、ダウン、射出、状態異常が一目で読める情報階層を作る。
- 戦後処理で、投資、研究、合成、建設、設備の「選択の重み」が伝わるカード表現へ磨く。
- 未発見チップ、未研究魔物、コレクション率を、ネタバレせず集めたくなる見せ方にする。
- 部屋建設の接続元/接続扉/配置点/建設前プレビューを、将来の自由配置グリッドへ自然に拡張できるUIにする。
- 魔王軍らしさは出すが、画面全体を暗くしすぎず、キャラと通路の視認性を優先する。

## Do Not Change Without Implementation Follow-Up

- `data-*` 属性はPlaywright検証と操作ハンドラで使っているため、削除や改名時はテスト更新が必要。
- `spriteSet` の構造は `string | string[]` を維持する。
- 画面全体スクロールを復活させない。
- スマホ専用の別UIへ寄せすぎない。
- 戦闘中の指示ボタンを追加しない。
- 候補を常時全展開するUIへ戻さない。

## Verification Commands

```powershell
npm test -- --reporter=line
npm run test:balance
npm run build:pages
```

Latest verified state:

- `npm test -- --reporter=line`: 82 passed
- `npm run test:balance`: campaign victory
- `npm run build:pages`: success
