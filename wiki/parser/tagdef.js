import { CONFIG } from "../rule.js";
/// <reference path="./typedef.js" />

const slashSelectorRegex = /\#+/;

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
            defaultAttributeResolve(info.attributes, content, { indent: 1 });
            return result;
        }
    },
    "#": {
        inHtml: "h1",
        toHtml: plainNoArgs,
        args: 0,
    },
    "##": {
        inHtml: "h2",
        toHtml: plainNoArgs,
        args: 0,
    },
    "###": {
        inHtml: "h3",
        toHtml: plainNoArgs,
        args: 0,
    }
};

/**
 * @param {TohtmlInfo} info 
 * @param {*[]} _ 
 * @returns 
 */
function plainNoArgs(info, _) {
    const result = document.createElement(info.tagName);
    for (let i = 0, l = info.contents.length; i < l; i++) {
        result.append(info.contents[i]);
    }
    defaultAttributeResolve(info.attributes, result);
    return result;
}

/**
 * @param {Object.<string, *>} attributes 
 * @param {HTMLElement} element 
 */
function defaultAttributeResolve(attributes, element, offsets = {}) {
    if ("indent" in attributes) {
        const num = attributes.indent;
        element.style.marginLeft = ((Number(num) - 1 + offsets.indent) > 0
            ? CONFIG.attr.indent.base
            : 0) + CONFIG.attr.indent.unit;
    }
}
