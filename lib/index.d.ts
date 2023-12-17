export interface Options {
    importName?: string;
    needClassnames?: boolean;
}
/**
 * 1. className="class1"
 * 2. className="class1 class2"
 * 3. className={'class1 class2'}
 * 4. className={`${value1}`}
 * 5. className={`${value1} class1`}
 * 6. className={isShow?'show':'hide'}
 */
export declare function transformClassToCSSModule(sourceCode: string, options?: Options): string;
//# sourceMappingURL=index.d.ts.map