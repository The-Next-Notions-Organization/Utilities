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
 *   inHtml: string?,
 *   args: number,
 *   selector: {(x: ATag) => boolean},
 *   toHtml: {(info: TohtmlInfo, args: *[]) => HTMLElement},
 *   isBlock: boolean
 * }} TagInfo
 * 
 * @typedef {{
 *   tagName: string,
 *   contents: (HTMLElement|string)[],
 *   attributes: Objecy.<string, *>,
 *   index: number?,
 *   isBlock: boolean
 * }} TohtmlInfo
 * 
 * @typedef {{
 *   type: string,
 *   name: string,
 *   attributes: Object.<string, *>,
 *   arguments: ATag[],
 *   argumentsLength: number,
 *   selector: {(x: *) => boolean},
 *   ast: ATag[]
 * }} ATag
 */
