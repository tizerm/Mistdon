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

function createScrollLoader(arg) {
    // 最初に取得したデータをもとにデータのバインド処理を行う(返り値はページング用max_id)
    const max_id = arg.bind(arg.data, arg.target)
    if (!max_id) return // max_idが空の場合はデータ終端として終了

    // Loader Elementを生成
    arg.target.append(`
        <li id="${max_id}" class="__scroll_loader">
            <span class="loader_message">続きを読み込みます...</span>
        </li>
    `)

    // Intersection Observerを生成
    const observer = new IntersectionObserver((entries, obs) => (async () => {
        const e = entries[0]
        if (!e.isIntersecting) return // 見えていないときは実行しない
        console.log('ローダー表示: ' + max_id)
        // Loaderを一旦削除
        obs.disconnect()
        $(e.target).remove()

        // Loaderのmax_idを使ってデータ取得処理を実行
        arg.data = await arg.load(max_id)
        // 再帰的にLoader生成関数を実行
        createScrollLoader(arg)
    })(), {
        root: arg.target.get(0),
        rootMargin: "0px",
        threshold: 1.0,
    })
    observer.observe(arg.target.find(".__scroll_loader").get(0))
}
