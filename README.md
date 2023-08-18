# This is Electron base Mastodon and Misskey client.
<h3>開発コードネーム: MMchan</h3>

<p>
Electronを使って開発しているMastodonとMisskeyがいっぺんに見られるFediverseクライアントです。<br/>
まだじぇんじぇん作りかけなので細かく進捗をあげながら作っていこうと思います。<br/>
十分な機能が整ったと思ったらパッケージ化してリリースするかもね！？
</p>

<p>
リポジトリからチェックアウトして使ってみてもかまわないけど、<br/>
ElectronとNode.jsを用いて開発しているので、パッケージしていない開発中の現在は、<br/>
お使いのパソコンにNode.jsがインストールされていることが前提条件となります。<br/>
ローカルにチェックアウトしたフォルダに移動して<br/>
npm install electron --save-dev<br/>
を実行してモジュールをインストールしてから<br/>
npm run start<br/>
で動くんじゃないかな……外部からやってないからわからん。<br/>
あと何が起きても責任取れません。アクセストークン漏れたら最悪垢乗っ取られるよ！
</p>

<h2>現在実装されている機能</h2>
<p>
・Mastodonアカウントの認証<br/>
・Misskeyアカウントの認証<br/>
・Mastodonのカラム設定<br/>
・Misskeyのカラム設定<br/>
・Mastodonのタイムライン表示(リアルタイム更新対応)<br/>
・Misskeyのタイムライン表示(リアルタイムはまだ、通知バグってる)<br/>
・Mastodonタイムラインの画像表示と閲覧注意の自動クローズ<br/>
・MastodonタイムラインのCWの自動クローズ
</p>

<h2>まだ実装されていない基本機能</h2>
<p>
・アカウントの認証解除(アクセストークン生成の関係でauth.jsonファイルを消してリセットはやめてね！)<br/>
・カラムの削除、移動(これはcolumns.jsonファイル削除して作り直してください)<br/>
・投稿<br/>
・Misskeyタイムラインのリノート表示<br/>
・ふぁぼ<br/>
・MisskeyタイムラインのStreaming APIによるリアルタイム更新<br/>
・リンクを外部ブラウザで開く<br/>
・スクロールして更新(現状WebSocket Streaming APIで更新したぶんを保持するだけ)<br/>
・マスコットキャラクターのデザインと素材イラスト制作
</p>

<p>
※多くの基本的なこともできてない現状でプルリク送るのはなるべくおやめください。<br/>
　少なくともβ版がリリースできるようになってから……。
</p>
