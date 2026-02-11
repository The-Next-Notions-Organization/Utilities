import { CONFIG } from "../rule.js";
import {
    parseError, flCompareSingle, splitOnce, gl
} from "./utilities.js";
import { tags } from "./tagdef.js";
/// <reference path="./typedef.js" />

const tokenizerRegex = new RegExp("(" +
    "(\\{[^\\{]+\\{)|" +
    "\\}\\}|" +
    "@[^@]+@|" +
    ";|" +
    "\\[|\\]|" +
    "[^\\{\\};\\n@\\[\\]]+"
    + ")", "smg");

function isVariableToken(value) {
    return value.length >= 2 && value[0] === "@" && value[value.length - 1] === "@";
}

/**
 * @param {{ast: ATag[], layers: {depth: number, index: number, name: string, content: string, below: *[]}[], time: number}} rulesJson
 * @returns {{html: HTMLDivElement, side: HTMLDivElement}}
 */
export function jsonToHtml(rulesJson) {
    const time = -performance.now();
    /**
     * @param {ATag[]} ast
     * @returns {(HTMLElement|string)[]}
     */
    function parseAst(ast) {
        const result = [];
        for (let i = 0, l = ast.length; i < l; i++) {
            const element = ast[i];
            if (element.type === "tag") {
                const tagInfo = tags[element.name];
                const parsedContents = parseAst(element.ast);
                const parsedArguments = parseAst(element.arguments);
                result.push(tagInfo.toHtml({
                    tagName: tagInfo.inHtml,
                    contents: parsedContents,
                    attributes: element.attributes,
                    index: element.name === "/" ? element.index : null
                }, parsedArguments));
            } else {
                result.push(element.content);
            }
        }
        return result;
    }
    const result = {
        html: document.createElement("div"),
        side: null,
        allTime: null
    };
    const side = document.createElement("div");
    /**
     * @param {{depth: number, index: number, name: string, content: string, below: *[]}[]} layers
     */
    function exploreLayers(layers, into) {
        for (let i = 0, l = layers.length; i < l; i++) {
            const layer = layers[i];
            const { depth, below, index, name } = layer;
            const res = document.createElement("div");
            const elem = document.createElement("div");

            const nameElem = document.createElement("div");
            nameElem.classList.add("nameElem");
            if (below.length !== 0) {
                const toggleElem = document.createElement("div");
                toggleElem.textContent = "v";
                toggleElem.classList.add("toggleElem");
                nameElem.appendChild(toggleElem);
            }
            const nameDiv = document.createElement("div");
            nameDiv.dataset.target = "c" + index;
            nameDiv.textContent = name;
            nameElem.appendChild(nameDiv);
            res.appendChild(nameElem);

            res.style.marginLeft = (depth > 1 ? CONFIG.leftIndent.base : 0) + CONFIG.leftIndent.unit;
            res.id = "p" + index;
            res.classList.add("layerElem");
            elem.classList.add("below");
            exploreLayers(below, elem);
            res.appendChild(elem);
            into.appendChild(res);
        }
    }
    const sideFragment = document.createDocumentFragment();
    exploreLayers(rulesJson.layers, sideFragment);
    side.appendChild(sideFragment);
    side.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.classList.contains("toggleElem")) {
            const layerElem = target.closest(".layerElem");
            if (!layerElem) return;
            const below = layerElem.lastElementChild;
            if (!(below instanceof HTMLElement)) return;
            target.classList.toggle("off");
            below.classList.toggle("n");
            return;
        }
        const targetId = target.dataset.target;
        if (!targetId) return;
        const content = document.getElementById(targetId);
        if (!content) return;
        content.scrollIntoView({
            behavior: "smooth"
        });
    });
    result.side = side;
    const secondParseTime = time + performance.now();
    result.html.append(document.createComment("1st parse have taken " + rulesJson.time + " ms"));
    result.html.append(document.createComment("2nd parse have taken " + secondParseTime + " ms"));
    result.allTime = rulesJson.time + secondParseTime;
    const parsed = parseAst(rulesJson.ast);
    result.html.append(...parsed);
    return result;
}

