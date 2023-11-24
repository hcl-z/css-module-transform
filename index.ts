import ts, { Expression, SyntaxKind } from 'typescript';

export function transformClassToCSSModule(sourceCode: string) {
    let newSourceCode = sourceCode;

    const sourceFile = ts.createSourceFile(
        '',
        sourceCode,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
    );

    function transformClass(className: string) {
        /**
         * 1. className="class1"
         * 2. className="class1 class2"
         * 3. className={'class1 class2'}
         * 4. className={`${[value1]}`}
         * 5. className={`${value1} class1`}
         * 6. className={isShow?'show':'hide'}
         */
        return `{style['${className}']}`;
    }

    function parseExpressionClass(className: Expression) {
        switch (className.kind) {
            case SyntaxKind.StringLiteral:
                return parseStringClass(className.getText())
            case SyntaxKind.ConditionalExpression:
                break;
            default:
                break;
        }
        console.log(className.kind)
    }

    function parseStringClass(className: string) {
        const classArr = className.trim().split(/\s+/)
        const classNameStr = classArr.map(classItem => {
            return `style[${classItem}]`
        }).join(' ')
        return `{${classNameStr}}`
    }

    function visit(node: ts.Node) {
        if (ts.isJsxAttribute(node) && (node.name.getText() === 'className' || node.name.getText() === 'class')) {
            if (!node.initializer) return
            if (ts.isJsxExpression(node.initializer)) {
                console.log(node.initializer.expression)
                node.initializer.expression && parseExpressionClass(node.initializer.expression)
            } else if (ts.isStringLiteral(node.initializer)) {
                console.log(node.initializer.text)
                return parseStringClass(node.initializer.text)
            }
            let content = node.initializer?.getText();
            console.log(ts.isJsxExpression(node.initializer!))
            // transformClass(content)
            // console.log(className)
            // const cssModuleClassName = `{style['${className}']}`;
            // newSourceCode = newSourceCode.replace(`"${className}"`, cssModuleClassName);

        }

        ts.forEachChild(node, visit);
    }

    ts.forEachChild(sourceFile, visit);
    return newSourceCode;
}

// 示例用的 TSX 代码
const tsxCode = `
import React from 'react';

const MyComponent = () => {
  return <div className={'class1 class2'}>Hello</div>;
};
`;

const transformedCode = transformClassToCSSModule(tsxCode);
console.log(transformedCode);