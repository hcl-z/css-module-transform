import ts, { ConditionalExpression, Expression, JsxExpression, SyntaxKind, TemplateSpan, isConditionalExpression, isIdentifier, isStringLiteral } from 'typescript';

export interface Options {
    importName?: string; // css module 文件的引用名
    needClassnames?: boolean // 三方库 classnames
}
/**
 * 1. className="class1"
 * 2. className="class1 class2"
 * 3. className={'class1 class2'}
 * 4. className={`${value1}`}
 * 5. className={`${value1} class1`}
 * 6. className={isShow?'show':'hide'}
 */

export function transformClassToCSSModule(sourceCode: string, options?: Options) {
    // TODO options
    const { importName = 'style', needClassnames = false } = options || {};
    const sourceFile = ts.createSourceFile(
        '',
        sourceCode,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
    );


    const printer = ts.createPrinter();
    const result = ts.transform(sourceFile, [transformer]);
    return printer.printFile(result.transformed[0] as any);

    function parseExpressionClass(className: Expression) {
        switch (className.kind) {
            case SyntaxKind.StringLiteral:
            case SyntaxKind.NoSubstitutionTemplateLiteral:
                return parseStringClass(className.getText().slice(1, -1));
            case SyntaxKind.ConditionalExpression:
                return ts.factory.createJsxExpression(undefined, parseConditionExpression(className as ConditionalExpression))
            case SyntaxKind.TemplateExpression:
                return parseTemplateExpression(className as ts.TemplateExpression)
            default:
                break;
        }
    }

    function parseTemplateSpan(span: TemplateSpan) {
        switch (span.expression.kind) {
            case SyntaxKind.StringLiteral:
                return span.expression.getText().trim().split(/\s+/)
            case SyntaxKind.Identifier:
                return [createAccessExpression(span.expression.getText(), true)]
            case SyntaxKind.ConditionalExpression:
                return [parseConditionExpression(span.expression as ConditionalExpression)]
            default:
                return [span.expression];
        }
    }

    function parseTemplateExpression(templateExpression: ts.TemplateExpression) {
        let arr: (string | Expression)[] = []
        if (templateExpression.head.rawText) {
            arr.push(...templateExpression.head.rawText?.trim().split(/\s+/) || [])
        }

        templateExpression.templateSpans.forEach(span => {
            arr.push(...parseTemplateSpan(span))
            if (span.literal.rawText) {
                arr.push(...span.literal.rawText?.trim().split(/\s+/) || [])
            }
        })
        if (arr.length === 1 && typeof arr[0] !== 'string' && ts.isElementAccessExpression(arr[0])) {
            return ts.factory.createJsxExpression(undefined, arr[0])
        }
        return ts.factory.createJsxExpression(
            undefined, createTemplateString(arr))


    }

    function createAccessExpression(className: string, isVariable = false) {
        const stylesIdentifier = ts.factory.createIdentifier(importName);
        const classLiteral = isVariable ? ts.factory.createIdentifier(className) : ts.factory.createStringLiteral(className, true);
        const elementAccess = ts.factory.createElementAccessExpression(stylesIdentifier, classLiteral);

        return elementAccess;
    }


    function parseConditionExpression(expression: ConditionalExpression) {
        let whenTrue = expression.whenTrue;
        let whenFalse = expression.whenFalse;

        if (isConditionalExpression(expression.whenTrue)) {
            whenTrue = parseConditionExpression(expression.whenTrue)
        }

        if (isConditionalExpression(expression.whenFalse)) {
            whenFalse = parseConditionExpression(expression.whenFalse)
        }


        if (isStringLiteral(expression.whenTrue)) {
            const exp = parseStringClass(expression.whenTrue.getText().slice(1, -1))
            whenTrue = exp.expression || expression.whenTrue
        }

        if (isStringLiteral(expression.whenFalse)) {
            const exp = parseStringClass(expression.whenFalse.getText().slice(1, -1))
            whenFalse = exp.expression || expression.whenFalse
        }

        if (isIdentifier(expression.whenTrue)) {
            whenTrue = createAccessExpression(expression.whenTrue.getText(), true)

        }
        if (isIdentifier(expression.whenFalse)) {
            whenFalse = createAccessExpression(expression.whenFalse.getText(), true)
        }


        return ts.factory.createConditionalExpression(
            expression.condition,
            ts.factory.createToken(ts.SyntaxKind.QuestionToken),
            whenTrue,
            ts.factory.createToken(ts.SyntaxKind.ColonToken),
            whenFalse
        )
    }


    function createTemplateString(variableNames: (string | Expression)[]) {
        // 创建模板头部
        const templateHead = ts.factory.createTemplateHead('');

        // 创建所有模板跨度
        const spans = variableNames.map((item, index) => {
            let expression: ts.Expression;
            if (typeof item === 'string') {
                const variable = `${importName}['${item}']`
                expression = ts.factory.createIdentifier(variable);
            } else {
                expression = item as Expression
            }

            if (index === variableNames.length - 1) {
                // 对于最后一个变量，创建模板尾部
                const templateTail = ts.factory.createTemplateTail('');
                return ts.factory.createTemplateSpan(expression, templateTail);
            } else {
                // 对于中间变量，创建模板中间部分
                const templateMiddle = ts.factory.createTemplateMiddle(' ');
                return ts.factory.createTemplateSpan(expression, templateMiddle);
            }
        });
        // 创建模板表达式
        const templateExpression = ts.factory.createTemplateExpression(templateHead, spans);

        // 返回完整的模板字符串
        return templateExpression;
    }


    function parseStringClass(className: string) {
        const classArr = className.trim().split(/\s+/)

        if (classArr.length === 1) {
            return ts.factory.createJsxExpression(
                undefined, createAccessExpression(className))
        }
        const templateString = createTemplateString(classArr);
        return ts.factory.createJsxExpression(
            undefined, templateString)
    }



    function transformer(context: ts.TransformationContext) {
        return (rootNode: ts.Node) => {
            function visit(node: ts.Node): ts.Node {
                if (ts.isJsxAttribute(node) && (node.name.getText() === 'className' || node.name.getText() === 'class')) {
                    if (!node.initializer) return node;

                    let transform: JsxExpression | undefined;
                    if (ts.isJsxExpression(node.initializer)) {
                        transform = parseExpressionClass(node.initializer.expression!);
                    } else if (ts.isStringLiteral(node.initializer)) {
                        transform = parseStringClass(node.initializer.text);
                    } else {
                        return node;
                    }

                    if (transform) {
                        return context.factory.updateJsxAttribute(
                            node,
                            node.name,
                            transform as unknown as JsxExpression
                        );
                    }
                }
                return ts.visitEachChild(node, visit, context);
            }
            return ts.visitNode(rootNode, visit);
        }
    }

}