/**
 * @param {string} rules
 * @returns {{
 *   ast: ATag[],
 *   layers: [number, number, string, string],
 *   searchFunction: (query: string, opt: {regex: boolean, title: boolean, content: boolean}) => [index:number, where:number, matches:string[]][],
 *   time: number
 * }}
 */
export function parseToJson(rules) {
    const result = { ast: [], layers: [], searchFunction: null, time: -performance.now() };
    const splitter = "~~~~";
    const splitterIndex = rules.indexOf(splitter);
    if (splitterIndex === -1) throw parseError("Splitter(~~~~) couldn't be found.");
    if (rules.indexOf(splitter, splitterIndex + splitter.length) !== -1) {
        throw parseError("Too many splitters(~~~~) you must be mistaking the format.");
    }
    const rule = rules.slice(0, splitterIndex);
    const variables = rules.slice(splitterIndex + splitter.length);
    const definedVariables = new Map();

    const variableEntries = variables.split(";;");
    for (let i = 0, l = variableEntries.length; i < l; i++) {
        const variable = variableEntries[i];
        if (!variable) continue;
        const variableSplit = variable.split("==");
        if (variableSplit.length !== 2 || !variableSplit[0]) continue;
        const zSplit = variableSplit[0].split(":");
        const type = zSplit[0].replace("\n", "");
        const key = zSplit[1];
        const value = variableSplit[1];
        if (!key) continue;
        if (definedVariables.has(key)) console.warn("There's already a variable named \"" + key + "\". Variable was overwritted.");
        definedVariables.set(key, {
            type,
            value: resolveVariableTypes(type, value)
        });
    }

    const ast = [];
    const layers = [];
    const searchIndex = [];
    const uncloseds = [];
    const unclosedLayers = [];
    const elementArgumentStack = [];
    let depth = 0;

    const tokens = tokenize(rule);

    const dev = CONFIG.dev ? {
        log: (...m) => console.log("    ".repeat(depth), ...m),
        warn: (...m) => console.warn("    ".repeat(depth), ...m),
        warnO: (offset, ...m) => console.log("    ".repeat(depth + offset), ...m)
    } : {
        log: () => { },
        warn: () => { },
        warnO: () => { }
    };
    dev.log(tokens);

    for (let index = 0, tokenLength = tokens.length; index < tokenLength; index++) {
        const token = tokens[index];
        if (token === "[") {
            elementArgumentStack.push(depth);
            dev.log("[ started");
        }
        else if (flCompareSingle(token, "{", "{")) {
            const tag = {
                type: "tag",
                name: "",
                attributes: {},
                arguments: [],
                argumentsLength: 0,
                selector: null,
                ast: [],
                plainText: "",
                nameText: ""
            };
            depth++;
            dev.warnO(0, "depth++", depth);
            const allInTagSplit = splitOnce(token.slice(1, -1), ":");
            const tagName = allInTagSplit[0];
            tag.name = tagName;
            const tagInfo = tags[tagName];
            tag.argumentsLength = tagInfo.args;
            tag.selector = tagInfo.selector;
            if (CONFIG.attr.indent.toAll.enable && !CONFIG.attr.indent.toAll.override) {
                tag.attributes.indent = depth;
            }
            if (allInTagSplit.length === 2) {
                const attributes = allInTagSplit[1].split(",");
                for (let i = 0, l = attributes.length; i < l; i++) {
                    const attribute = attributes[i];
                    const attributeSplit = splitOnce(attribute, "=");
                    const rightValue = attributeSplit[1].replace(/^\s+/, "");
                    const attrName = attributeSplit[0];
                    if (isVariableToken(rightValue)) {
                        const varName = rightValue.slice(1, -1);
                        const variable = definedVariables.get(varName);
                        if (!variable) {
                            if (varName !== "depth") {
                                throw parseError("There is no variable named \"" + varName + "\". If your purpose of writing @ was not to express a variable, you can write &at; instead.");
                            }
                            tag.attributes[attrName] = depth;
                        } else {
                            tag.attributes[attrName] = variable.value;
                        }
                        continue;
                    }
                    tag.attributes[attrName] = rightValue;
                }
            }
            if (CONFIG.attr.indent.toAll.enable && CONFIG.attr.indent.toAll.override) {
                tag.attributes.indent = depth;
            }
            dev.log(tagName, "started");
            uncloseds.push(tag);
            if (tag.name === "/") {
                unclosedLayers.push({
                    depth,
                    index,
                    name: null,
                    content: null,
                    below: []
                });
                tag.index = index;
            }
        }
        else if (token === "}}") {
            const lastTag = gl(uncloseds);
            if (lastTag === null) throw parseError("A bracket that isn't even started was closed.");
            const nextToken = tokens[index + 1];
            if (lastTag.argumentsLength !== 0) {
                let hasDepthMarker = false;
                for (let i = elementArgumentStack.length - 1; i >= 0; i--) {
                    if (elementArgumentStack[i] === depth - 1) {
                        hasDepthMarker = true;
                        break;
                    }
                }
                if (hasDepthMarker) {
                    while (elementArgumentStack.length !== 0) {
                        const argument = elementArgumentStack.pop();
                        if (argument === depth - 1) break;
                        if (!lastTag.selector(argument[1])) {
                            console.error(lastTag);
                            throw parseError("Selector returned false in the above tag");
                        }
                        const argumentTag = argument[1];
                        lastTag.arguments.push(argumentTag);
                        if (argumentTag.type === "text") {
                            lastTag.nameText += argumentTag.content;
                            lastTag.plainText += argumentTag.content;
                        } else {
                            lastTag.nameText += argumentTag.nameText;
                            if (argumentTag.name !== "/") {
                                lastTag.plainText += argumentTag.plainText;
                            }
                        }
                        dev.log("arg", argumentTag);
                    }
                    if (nextToken !== ";") throw parseError("Elements that take arguments must have a semicolon directly after it.");
                    if (tokens[index + 2] !== "]") throw parseError("Square bracket must be closed directly after an element which has arguments.");
                    elementArgumentStack.push([depth, lastTag]);
                    dev.log(lastTag.name, "finished");
                    dev.warnO(-1, "depth--", depth - 1);
                    depth--;
                    uncloseds.pop();
                    continue;
                }
                else {
                    if (CONFIG.dev) {
                        dev.log("eas", [...elementArgumentStack]);
                    }
                    let sdaLen = 0;
                    while (elementArgumentStack.length !== 0) {
                        const argument = gl(elementArgumentStack);
                        if (!Array.isArray(argument) || argument[0] !== depth) break;
                        sdaLen++;
                        elementArgumentStack.pop();
                        if (!lastTag.selector(argument[1])) {
                            console.error(lastTag);
                            throw parseError("Selector returned false in the above tag");
                        }
                        const argumentTag = argument[1];
                        lastTag.arguments.push(argumentTag);
                        if (argumentTag.type === "text") {
                            lastTag.nameText += argumentTag.content;
                            lastTag.plainText += argumentTag.content;
                        } else {
                            lastTag.nameText += argumentTag.nameText;
                            if (argumentTag.name !== "/") {
                                lastTag.plainText += argumentTag.plainText;
                            }
                        }
                    }
                    if (sdaLen !== lastTag.argumentsLength) throw parseError("The number of provided arguments doesn't match the correct number of arguments that " + lastTag.name + " should've taken.");
                    if (nextToken !== ";") throw parseError("Elements that take arguments must have a semicolon directly after it.");

                }
            } else if (nextToken !== ";") {
                elementArgumentStack.push([depth, lastTag]);
            }

            uncloseds.pop();
            if (nextToken === ";") {
                if (lastTag.name === "/") {
                    const lastLayer = gl(unclosedLayers);
                    lastLayer.name = "name" in lastTag.attributes ? lastTag.attributes.name : argumentsNameText(lastTag.arguments);
                    lastLayer.content = lastTag.plainText;

                    unclosedLayers.pop();
                    const exposedLayer = gl(unclosedLayers);
                    if (!exposedLayer) {
                        layers.push(lastLayer);
                    } else {
                        exposedLayer.below.push(lastLayer);
                    }
                    searchIndex.push([lastLayer.index, lastLayer.name, lastLayer.content]);
                }
                const lastUnclosed = gl(uncloseds);
                if (!lastUnclosed) {
                    dev.log("into ast ", lastTag);
                    ast.push(lastTag);
                } else {
                    lastUnclosed.nameText += lastTag.nameText;
                    if (lastTag.name !== "/") {
                        lastUnclosed.plainText += lastTag.plainText;
                    }
                    if (CONFIG.dev) {
                        dev.log("into something's ast", lastTag, [...uncloseds]);
                    }
                    lastUnclosed.ast.push(lastTag);
                }
            }
            dev.log(lastTag.name, "finished");
            dev.warnO(-1, "depth--", depth - 1);
            depth--;
        }
        else if (token === "]") {
            dev.log("] finished");
        }
        else if (token === ";") {
        }
        else {
            const lastTag = gl(uncloseds);
            if (lastTag === null) {
                throw parseError("You may not put text in the top level.");
            }
            let value = token;
            if (typeof token === "function") {
                value = token();
            }
            lastTag.ast.push({
                type: "text",
                content: value
            });
            lastTag.nameText += value;
            lastTag.plainText += value;
        }
    }
    if (uncloseds.length !== 0) {
        throw parseError("There are unclosed brackets.\nDetail: " + JSON.stringify(uncloseds));
    }
    result.ast = ast;
    result.layers = layers;
    let cachedQuery = null;
    let cachedIngredient = null;
    let cachedRegex = null;

    result.searchFunction = (query, option) => {
        if (query !== cachedQuery || option.regex !== cachedRegex) {
            cachedQuery = query;
            cachedRegex = option.regex;
            cachedIngredient = option.regex ? new RegExp(query, "smg") : query;
        }
        const ingredient = cachedIngredient;
        const { regex, title, content } = option;
        const useTitle = !!title;
        const useContent = !!content;
        const results = [];
        for (let i = 0, l = searchIndex.length; i < l; i++) {
            const element = searchIndex[i];
            if (useTitle) {
                if (regex) {
                    const match = element[1].match(ingredient);
                    if (match) results.push([element[0], 1, match]);
                } else if (element[1].includes(ingredient)) {
                    results.push([element[0], 1, []]);
                }
            }
            if (useContent) {
                if (regex) {
                    const match = element[2].match(ingredient);
                    if (match) results.push([element[0], 2, match]);
                } else if (element[2].includes(ingredient)) {
                    results.push([element[0], 2, []]);
                }
            }
        }
        return results;
    };
    result.time += performance.now();
    dev.log("AST: ", ast);

    return result;

    function resolveVariableTypes(type, value) {
        switch (type) {
            case "r": {
                const result = {};
                result.text = value;
                result.tokens = tokenize(value);
                return result;
            }
            case "n": {
                if (isNaN(value)) throw new TypeError("Type mismatched. The value you declared as a number turned out to be NaN. You liar!");
                return Number(value);
            }
        }
        return value;
    }

    /**
     * @param {string} rule
     *
     * @returns {string[]}
     */
    function tokenize(rule) {
        const matched = rule.match(tokenizerRegex);
        if (!matched) return [];
        const tokenized = [];
        for (let i = 0, l = matched.length; i < l; i++) {
            const trimmed = matched[i].trim();
            if (trimmed === "") continue;
            if (isVariableToken(trimmed)) {
                const varName = trimmed.slice(1, -1);
                if (varName === "depth") {
                    tokenized.push(() => depth);
                    continue;
                }
                const variable = definedVariables.get(varName);
                if (!variable) throw new SyntaxError("There is no variable named \"" + varName + "\"...");
                switch (variable.type) {
                    case "r": {
                        const varTokens = variable.value.tokens;
                        for (let j = 0, k = varTokens.length; j < k; j++) {
                            tokenized.push(varTokens[j]);
                        }
                        break;
                    }
                    default:
                        tokenized.push(variable.value);
                }
                continue;
            }
            tokenized.push(trimmed);
        }
        return tokenized;
    }

    function argumentsNameText(args) {
        let result = "";
        for (let i = 0, l = args.length; i < l; i++) {
            const arg = args[i];
            if (arg.type === "text") {
                result += arg.content;
            } else {
                result += arg.nameText;
            }
        }
        return result;
    }
}
