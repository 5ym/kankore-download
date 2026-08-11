# kankore-download

艦これのタイトルコール音声・タイトル画像を連番でダウンロードし、ZIP にまとめる CLI。

元の Google Colab ノートブック(Python)を **Bun + TypeScript** に書き換えたものです。
依存パッケージはゼロ(ZIP 生成も自前実装 / STORE 方式)。

## 使い方

```shell
bun install   # 型定義のみ(実行時依存なし)

# 全部まとめて取得
bun start

# 対象を指定して取得(title1 / title2 / titleimg)
bun start title1 titleimg
```

| 対象       | 内容                 | 出力          |
| ---------- | -------------------- | ------------- |
| `title1`   | タイトルコール 1(mp3) | `title1.zip`   |
| `title2`   | タイトルコール 2(mp3) | `title2.zip`   |
| `titleimg` | タイトル画像(png)     | `titleimg.zip` |

連番(1〜999)を順に取得し、最初の 404 で「file get complete」と表示して打ち切ります
(元ノートブックと同じ挙動)。

## 開発

```shell
bun test        # ZIP ライタのテスト(CRC32 / 構造 / unzip 往復)
bun run check   # 型チェック(tsc)
```

接続先は `KC_BASE_URL` 環境変数で差し替えられます(テスト用)。
