class ParseError extends Error {
    constructor(message) {
        super(message);
    }
}

export function parseError(text) {
    return new ParseError(text);
}

/**
 * @param {string} str 
 * @param {string} f 
 * @param {string} l
 * 
 * @returns {boolean} 
 */
export function flCompareSingle(str, f, l) {
    return (str[0] === f) && (str[str.length - 1] === l);
}

/**
 * @param {string} str 
 * @param {string} sep 
 * 
 * @returns {string[]}
 */
export function splitOnce(str, sep) {
    const i = str.indexOf(sep);
    return i === -1
        ? [str]
        : [str.slice(0, i), str.slice(i + sep.length)];
}

/**
 * @template T
 * @param {T[]} array 
 * 
 * @returns {T}
 */
export function gl(array) {
    if (array.length === 0) return null;
    return array[array.length - 1];
}

/**
 * @template T
 * @param {T[]} arr 
 * @param {(x: T) => void} callback 
 */
export function forEachReverse(arr, callback) {
    for (let i = arr.length - 1; i >= 0; i--) {
        if (callback(arr[i], i, arr)) return;
    }
}

/**
 * @param {ATag[]} tags
 * 
 * @returns {string}
 */
export function textContent(tags) {
    let result = "";
    tags.forEach(tag => {
        if (tag.type === "text") {
            result += tag.content;
        } else {
            if (tag.name !== "/") result += textContent(tag.ast);
        }
    });
    return result;
}

/**
 * @param {ATag[]} tags
 * 
 * @returns {string}
 */
export function textContentForName(tags) {
    let result = "";
    tags.forEach(tag => {
        if (tag.type === "text") {
            result += tag.content;
        } else {
            result += textContentForName(tag.ast);
        }
    });
    return result;
}
/**
 * @template T
 * @param {T} array
 *
 * @returns {T} 
 * 
 * 地上に産み落とされし謎のソート
 */
export function layeringSort(array) {
    const b = Object.create(null), a = [];
    for (let i = 0, v, k, n; i < array.length; i++) {
        v = array[i];
        k = v[0];
        n = b[k] = b[k] == null ? 0 : b[k] + 1;
        (a[n] || (a[n] = [])).push(v);
    }
    for (const l of a) l.sort((x, y) => x[0] - y[0]);
    return [].concat(...a);
}
