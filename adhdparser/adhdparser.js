const RULE = `
[{#{前文}}{/{
    Lorem ipsum
}};]{/{
    Lorem ipsum
}};
{#:name=
    @name1@,color=red{第一条}}{/{
    @element2@
    {##:name="あああについて"{第一項}}{/{
        Lorem ipsum a adasd a sdasdsd sdsdad
        改行後
        {##{DDDD}};
        {###{AAABBB}};
        aadasdplp spldplasdplao okoskdoaskdoak soakdoask aosdko
    };
}};
~~~~
s:name1==あああ規定;;
r:element1=={##{masakano}};
{##{
    ADSD
}}{/{
    aaa
    {###{ACCD}};
    aaa
}};
;;
r:element2=={##{adssadasd}};
{##{
    dddd
}}{/{
    asdasd
    {###{cascas}};
    @element1@
}};
;;`;

const DEV = true;

/*
    s: string
    r: rules
    n: number
*/
/**
 * @typedef {{
 *   type: string,
 *   value: any
 * }} DefinedVariable
 * 
 * @typedef {{
 *   text: string,
 *   tokens: string[]
 * }} RuleVariable
 * 
 * @typedef {{
 *   inHtml: string,
 *   args: number
 * }} TagInfo
 */
const tokenizerRegex = new RegExp("(" +
    "(\\{[^\\{]+\\{)|" +
    "\\}\\}|" +
    "@[^@]+@|" +
    ";|" +
    "\\[|\\]|" +
    "[^\\{\\};\\n@\\[\\]]+"
    + ")", "smg");
const attributeVariableRegex = /^@.+@$/sm;
const spaceRegex = /^\s+$/s;

/**
 * @type {Object.<string, TagInfo>}
 */
const tags = {
    "/": {
        inHtml: "div",
        args: 1
    },
    "#": {
        inHtml: "h1",
        args: 0,
    },
    "##": {
        inHtml: "h2",
        args: 0,
    },
    "###": {
        inHtml: "h3",
        args: 0,
    }
}

class ParseError extends Error {
    constructor(message) {
        super(message);
    }
}

/** 
 * @param {string} rules
 */
