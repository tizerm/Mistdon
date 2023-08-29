# This is Electron base Mastodon and Misskey client.
<h3>開発コードネーム: MMchan</h3>

<p>
Electronを使って開発しているMastodonとMisskeyがいっぺんに見られるFediverseクライアントです。<br/>
ついにアルファリリースできました！(現在v0.0.2)<br/>
使ってみたい方はGoogle Driveの<a href="https://drive.google.com/drive/folders/16xwNbQCl5kRLfJdK3DT84652JdvTHfFP?usp=drive_link" target="_blank">こちら</a>からダウンロードしてください。
</p>

<h3>Change Log</h3>

<p>
2023/08/29 v0.0.3 (alpha)<br/>
・WebSocket通信が切断されたときに通知を出し自動で再接続するよう修正<br/>
・画像拡大表示に対応 サムネイルクリックで拡大表示できます どっかクリックすると閉じる<br/>
<br/>
2023/08/28 v0.0.2 (alpha)<br/>
・任意のアカウントからリプライ機能の追加<br/>
・投稿、ブーストなどの送信系処理実行時に左上に通知が出るように<br/>
・カラムにトップへ移動ボタンを追加<br/>
<br/>
2023/08/27 v0.0.1 (alpha)<br/>
・アルファバージョン正式リリース<br/>
・基本機能については下を見てね……
</p>

<h2>現在実装されている機能</h2>
<p>
・MastodonとMisskey両方のアカウント認証/タイムライン表示<br/>
・MastodonとMisskey両方のタイムラインの1カラム混合表示<br/>
・任意のアカウントからタイムライン上の投稿をブースト/リノート+お気に入り(Mastodonのみ)<br/>
・任意のアカウントからタイムライン上の投稿へリプライ<br/>
・MastodonとMisskey両方のアカウントから投稿
</p>

<h2>まだ実装されていない基本機能</h2>
<p>
・アカウント認証解除(Misskeyはできないっぽい？)<br/>
・ブースト/リノート+お気に入りの解除<br/>
・Misskeyのリアクション表示/送信<br/>
・Misskeyのリアクション通知で何が来たか表示(現状リアクションが来たことしかわからない)<br/>
・リンクを外部ブラウザで開く(なぜかうまくいかない)<br/>
・末尾までスクロールして取得(仕様的に難しい？)<br/>
</p>
