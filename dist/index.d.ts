/// <reference path="../monaco-0.27.0.d.ts" />
declare type None = null | undefined;
declare type CompilerOptions = monaco.languages.typescript.CompilerOptions;
declare type ITextModel = monaco.editor.ITextModel;
declare type Uri = monaco.Uri;
export declare function initialize(base?: string | null, version?: `${number}.${number}.${number}` | null, local?: "" | "de" | "es" | "fr" | "it" | "ja" | "ko" | "ru" | "zh-cn" | "zh-tw"): Promise<void>;
export declare function setTsCompilerOptions(options: CompilerOptions): void;
export declare class Workspace implements Map<string, ITextModel> {
    _models: Map<string, monaco.editor.ITextModel>;
    get size(): number;
    clear(): void;
    delete(path: string | Uri): boolean;
    forEach(callback: (value: ITextModel, key: string, map: Map<string, ITextModel>) => void, thisArg?: any): void;
    get(path: string | Uri): ITextModel;
    has(path: string | Uri): boolean;
    set(path: string | Uri, model: string | ITextModel, lang?: None | string): this;
    entries(): IterableIterator<[string, monaco.editor.ITextModel]>;
    keys(): IterableIterator<string>;
    values(): IterableIterator<monaco.editor.ITextModel>;
    [Symbol.iterator](): IterableIterator<[string, monaco.editor.ITextModel]>;
    get [Symbol.toStringTag](): any;
}
export {};
//# sourceMappingURL=index.d.ts.map