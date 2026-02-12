import { jsonToHtml, parseToJson } from "./parser/rulesParser.js";
import { RULE } from "./rule.js";

document.getElementById("arrowL").style.fill = "#777";
document.getElementById("arrowR").style.fill = "#777";

const mq = window.matchMedia("(max-width: 599px)");
const parsed = parseToJson(RULE);
console.log(parsed);
console.log(parsed.layers);
const html = jsonToHtml(parsed);
console.log(html.html);
document.getElementById("wrapper").appendChild(html.html);
document.getElementById("smenu").appendChild(html.side);

/*let timeSum = 0;
let times = [];
for (let i = 0; i < 10000; i++) {
    const parsed = parseToJson(RULE);
    const html = jsonToHtml(parsed);
    timeSum += html.allTime;
    times.push(html.allTime);
}

function corrIndexValue(arr) {
    const n = arr.length;
    if (n < 2) return { r: NaN, r2: NaN };

    let sumX = 0, sumY = 0, sumXX = 0, sumYY = 0, sumXY = 0;

    for (let i = 0; i < n; i++) {
        const x = i;
        const y = arr[i];
        sumX += x;
        sumY += y;
        sumXX += x * x;
        sumYY += y * y;
        sumXY += x * y;
    }

    const num = n * sumXY - sumX * sumY;
    const denX = n * sumXX - sumX * sumX;
    const denY = n * sumYY - sumY * sumY;
    const den = Math.sqrt(denX * denY);

    if (den === 0) return { r: NaN, r2: NaN };

    const r = num / den;
    const r2 = r * r;
    return { r, r2 };
}

console.log("avg=" + timeSum / 1000 + "ms");
console.log("R=" + JSON.stringify(corrIndexValue(times)));*/

let searchOption = {
    regex: false,
    content: false,
    title: true
};

let nowView;
let activeHighlightRaf = 0;
let activeHighlightToken = 0;

document.getElementById("cover").addEventListener("click", () => {
    nowView.classList.add("n");
    document.getElementById("cover").classList.add("n");
    [...document.getElementsByClassName("ho")].forEach(ho => ho.classList.remove("ho"));
});

document.getElementById("realSO").addEventListener("click", () => {
    toggleClass(document.getElementById("cover"), "n");
    nowView = document.getElementById("optionSelector");
    nowView.classList.remove("n");
    document.getElementById("realBG").classList.add("ho");
    document.getElementById("realBGbeh").classList.add("ho");
});

[...document.getElementsByClassName("toggle")].forEach((e) => {
    e.addEventListener("click", () => {
        const toggleI = e.getElementsByClassName("toggleI")[0];
        searchOption[e.dataset.opt] = !toggleClass(toggleI, "on");
    });
});

let arrowIsNow = 0;
let lFuncNow = null;
let rFuncNow = null;
//let requestedWalkerFuncs = [];

const colorP = "#c9f1f8";
const colorIp = "#273436";

document.getElementById("searchInput").addEventListener("keydown", (e) => {
    if (!(e.key === "Enter") || e.isComposing) {
        return;
    }

    if (activeHighlightRaf) {
        cancelAnimationFrame(activeHighlightRaf);
    }
    activeHighlightRaf = 0;
    activeHighlightToken++;

    const prevHits = [...document.getElementsByClassName("hit")];
    /*for (let i = 0, l = requestedWalkerFuncs.length; i < l; i++) {
        const rwf = requestedWalkerFuncs[i];
        console.log(rwf)
        document.getElementById(rwf[0]).removeEventListener("click", rwf[1]);
    }*/

    document.getElementById("nowSearched").textContent = "";
    document.getElementById("searchedNumber").textContent = "";
    document.getElementById("arrowL").style.fill = "#777";
    document.getElementById("arrowL").removeEventListener("click", lFuncNow);
    document.getElementById("arrowR").style.fill = "#777";
    document.getElementById("arrowR").removeEventListener("click", rFuncNow);

    for (let i = 0, l = prevHits.length; i < l; i++) {
        const prevHit = prevHits[i];
        if (prevHit.tagName === "SPAN") {
            prevHit.replaceWith(prevHit.textContent);
        } else {
            prevHit.classList.remove("hit");
        }
    }

    document.getElementById("wrapper").normalize();

    const query = document.getElementById("searchInput").value;
    if (query === "") {
        return;
    }

    const searchResults = parsed.searchFunction(query, searchOption);
    const title = searchOption.title || (!searchOption.title && !searchOption.content);
    const contentMatches = [];
    const titleMatches = [];
    const hitArticles = new Set();
    const expandedBelows = new Set();

    for (let i = 0, l = searchResults.length; i < l; i++) {
        const aResult = searchResults[i];
        const hitLeft = document.getElementById("p" + aResult[0]);
        if (!hitLeft) {
            continue;
        }

        if (!hitArticles.has(hitLeft)) {
            let ancestor = hitLeft.parentElement;
            while (ancestor) {
                if (ancestor.classList.contains("below") && !expandedBelows.has(ancestor)) {
                    expandedBelows.add(ancestor);
                    ancestor.classList.remove("n");

                    const parentLayer = ancestor.parentElement;
                    if (parentLayer) {
                        const nameElem = parentLayer.firstElementChild;
                        if (nameElem && nameElem.classList.contains("nameElem")) {
                            const toggleElem = nameElem.firstElementChild;
                            if (toggleElem && toggleElem.classList.contains("toggleElem")) {
                                toggleElem.classList.remove("off");
                            }
                        }
                    }
                }
                ancestor = ancestor.parentElement;
            }

            hitArticles.add(hitLeft);
            const nameElem = hitLeft.firstElementChild;
            if (nameElem) {
                const titleElem = nameElem.lastElementChild;
                if (titleElem) {
                    titleElem.classList.add("hit");
                }
            }
        }

        if (searchOption.regex) {
            for (let j = 0, m = aResult[2].length; j < m; j++) {
                const match = aResult[2][j];
                if (title) {
                    titleMatches.push(match);
                }
                if (searchOption.content) {
                    contentMatches.push(match);
                }
            }
        } else if (searchOption.content) {
            contentMatches.push(query);
        }
    }

    document.getElementById("searchedNumber").textContent = hitArticles.size;
    if (hitArticles.size === 0) {
        document.getElementById("nowSearched").textContent = "0/";
    } else {
        document.getElementById("nowSearched").textContent = "1/";
        const hitArticlesArr = [...hitArticles];
        hitArticlesArr[0].scrollIntoView({
            behavior: "smooth"
        });
        if (hitArticlesArr.length === 1) {
            document.getElementById("arrowR").style.fill = colorIp;
        } else {
            document.getElementById("arrowR").style.fill = colorP;
        }

        lFuncNow = () => {
            if (arrowIsNow === 1) {
                document.getElementById("arrowL").style.fill = colorIp;
            } else if (arrowIsNow === 0) {
                return;
            }

            document.getElementById("arrowR").style.fill = colorP;
            hitArticlesArr[--arrowIsNow].scrollIntoView({
                behavior: "smooth"
            });
            document.getElementById("nowSearched").textContent = (arrowIsNow + 1) + "/";
        };

        rFuncNow = () => {
            if (arrowIsNow === hitArticlesArr.length - 2) {
                document.getElementById("arrowR").style.fill = colorIp;
            } else if (arrowIsNow === hitArticlesArr.length - 1) {
                return;
            }

            document.getElementById("arrowL").style.fill = colorP;
            hitArticlesArr[++arrowIsNow].scrollIntoView({
                behavior: "smooth"
            });
            document.getElementById("nowSearched").textContent = (arrowIsNow + 1) + "/";
        };

        document.getElementById("arrowL").addEventListener("click", lFuncNow);
        document.getElementById("arrowR").addEventListener("click", rFuncNow);
    }

    if (title) {
        if (searchOption.regex) {
            startTitleHighlight(titleMatches);
        } else {
            startTitleHighlight([query]);
        }
    }

    if (searchOption.content) {
        startContentHighlight(contentMatches);
    }
});

