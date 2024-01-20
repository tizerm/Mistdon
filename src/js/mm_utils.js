/**
 * #Ajax
 * fetchでHeaderの取得も可能なAjaxメソッド
 * 
 * @param arg パラメータオブジェクト
 */
async function ajax(arg) {
    try {
        let response = null
        if (arg.method == "GET") { // GETはパラメータをURLに埋め込む
            const param = Object.keys(arg.data).reduce((str, key) => `${str}&${key}=${arg.data[key]}`, '')
            const url = `${arg.url}?${param.substring(1)}`
            response = await fetch(url, {
                method: arg.method,
                mode: "cors",
                headers: arg.headers
            })
        } else response = await fetch(arg.url, {
            method: arg.method,
            mode: "cors",
            headers: arg.headers,
            body: arg.data
        })

        // ステータスコードがエラーの場合はエラーを投げる
        if (!response.ok) throw new Error(`HTTP Status: ${response.status}`)

        return {
            headers: response.headers,
            body: await response.json()
        }
    } catch (err) {
        return Promise.reject(err)
    }
}

/**
 * #Util
 * 引数の配列の先頭に要素を追加して容量超過した場合は最後の要素を削除する
 * 同一の要素が配列内に存在する場合は長さは変えずに要素を先頭に移動する
 * 
 * @param array 編集対象配列
 * @param obj 追加する要素
 * @param limit 要素を追加できる上限数
 */
function shiftArray(array, obj, limit) {
    const index = array.indexOf(obj)
    if (index < 0) // 存在しないオブジェクトは先頭に保存
        array.unshift(obj)
    else if (index > 0) { // オブジェクトが配列の先頭以外に存在する場合は先頭に場所を移す
        const removed = array.splice(index, 1)[0]
        array.unshift(removed)
    } else // 先頭に同じオブジェクトが存在する場合はなにもせずにfalseを返す
        return false
    // 限界値をオーバーしていたらオーバーした分を消す
    if (array.length > limit) array.splice(limit)

    return true
}

function deleteQuoteInfo() {
    $('#header>#post_options input[type="hidden"]').val("")
    $('#header>#post_options ul.refernce_post')
        .html('<li class="__initial_message">返信/引用元なし</li>')
}

/**
 * #Util
 * 要素を表示したら続きを読み込むスクロールローダーを生成する
 * 
 * @param arg パラメータオブジェクト
 */
function createScrollLoader(arg) {
    // 最初に取得したデータをもとにデータのバインド処理を行う(返り値はページング用max_id)
    const max_id = arg.bind(arg.data, arg.target)
    if (!max_id) return // max_idが空の場合はデータ終端として終了

    // Loader Elementを生成
    arg.target.append(`<li id="${max_id}" class="__scroll_loader">&nbsp;</li>`)

    // Intersection Observerを生成
    const observer = new IntersectionObserver((entries, obs) => (async () => {
        const e = entries[0]
        if (!e.isIntersecting) return // 見えていないときは実行しない
        console.log('ローダー表示: ' + max_id)
        // Loaderを一旦解除してロード画面に変更
        obs.disconnect()
        $(e.target).css('background-image', 'url("resources/illust/ani_wait.png")')

        // Loaderのmax_idを使ってデータ取得処理を実行
        arg.data = await arg.load(max_id)
        // Loaderを削除して再帰的にLoader生成関数を実行
        $(e.target).remove()
        createScrollLoader(arg)
    })(), {
        root: arg.target.get(0),
        rootMargin: "0px",
        threshold: 1.0,
    })
    observer.observe(arg.target.find(".__scroll_loader").get(0))
}
