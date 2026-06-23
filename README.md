# 魔王のガンビット v0.1

探索型ダンジョン防衛プロトタイプ。魔王として配下を配置し、INT に応じた行動チップを渡して、侵入者を撃退・捕獲する。

## 核

- 敵は魔王部屋へ一直線ではなく、未踏エリアを探索する
- `INT = チップ装備数`
- 倒した敵はダウンし、時間内に牢屋へ運ぶと捕獲
- 捕獲敵は眷属化/養分化/研究に使う
- PC/スマホ両対応、画面全体はスクロールなし
- マップ内はズーム/パン可能

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

## 素材

`assets/sprites/` と `public/assets/sprites/` に、プロトタイプ用32pxドットPNGを配置している。視認性優先の仮素材で、本格実装時は Claude Design でUI/アートディレクションを作って差し替える。

画像生成ツールでスプライトシート生成を試行したが、プロジェクトから参照可能なローカル出力を取得できなかったため、現プロトではローカル生成した仮PNGを使用している。

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

- 捕獲成立の頻度はまだ粗い。捕獲役の価値がもっと見えるよう、敵HP/ダウン時間/運搬速度は調整余地あり
- チップAIは最小実装。条件と行動の組み合わせは今後データ駆動で拡張する
- マップは固定。部屋追加/分岐追加は `src/data/rooms.js` で可能
- 本格UI/アートは未着手