function toggleClass(elem, name) {
    if (elem.classList.contains(name)) {
        elem.classList.remove(name);
        return true;
    } else {
        elem.classList.add(name);
        return false;
    }
}

function startTitleHighlight(matches) {
    const needles = [...new Set(matches)].filter(Boolean);
    if (needles.length === 0) {
        return;
    }

    const regex = new RegExp(needles.map(escapeRegExp).join("|"), "g");
    const targets = document.querySelectorAll("[id^=\"c\"]");

    targets.forEach((el) => {
        const nodes = Array.from(el.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE);
        nodes.forEach((node) => {
            const text = node.nodeValue;
            regex.lastIndex = 0;
            let match;
            let lastIndex = 0;
            const frag = document.createDocumentFragment();

            while ((match = regex.exec(text)) !== null) {
                const start = match.index;
                const end = start + match[0].length;
                if (start > lastIndex) {
                    frag.appendChild(document.createTextNode(text.slice(lastIndex, start)));
                }

                const hit = document.createElement("span");
                hit.className = "hit";
                hit.textContent = match[0];
                frag.appendChild(hit);
                lastIndex = end;
            }

            if (lastIndex === 0) {
                return;
            }

            if (lastIndex < text.length) {
                frag.appendChild(document.createTextNode(text.slice(lastIndex)));
            }
            node.replaceWith(frag);
        });
    });
}

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function startContentHighlight(matches) {
    const needles = [...new Set(matches)].filter(Boolean);
    if (activeHighlightRaf) {
        cancelAnimationFrame(activeHighlightRaf);
    }
    const token = ++activeHighlightToken;
    if (needles.length === 0) {
        return;
    }

    const wrapper = document.getElementById("wrapper");
    const regex = new RegExp(needles.map(escapeRegExp).join("|"), "g");
    const nodes = [];
    const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT, null);
    let node;

    while ((node = walker.nextNode())) {
        regex.lastIndex = 0;
        if (regex.test(node.nodeValue)) {
            nodes.push(node);
        }
    }

    let idx = 0;
    function processNext() {
        if (token !== activeHighlightToken) {
            return;
        }
        if (idx >= nodes.length) {
            activeHighlightRaf = 0;
            return;
        }

        const deadline = performance.now() + 8;
        while (idx < nodes.length) {
            const n = nodes[idx++];
            const text = n.nodeValue;
            const frag = document.createDocumentFragment();
            regex.lastIndex = 0;
            let lastIndex = 0;
            let match;

            while ((match = regex.exec(text)) !== null) {
                const start = match.index;
                const end = start + match[0].length;
                if (start > lastIndex) {
                    frag.appendChild(document.createTextNode(text.slice(lastIndex, start)));
                }

                const hit = document.createElement("span");
                hit.className = "hit";
                hit.textContent = match[0];
                frag.appendChild(hit);
                lastIndex = end;
            }

            if (lastIndex < text.length) {
                frag.appendChild(document.createTextNode(text.slice(lastIndex)));
            }
            if (n.parentNode) {
                n.parentNode.replaceChild(frag, n);
            }
            if (idx % 20 === 0 && performance.now() >= deadline) {
                break;
            }
        }

        activeHighlightRaf = requestAnimationFrame(processNext);
    }

    activeHighlightRaf = requestAnimationFrame(processNext);
}
