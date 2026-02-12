import { CONFIG } from "../rule.js";
/// <reference path="./typedef.js" />

const slashSelectorRegex = /\#+/;
const classByCss = new Map();
let weakStyleElement = null;

/**
 * @type {Object.<string, TagInfo>}
 */
export const tags = {
    "/": {
        inHtml: "div",
        args: 1,
        selector: (tag) => slashSelectorRegex.test(tag.name),
        /**
         * @param {TohtmlInfo} info 
         * @param {*[]} args 
         */
        toHtml: (info, args) => {
            const header = args[0];
            const identifier = info.index;
            const result = document.createElement("div");
            header.id = "c" + identifier;
            result.appendChild(header);
            const content = document.createElement("div");
            for (let i = 0, l = info.contents.length; i < l; i++) {
                content.append(info.contents[i]);
            }
            result.appendChild(content);
            defaultAttributeResolve(info.attributes, info.isBlock, content, { indent: 1 });
            return result;
        },
        isBlock: true
    },
    "#": {
        inHtml: "h1",
        toHtml: plainNoArgs,
        args: 0,
        isBlock: true
    },
    "##": {
        inHtml: "h2",
        toHtml: plainNoArgs,
        args: 0,
        isBlock: true
    },
    "###": {
        inHtml: "h3",
        toHtml: plainNoArgs,
        args: 0,
        isBlock: true
    },
    "e": {
        inHtml: "span",
        toHtml: classNoArgs("etag"),
        args: 0,
        isBlock: false
    },
    "b": {
        inHtml: "span",
        toHtml: cssNoArgs("font-weight: 900;"),
        args: 0,
        isBlock: false
    },
    "i": {
        inHtml: "img",
        toHtml: (info, _) => {
            const result = document.createElement("img");
            console.log(info.contents)
            const src = info.contents.map(n => n.nodeValue).join("");
            result.src = src;
            let isBlock = true;
            if ("isBlock" in info.attributes) {
                isBlock = info.attributes.isBlock === "true";
            }
            result.classList.add("r-itag");
            let imageSizeCss = "";
            if ("height" in info.attributes) {
                imageSizeCss += "height: " + String(info.attributes.height) + ";";
            }
            if ("width" in info.attributes) {
                imageSizeCss += "width: " + String(info.attributes.width) + ";";
            }
            if (imageSizeCss !== "") {
                const className = registerCssByRule(imageSizeCss, 6);
                result.classList.add(className);
            }
            defaultAttributeResolve(info.attributes, isBlock, result);
            return result;
        },
        args: 0,
        isBlock: null
    }
};

/**
 * @param {TohtmlInfo} info 
 * @param {*[]} _ 
 * @returns {HTMLElement}
 */
function plainNoArgs(info, _) {
    const result = document.createElement(info.tagName);
    for (let i = 0, l = info.contents.length; i < l; i++) {
        result.append(info.contents[i]);
    }
    defaultAttributeResolve(info.attributes, info.isBlock, result);
    return result;
}

/**
 * @param {string[]} classes
 * @returns {(info: TohtmlInfo, _: *[]) => HTMLElement}
 */
function classNoArgs(...classes) {
    return (info, _) => {
        const result = document.createElement(info.tagName);
        result.classList.add(...classes);
        for (let i = 0, l = info.contents.length; i < l; i++) {
            result.append(info.contents[i]);
        }
        defaultAttributeResolve(info.attributes, info.isBlock, result);
        return result;
    }
}

/**
 * @param {string} css
 * @returns {(info: TohtmlInfo, _: *[]) => HTMLElement}
 */
function cssNoArgs(css, clazz = randomClassName(), ...classes) {
    clazz = registerCssByRule(css, clazz.length, clazz);
    return (info, _) => {
        const result = document.createElement(info.tagName);
        for (let i = 0, l = info.contents.length; i < l; i++) {
            result.append(info.contents[i]);
        }
        defaultAttributeResolve(info.attributes, info.isBlock, result);
        result.classList.add(clazz, ...classes);
        return result;
    }
}

/**
 * @param {Object.<string, *>} attributes 
 * @param {boolean} isBlock
 * @param {HTMLElement} element 
 */
function defaultAttributeResolve(attributes, isBlock, element, offsets = {}) {
    if (isBlock) element.classList.add("r-is-block");
    if ("style" in attributes) {
        const css = attributes.style;
        element.style.cssText = css;
    }
    if (isBlock && ("indent" in attributes)) {
        const num = attributes.indent;
        element.style.marginLeft = ((Number(num) - 1 + offsets.indent) > 0
            ? CONFIG.attr.indent.base
            : 0) + CONFIG.attr.indent.unit;
    }
    if ("c" in attributes) {
        const clazz = attributes.c;
        element.classList.add(...clazz.split(" "));
    }
}

function randomClassName(len = 5) {
    const first = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const rest = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-";

    let out = first[(Math.random() * first.length) | 0];

    for (let i = 1; i < len; i++) {
        out += rest[(Math.random() * rest.length) | 0];
    }
    return out;
}

function registerCss(clazz, css) {
    /**
     * @type {HTMLStyleElement}
     */
    let style = weakStyleElement;
    if (!style) {
        style = document.getElementById("rulesstyleweak");
        if (!style) {
            style = document.createElement("style");
            style.id = "rulesstyleweak";
            document.head.prepend(style);
            style.append("");
        }
        weakStyleElement = style;
    }
    style.sheet.insertRule("." + clazz + "{" + css + "}", style.sheet.cssRules.length);
}

function registerCssByRule(css, randomLen = 5, preferredClass = null) {
    if (classByCss.has(css)) {
        return classByCss.get(css);
    }
    const clazz = preferredClass || randomClassName(randomLen);
    registerCss(clazz, css);
    classByCss.set(css, clazz);
    return clazz;
}
