const escapes = [["^co^", ","]];
const l = escapes.length;

/**
 * @param {string} string 
 * @returns {string}
 */
export function escape(string) {
    if (!string.includes("^")) {
        return string;
    }
    let result = string;
    for (let i = 0; i < l; i++) {
        const esc = escapes[i];
        result = result.replaceAll(esc[0], esc[1]);
    }
    return result;
}
