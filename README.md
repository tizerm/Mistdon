This is Electron base Mastodon and Misskey cliant.

Electronを使って開発しているMastodonとMisskeyがいっぺんに見られるFediverseクライアントです。
まだじぇんじぇん作りかけなので細かく進捗をあげながら作っていこうと思います。
十分な機能が整ったと思ったらパッケージ化してリリースするかもね！？

リポジトリからチェックアウトして使ってみてもかまわないけど、
ElectronとNode.jsを用いて開発しているので、パッケージしていない開発中の現在は、
お使いのパソコンにNode.jsがインストールされていることが前提条件となります。
ローカルにチェックアウトしたフォルダに移動して
npm install electron --save-dev
を実行してモジュールをインストールしてから
npm run start
で動くんじゃないかな……外部からやってないからわからん。
あと何が起きても責任取れません。アクセストークン漏れたら最悪垢乗っ取られるよ！

現在実装されている機能
・Mastodonアカウントの認証
・Mastodonのカラム設定
・Mastodonのタイムライン表示(通知を表示するとバグるかも)

まだ実装されていない基本機能
・Misskeyアカウントの認証
・Misskeyのカラム設定
・投稿
・ブースト表示
・ふぁぼ
・Streaming APIによるリアルタイム更新
・リンクを外部ブラウザで開く
・スクロールして更新(現状一旦別画面飛ばないと更新されない)