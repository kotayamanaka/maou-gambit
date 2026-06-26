# 魔王のガンビット v0.1

探索型ダンジョン防衛プロトタイプ。魔王として配下を配置し、INT に応じた行動チップを渡して、侵入者を撃退・捕獲する。

## 核

- 敵は魔王部屋へ一直線ではなく、未踏エリアを探索する
- `INT = チップ装備数`
- 倒した敵はダウンし、時間内に牢屋へ運ぶと捕獲
- 捕獲敵は眷属化/養分化/研究/身代金化に使う
- PCフルスクリーン/ウィンドウを主対象にし、画面全体はスクロールなし
- スマホ幅でも確認できるが、主操作はPC向け
- マップ内はズーム/パン/ピンチズーム可能
- 戦闘中の直接指示はせず、編成時の配置・作戦チップ・設備で結果を作る
- 幅のある通路と大きめの部屋をキャラがリアルタイム移動する
- 20ステージのキャンペーン、敵職、ドロップ、研究、建設、合成を持つ

## 起動

公開URL：

- https://kotayamanaka.github.io/maou-gambit/

```powershell
npm install
npm run dev -- --host 0.0.0.0 --port 5177
```

ローカルURL：

- PC: `http://localhost:5177/`
- 同一LANのスマホ: `http://<PCのIPアドレス>:5177/`

## ビルド

```powershell
npm run build
```

静的成果物は `dist/` に出る。GitHub Pages/Vercel/Netlify などへそのまま配置できる。

GitHubリポジトリ：

- https://github.com/kotayamanaka/maou-gambit

GitHub Pages 用ビルド：

```powershell
$env:GITHUB_PAGES='1'
npm run build
```

## 検証

```powershell
npx playwright install chromium
npm run test:smoke
```

確認内容：

- PC/スマホ幅で画面全体にスクロールが出ない
- 編成画面が表示できる
- 戦闘が進み、リザルトに到達する
- リザルトから強化画面へ進める
- スプライト素材と歩行/攻撃の簡易フレームが欠けていない

バランス検収：

```powershell
npm run test:balance
```

## 素材

画像生成・切り出し・自動生成したドット絵素材を、原本と配布用で分けて保存している。

- `assets/generated/`: 画像生成の原本、切り出し元シート
- `public/assets/sprites/`: ゲームが参照するキャラスプライト
- `public/assets/tiles/`: 床、部屋、通路タイル
- `screenshots/`: UI/素材監査画像

キャラは `idle / walk / attack / downed` x `front/back/left/right` を基本にする。`spriteSet` は単一PNGと複数フレーム配列の両方に対応しており、現時点では24スプライトフォルダに、検証用の `walk` 3フレーム、`attack` 2フレームを生成している。

自動生成フレームは本番絵ではなく、アニメーション基盤検証用。最終的には Claude Design / 専用生成で、近接・弓・魔法ごとの攻撃差分へ置き換える。

## UI/デザイン引き継ぎ

- `CLAUDE_DESIGN_PROMPT.md`: Claude Design にそのまま渡す依頼文。
- `UI_READINESS.md`: Claude Design に渡すための現状ブリーフ。操作面、制約、スクリーンショット、壊したくない設計原則をまとめている。
- `ASSET_PIPELINE.md`: ドット絵/タイル/スプライトアニメーションの生成・切り出し・接続ルール。

## ディレクトリ

- `src/data/`: ユニット、チップ、部屋、ステージ定義
- `src/systems/`: AI、戦闘、捕獲、進行処理
- `src/game/`: ゲーム状態
- `src/render/`: マップ描画
- `src/ui/`: 画面UI
- `assets/`: 原本アセット
- `public/`: 静的配布アセット
- `screenshots/`: 検証スクリーンショット
- `docs/`: 仕様/検証補助

## 現在の残課題

- 捕獲準備/捕獲レポートで捕獲役の価値は見えるようになったが、捕獲成立頻度はまだ粗い。敵HP/ダウン時間/運搬速度は調整余地あり
- チップAIは最小実装。条件と行動の組み合わせは今後データ駆動で拡張する
- 部屋建設は実装済みだが、配置スロットはまだ候補選択式。より直感的なグリッド/ドア方向選択に改善余地あり
- 後半敵の一部は装備差分付きの暫定亜種。職ごとの専用シルエット/武器差分をさらに増やしたい
- 簡易アニメーションは自動生成差分。2〜4フレームの本番ドット絵へ置き換えたい
- 本格UI/アートディレクションは Claude Design 依頼前提で整理中
