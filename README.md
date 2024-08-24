<h1 align="center">
    <img src="github_resource/mistdon_logo.png" alt="attach:cat" alt="Mistdon"/>
</h1>
<p align="right">
    <img src="https://img.shields.io/badge/-JavaScript-F7DF1E.svg?logo=javascript&style=social" alt="JavaScript"/>
    <img src="https://img.shields.io/badge/-Node.js-339933.svg?logo=node.js&style=social" alt="node.js"/>
    <img src="https://img.shields.io/badge/-Electron-47848F.svg?logo=electron&style=social" alt="Electron"/>
    <img src="https://img.shields.io/badge/-jQuery-0769AD.svg?logo=jquery&style=social" alt="jQuery"/><br/>
    <img src="https://img.shields.io/github/v/release/tizerm/Mistdon?include_prereleases&color=9898dd" alt="release"/>
    <img src="https://img.shields.io/badge/License-LGPL-b0d44d" alt="License"/>
    <img src="https://img.shields.io/badge/Contact-%40tizerm%40misskey.dev-738c83" alt="Contact"/>
</p>
<p>
    MistdonはMastodonとMisskeyの統合Fediverseクライアントです。<br/>
    MastodonやMisskeyの複数のインスタンスにアカウントを持つユーザーが、複数のアカウントを閲覧/管理するのが煩わしくならないように設計されています。<br/>
    また、MastodonインスタンスのSkyBridgeに接続すればBlueskyアカウントを扱うことも可能です(※一部機能制限があります)。<br/>
    もちろん、アカウントをひとつしか持っていない方や、Mastodonのみ、Misskeyのみ使用する方でもお使いいただけます。
</p>
<p>
    MistdonであなたのFediverseライフがよりよいものになれば幸いです。
</p>
<h2>
    特徴的な機能
</h2>
<img src="github_resource/mitlin_right.png" alt="attach:cat" alt="Mistdon" align="right"/>
<h3>MastodonとMisskeyのネイティブ対応</h3>
<p>
    Mastodonクライアントは数がありますが、MastodonとMisskeyはAPIの互換性がないため、MastodonクライアントからMisskeyのアカウントを使用することは基本的にできません。<br/>
    MistdonはMastodonとMisskey両方のAPIにネイティブ対応することで、両方のプラットフォームのアカウントをひとつのアプリケーションで管理できるようにすることを可能にしています。
</p>
<h3>インスタンスをまたいだ機能の簡略化</h3>
<p>
    通常MastodonもMisskeyも、あるインスタンスから見えている投稿を別のインスタンスからブースト/リノート/お気に入りなどをしたりするのに、投稿URLをコピーして検索するという煩雑な手順を踏まなければなりません。<br/>
    Mistdonはその手順を内部的に自動化することで、右クリックからアカウントを選択するだけで別のインスタンスのアカウントから手軽に行うことができます。
</p>
<h3>リモートAPIへの直接的なアクセス</h3>
<p>
    通常リモートインスタンスの投稿を特定のインスタンスから見た時は、インプレッション数やユーザーアイコンなどの情報が不完全なことが多いです。<br/>
    Mistdonは投稿やユーザーを詳細表示するときに、リモート先のAPIを直接呼び出して情報を取得するため、情報が欠落することがありません。<br/>
    もちろんそこから自分のインスタンスへのブースト/リノート/お気に入りなども右クリックから簡単に行えます。
</p>
<h3>縦と横に広がるマルチカラムタイムライン</h3>
<p>
    複数のタイムラインを、横と縦それぞれに並べることで、画面内に複数のアカウントのタイムラインを俯瞰的に表示することができます。<br/>
    また、ひとつのタイムラインに複数のタイムラインを混在させることができ、例えばアカウントAのタイムラインとアカウントBのタイムラインを同じタイムライン内に時系列順に表示させることもできます。
</p>
<h3>豊富なタイムラインレイアウト</h3>
<p>
    タイムラインに表示される投稿を、一般的なSNSのような表示形式から、LINEのような対話式チャットのようなレイアウト、極限まで情報を削って1行で表示されるレイアウト、メディアを大々的に表示するレイアウトなどから選ぶことができます。<br/>
    これはタイムラインごとに設定することが可能で、これにより既存のSNSクライアントの枠にとらわれない、幅広い形式でタイムラインを表示することが可能となります。<br/>
    さらに、タイムラインをスクロールするのではなくクリックやキーボードによって「送る」ことで読む「フラッシュウィンドウ」も搭載されています。
</p>
<h2>
    インストールガイド
</h2>
<p>
    右のReleaseのリンクから最新バージョンのZIPをダウンロードして任意のフォルダに解凍してお使いください。<br/>
    設定ファイルはユーザーフォルダに保存されているため、アップデート時に設定ファイルをコピーしたりする必要はありません。
</p>
<h2>
    バグ報告など
</h2>
<p>
    使用感やバグ報告などをハッシュタグ「#Mistdon」でFediverse上に投稿してもらえると助かります！<br/>
    所属インスタンスの関係ですべては拾いきれないかもしれませんが、できる限り拾っていきたいと思います。<br/>
    より深刻なバグだと感じた場合はIssueに投稿してもらえると確実に確認できるので助かります。
</p>
<h2>
    License
</h2>
<p>
    Copyright (C) 2023-2024 tizerm@misskey.dev<br/>
    This program is free software: you can redistribute it and/or modify it under the terms of LGPL.<br/>
    See also: https://www.gnu.org/licenses/
</p>

