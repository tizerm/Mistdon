$(() => (async () => {
    const pref = await window.accessApi.readPrefCols();

    if (pref[0].timelines) {
        dialog({
            type: 'alert',
            title: "設定ファイル確認",
            text: "設定ファイルのバージョンがMistdon v0.3.2以下のものです。<br/>自動で設定ファイルをアップコンバートします。",
            accept: () => {}
        })
    }
})());
