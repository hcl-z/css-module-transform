export interface Options {
    importName?: string;
    supportClassnames?: boolean;
    ignorePrefix?: (string | RegExp)[];
    exactMatch?: boolean;
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
/**
 * 1. className={style['class1']}
 * 2. className={classnames(style['class1'],style['class2'])}
 * 3. className={'class1 class2'}
 * 4. className={style[value1]}}
 * 5. className={classnames(style[value1],style['class1']}
 * 6. className={isShow?style['show']:style['hide']}
 * 7. className={test+'class'}
 */
export declare function transformCSSModuleToClass(sourceCode: string, options?: Options): string;
//# sourceMappingURL=index.d.ts.map