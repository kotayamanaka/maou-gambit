# UI Readiness for Claude Design

## Purpose

Claude Design に UI 設計を依頼する前の機能棚卸し。ここにある項目は、プロトタイプ上で操作または表示できる状態にしておく。

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
- チップ解放履歴
- 戦闘開始

### Battle

- 速度切替
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

### Map

- ピンチズーム
- ホイールズーム
- ドラッグ移動
- 拡大縮小ボタン
- リセット
- 選択対象へフォーカス
- 侵入者へフォーカス

### Upgrade

- 捕獲敵選択
- 眷属化
- 眷属化プレビュー
- 養分化
- 養分対象選択
- 養分プレビュー
- 現在ステータスから強化後への比較
- 研究
- 研究候補表示
- 投資比較
- チップ研究
- 魔物研究
- 選択部屋拡張
- 既知チップ開発
- 戦利品使用
- アイテム売却
- 部屋建設
- 設備設置
- 魔物合成
- 次の防衛へ

## Verification

- `npm run build:pages`
- `npm test`
- `npm run test:balance`

Latest balance check:

- Raw stage win rate: 10/20
- Campaign check: victory
- Campaign final lord damage: 0
- 戦後投資タブ: チップ研究、魔物研究、部屋拡張、既知チップ開発を同じ面で比較。

## Screenshots

- `screenshots/desktop-ui-readiness-setup.png`
- `screenshots/desktop-ui-readiness-battle.png`
- `screenshots/desktop-ui-readiness-upgrade.png`
- `screenshots/mobile-ui-readiness-setup.png`
- `screenshots/upgrade-investment-desktop.png`
