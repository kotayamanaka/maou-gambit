# Claude Design Prompt

以下を Claude Design にそのまま渡す。

---

あなたはゲームUI/アートディレクションのデザイナーです。

`魔王のガンビット` という探索型ダンジョン防衛ゲームのプロトタイプについて、PCフルスクリーン/ウィンドウを主対象にしたUI/UXとアートディレクションを設計してください。

## 参照ファイル

必ず以下を読んでください。

- `README.md`
- `UI_READINESS.md`
- `ASSET_PIPELINE.md`
- `PROGRESS.md`

特に `UI_READINESS.md` を主ブリーフとして扱ってください。現在実装済みの操作面、壊してはいけない制約、スクリーンショットセットがまとまっています。

## 参照スクリーンショット

まず以下を見て、現行プロトタイプの画面密度、マップ表示、戦闘視認性、戦後処理UIを把握してください。

### Core UI

- `screenshots/tutorial-setup-minimal-tabs-desktop.png`
- `screenshots/large-rooms-overview-desktop.png`
- `screenshots/large-rooms-battle-desktop.png`
- `screenshots/speed-ui-desktop-after.png`
- `screenshots/enemy-scout-desktop.png`

### Upgrade UI

- `screenshots/upgrade-management-refined-desktop.png`
- `screenshots/upgrade-fusion-refined-desktop.png`
- `screenshots/upgrade-research-refined-desktop.png`
- `screenshots/upgrade-build-refined-desktop.png`
- `screenshots/upgrade-object-refined-desktop.png`
- `screenshots/build-slot-directions-desktop.png`
- `screenshots/captured-research-desktop.png`

### Art and Motion Audit

- `screenshots/sprite-animation-audit.png`
- `screenshots/sprite-animation-battle-desktop.png`
- `screenshots/sprite-direction-audit-enemies.png`
- `screenshots/sprite-direction-audit-ally-monsters.png`
- `screenshots/ally-specialists-desktop.png`
- `screenshots/enemy-job-variants-desktop.png`

## ゲームの方向性

- プレイヤーは魔王。
- ダンジョンへ侵入する冒険者を、配下モンスター、部屋、設備、作戦チップで迎え撃つ。
- 戦闘中に直接命令はしない。準備段階の配置/チップ/建設/設備/育成で結果を作る。
- 倒した敵は捕獲でき、眷属化、養分化、研究、身代金化に使える。
- `INT = チップ装備数` が中核の面白さ。
- 画面の主役は常にダンジョンマップ。

## デザインの絶対条件

- PCフルスクリーン/ウィンドウを主対象にする。
- スマホは検証用に動けばよく、主操作の最適化対象ではない。
- 画面全体をスクロールさせない。
- マップはフルスクリーン領域に表示する。
- ズーム/パン/ピンチはマップ内で完結させる。
- パネルや横レーンの中だけがスクロールするのは可。
- 常時すべてのメニューや候補を表示しない。
- 必要な時に必要なカテゴリだけ表示し、選択で詳細が出る形にする。
- 戦闘中の直接指示ボタンを追加しない。
- 英字だけの略称や内部IDをユーザーに見せない。
- キャラ絵に矢や魔法玉を描き込まない。射出物はエフェクトレイヤで表現する。
- 既存の `spriteSet` / `public/assets/sprites/` / `assets/generated/` のパイプラインを崩さない。

## アート方向

- 文字やUI枠以外のキャラ、部屋、床、通路は、画質の良いスーファミ後期から初代PlayStation手前くらいの2Dドット絵。
- ファイナルファンタジータクティクス寄りの、少し荒めで読みやすいピクセル感。
- 暗い魔王軍らしさは必要だが、視認性を犠牲にしない。
- キャラの上下左右の向き、歩行、攻撃、ダウンが読めることを優先する。
- UIはダンジョンを邪魔しない半透明オーバーレイにする。
- 魔王軍運営らしい重みはほしいが、装飾過多にしない。

## 今回ほしいアウトプット

複数案の比較ではなく、あなたの推奨する1案を具体化してください。

### 1. 全体UI方針

- PC画面でのレイアウト方針
- マップとパネルの優先順位
- 右パネル、速度UI、マップ操作UIの配置
- セットアップ、戦闘、戦後処理で共通化すべきルール

### 2. 主要画面の具体設計

以下の画面ごとに、何をどこへ置くかを具体的に書いてください。

- セットアップ画面
- 戦闘画面
- 戦後処理: 投資
- 戦後処理: 研究
- 戦後処理: 建設
- 戦後処理: 設備
- 戦後処理: 合成/捕獲敵処理

### 3. 情報階層

各画面について、情報を以下に分類してください。

- 常時見せる
- 選択時だけ見せる
- hover/詳細で見せる
- 今は隠してよい

### 4. コンポーネント設計

以下のコンポーネントの見た目と状態を設計してください。

- ユニットカード
- チップカード
- 部屋カード
- 建設候補カード
- 設備カード
- 捕獲敵カード
- 戦利品カード
- 判断カード
- 横レーン
- 詳細パネル
- 速度UI
- マップ操作UI
- 戦闘ログ
- ダメージ/状態異常/運搬/ダウン表示

### 5. アートディレクション

- カラーパレット
- UI枠、背景、半透明パネルの質感
- 床、部屋、通路タイルの方向性
- 味方魔物、敵冒険者、魔王の見た目の差別化方針
- 近接/弓/魔法/状態異常/捕獲のエフェクト方針
- 本番用2から4フレームスプライトへ置き換える時の優先順位

### 6. 実装へ返す仕様

実装者がそのまま作業できるように、以下を具体化してください。

- CSS/レイアウト上の変更点
- 既存HTML構造をなるべく活かす変更点
- 新しく必要になりそうなクラス名や状態名
- 画像/スプライト/エフェクト素材の追加リスト
- Playwrightで確認すべき受入条件
- 先にやるべき実装順

## 注意

- 既存機能を削らないでください。
- 戦闘中に直接命令するゲームへ変えないでください。
- ランディングページや説明ページは不要です。最初の画面からゲームとして使えることを優先してください。
- 画面全体スクロールを前提にしないでください。
- 候補を全部縦に並べるだけのUIに戻さないでください。
- 見栄えだけでなく、繰り返し遊ぶ運営画面として疲れない密度にしてください。

## 期待する最終形式

Markdownで返してください。

構成は以下にしてください。

1. 推奨デザイン方針
2. 画面別レイアウト
3. コンポーネント仕様
4. アートディレクション
5. 実装タスク
6. 検収チェックリスト

抽象論で終わらず、実装者が次にCSS/HTML/素材を触れる粒度まで落としてください。

