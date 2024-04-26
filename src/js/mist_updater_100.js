$(() => (async () => {
    // v0.3.2以下のカラム設定のアップコンバート
    const pref = await window.accessApi.readPrefCols()
    if (pref[0].timelines) {
        // 現在のカラムを構成しているDOMのHTML構造から設定JSONを生成する
        const col_list = []
        pref.forEach((col_elm, col_index) => {
            const group_list = []
            const tl_list = []
            col_elm.timelines.forEach((tl_elm, tl_index) => {
                const account_address = tl_elm.key_address
                tl_list.push({ // タイムラインプリファレンス
                    'key_address': account_address,
                    'timeline_type': tl_elm.timeline_type,
                    'account': Account.get(account_address)?.pref,
                    'ex_host': null,
                    'ex_platform': null,
                    'ex_color': null,
                    'list_id': null,
                    'exclude_reblog': tl_elm.exclude_reblog,
                    'expand_cw': tl_elm.expand_cw,
                    'expand_media': tl_elm.expand_media
                })
            })
            group_list.push({ // タイムライングループプリファレンス
                'label_head': 'Group 1',
                'timelines': tl_list,
                'gp_color': '777777',
                'gp_height': null,
                'tl_layout': 'default'
            })
            col_list.push({ // カラムプリファレンス
                'label_head': col_elm.label_head,
                'groups': group_list,
                'col_color': col_elm.col_color,
                'col_width': col_elm.col_width,
                'd_hide': col_elm.d_hide,
                'd_flex': col_elm.d_flex
            })
        })

        // ファイルに追加する処理を書く(整形はメインプロセスで)
        await window.accessApi.writePrefCols(col_list)

        dialog({
            type: 'alert',
            title: "設定ファイル確認",
            text: "設定ファイルのバージョンがMistdon v0.3.2以下のものです。<br/>自動で設定ファイルをアップコンバートします。",
            accept: () => location.reload()
        })
    }

    // v0.5.1以下のアカウント設定のアップコンバート
    const accounts = await window.accessApi.readPrefAccs()
    if ([...accounts.values()].some(acc => !acc.client_id)) dialog({
        type: 'alert',
        title: "設定ファイル確認",
        text: `v0.5.1以下で使用していたMisskeyアカウントがあります。<br/>
            v1.0.0から追加されたメディア添付機能を使用するには再認証をする必要があります。<br/>
            お手数ですが一度アカウントの認証を解除してから再度アカウント登録をお願いいたします。`,
        accept: () => {}
    })

    // GitHubのバージョン情報を取得
    const version = await window.accessApi.fetchVersion()
    if (version.lastest) $("#pop_lastest_release").remove()
    else { // 起動しているのが最新バージョンでない場合は最新バージョン通知を表示
        $("#pop_lastest_release .version").text(version.version)
        $("#pop_lastest_release .dl_link").attr('href', version.link)
        $("#pop_lastest_release").show()
    }
})())

