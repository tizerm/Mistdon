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
    else { // オブジェクトが配列に存在する場合は先頭に場所を移す
        const removed = array.splice(index, 1)[0]
        array.unshift(removed)
    }
    // 限界値をオーバーしていたらオーバーした分を消す
    if (array.length > limit) array.splice(limit)
}