function parse(rules) {
    const mainTextSplit = rules.split("~~~~");
    if (mainTextSplit.length < 2) throw parseError("Splitter(~~~~) couldn't be found.");
    else if (mainTextSplit.length > 2) throw parseError("Too many splitters(~~~~) you must be mistaking the format.");
    const [rule, variables] = mainTextSplit;
    let result = {
        json: {
            ast: []
        },
        html: ""
    };
    const variablesSplit = variables.split(";;").map(elem => elem.split("=="));
    /**
     * @type {Object.<string, DefinedVariable>}
     */
    let definedVariables = {};
    for (const variable of variablesSplit) {
        if (variable.length !== 2 || !variable[0]) continue;
        const zSplit = variable[0].split(":");
        const type = zSplit[0].replace("\n", "");
        const value = variable[1];
        if (zSplit[1] in definedVariables) console.warn("There's already a variable named \"" + zSplit[1] + "\". Variable was overwritted.");
        definedVariables[zSplit[1]] = {
            type,
            value: resolveVariableTypes(type, value)
        }
    }

    const tokens = tokenize(rule);

    console.log(tokens)

    let ast = [];
    let uncloseds = [];
    let elementArgumentStack = [];
    let index = 0;
    let depth = 0;
    const dev = DEV ? {
        log: (...m) => console.log("    ".repeat(depth), ...m),
        warn: (...m) => console.warn("    ".repeat(depth), ...m),
        warnO: (offset, ...m) => console.log("    ".repeat(depth + offset), ...m)
    } : {
        log: (...m) => { },
        warn: (...m) => { },
        warnO: (offset, ...m) => { }
    };
    for (const token of tokens) {
        if (token === "[") {
            elementArgumentStack.push(depth);
            dev.log("[ started")
        }
        else if (flCompareSingle(token, "{", "{")) {
            let tag = {
                type: "tag",
                name: "",
                attributes: {},
                arguments: [],
                argumentsLength: 0,
                ast: []
            }
            dev.warnO(0, "depth++", depth + 1);
            depth++;
            const allInTagSplit = splitOnce(token.slice(1, -1), ":");
            const tagName = allInTagSplit[0];
            tag.name = tagName;
            const tagInfo = tags[tagName];
            tag.argumentsLength = tagInfo.args;
            if (allInTagSplit.length === 2) {
                for (const attribute of allInTagSplit[1].split(",")) {
                    const attributeSplit = splitOnce(attribute, "=");
                    const rightValue = attributeSplit[1].replace(/^\s+/, "");
                    const attrName = attributeSplit[0];
                    if (attributeVariableRegex.test(rightValue)) {
                        const varName = rightValue.slice(1, -1);
                        const variable = definedVariables[varName];
                        if (!variable) throw parseError("There is no variable named \"" + varName + "\". If your purpose of writing @ was not to express a variable, you can write &at; instead.");
                        tag.attributes[attrName] = variable.value;
                        continue;
                    }
                    tag.attributes[attrName] = rightValue;
                }
            }
            dev.log(tagName, "started");
            uncloseds.push(tag);
        }
        else if (token === "}}") {
            const lastTag = gl(uncloseds);
            if (lastTag === null) throw parseError("A bracket that isn't even started was closed.");
            if (lastTag.argumentsLength !== 0) {
                const sqbIndex = elementArgumentStack.findLastIndex(elem => elem === depth - 1);
                if (sqbIndex !== -1) {
                    forEachReverse(elementArgumentStack, argument => {
                        elementArgumentStack.pop();
                        if (argument === depth - 1) return true;
                        lastTag.arguments.push(argument[1]);
                        dev.log("arg", argument)
                        return false;
                    });
                    if (tokens[index + 1] !== ";") throw parseError("Elements that take arguments must have a semicolon directly after it.");
                    if (tokens[index + 2] !== "]") throw parseError("Square bracket must be closed directly after an element which has arguments.");
                    elementArgumentStack.push([depth, lastTag]);
                    dev.log(lastTag.name, "finished");
                    index++;
                    dev.warnO(-1, "depth--", depth - 1);
                    depth--;
                    uncloseds.pop();
                    continue;
                } else {
                    const sameDepthArguments = elementArgumentStack.filter(elem => elem[0] === depth);
                    dev.log("eas", [...elementArgumentStack]);
                    if (sameDepthArguments.length !== lastTag.argumentsLength) throw parseError("The number of provided arguments doesn't match the correct number of arguments that " + lastTag.name + " should've taken.");
                    forEachReverse(elementArgumentStack, argument => {
                        if (argument[0] !== depth) return true;
                        elementArgumentStack.pop();
                        lastTag.arguments.push(argument[1]);
                        return false;
                    });
                    if (tokens[index + 1] !== ";") throw parseError("Elements that take arguments must have a semicolon directly after it.");

                }
            } else if (tokens[index + 1] !== ";") {
                elementArgumentStack.push([depth, lastTag]);
            }

            uncloseds.pop();
            if (tokens[index + 1] === ";") {
                if (gl(uncloseds) === null) {
                    dev.log("into ast ", lastTag);
                    ast.push(lastTag);
                } else {
                    dev.log("into something's ast", lastTag, [...uncloseds]);
                    gl(uncloseds).ast.push(lastTag);
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
            // Do you have something to do here?
        }
        else { // Others, just string
            const lastTag = gl(uncloseds);
            if (lastTag === null) {
                throw parseError("You may not put text in the top level.")
            }
            lastTag.ast.push({
                type: "text",
                content: token
            });
        }
        index++;
    }
    if (uncloseds.length !== 0) {
        throw parseError("There are unclosed brackets.\nDetail: " + JSON.stringify(uncloseds));
    }
    result.json.ast = ast;
    dev.log("AST: ", ast);


    return result;

    function resolveVariableTypes(type, value) {
        switch (type) {
            case "r": {
                /**
                 * @type {RuleVariable}
                 */
                let result = {};
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
        return rule.match(tokenizerRegex).flatMap(token => {
            if (spaceRegex.test(token)) return [];
            else return token.trim();
        }).flatMap(token => {
            if (attributeVariableRegex.test(token)) {
                const varName = token.slice(1, -1);
                const variable = definedVariables[varName];
                if (!variable) throw new SyntaxError("There is no variable named \"" + varName + "\". If your purpose of writing @ was not to express a variable, you can write &at; instead.");
                switch (variable.type) {
                    case "r":
                        return variable.value.tokens;
                    default:
                        return variable.value;
                }
            }
            return token;
        });
    }
}

function parseError(text) {
    return new ParseError(text);
}

/**
 * @param {string} str 
 * @param {string} f 
 * @param {string} l
 * 
 * @returns {boolean} 
 */
function flCompareSingle(str, f, l) {
    return (str[0] === f) && (str[str.length - 1] === l);
}

/**
 * @param {string} str 
 * @param {string} f 
 * @param {string} l
 * 
 * @returns {boolean} 
 */
function flCompare(str, f, l) {
    return str.startsWith(f) && str.endsWith(l);
}

/**
 * @param {string} str 
 * @param {string} sep 
 * 
 * @returns {string[]}
 */
function splitOnce(str, sep) {
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
function gl(array) {
    if (array.length === 0) return null;
    return array[array.length - 1];
}

/**
 * @param {any[]} arr 
 * @param {Function} callback 
 */
function forEachReverse(arr, callback) {
    for (let i = arr.length - 1; i >= 0; i--) {
        if (callback(arr[i], i, arr)) return;
    }
}

console.log(parse(RULE));
