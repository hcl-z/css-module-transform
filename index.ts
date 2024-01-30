import ts, {
  CallExpression,
  ConditionalExpression,
  ElementAccessExpression,
  Expression,
  Identifier,
  JsxExpression,
  PropertyAccessExpression,
  SyntaxKind,
  TemplateSpan,
  isConditionalExpression,
  isElementAccessExpression,
  isIdentifier,
  isPropertyAccessExpression,
  isStringLiteral,
  isTemplateExpression,
} from 'typescript';
import { ignorePrefixTest } from './util';

export interface Options {
  importName?: string; // css module 文件的引用名
  supportClassnames?: boolean; // 三方库 classnames
  ignorePrefix?: (string | RegExp)[];
  exactMatch?: boolean;
  onlyClassName?: boolean;
}

/**
 * 1. className="class1"
 * 2. className="class1 class2"
 * 3. className={'class1 class2'}
 * 4. className={`${value1}`}
 * 5. className={`${value1} class1`}
 * 6. className={isShow?'show':'hide'}
 */

const jsRegExp = new RegExp(/[a-zA-Z0-9_$]+-[a-zA-Z0-9_$]+/);
export function transformClassToCSSModule(
  sourceCode: string,
  options?: Options,
) {
  const {
    importName = 'style',
    exactMatch = true,
    supportClassnames = false,
    ignorePrefix,
    onlyClassName,
  } = options || {};

  let source = sourceCode;

  if (onlyClassName) {
    source = `<div className=${sourceCode}></div>`;
  }

  if (!source) {
    return;
  }

  const sourceFile = ts.createSourceFile(
    '',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  function parseExpressionClass(className: Expression): ts.JsxExpression {
    switch (className.kind) {
      case SyntaxKind.StringLiteral:
      case SyntaxKind.NoSubstitutionTemplateLiteral:
        return parseStringClass(className.getText().slice(1, -1));
      case SyntaxKind.Identifier:
        return parseIdentifierClass(className as Identifier);
      case SyntaxKind.ConditionalExpression:
        return ts.factory.createJsxExpression(
          undefined,
          parseConditionExpression(className as ConditionalExpression),
        );
      case SyntaxKind.TemplateExpression:
        return parseTemplateExpression(className as ts.TemplateExpression);
      case SyntaxKind.CallExpression:
        return parseCallExpression(className as ts.CallExpression);
      case SyntaxKind.BinaryExpression:
        return parseBinaryExpression(className as ts.BinaryExpression);
      case SyntaxKind.PropertyAccessExpression:
        return parsePropertyAccessExpression(
          className as ts.PropertyAccessExpression,
        );
      default:
        return ts.factory.createJsxExpression(undefined, className);
    }
  }

  function parsePropertyAccessExpression(
    propertyAccessExpression: ts.PropertyAccessExpression,
  ) {
    if (propertyAccessExpression.expression.getText() === importName) {
      return ts.factory.createJsxExpression(
        undefined,
        propertyAccessExpression,
      );
    } else {
      return ts.factory.createJsxExpression(
        undefined,
        createAccessExpression(propertyAccessExpression),
      );
    }
  }

  function parseIdentifierClass(identifier: ts.Identifier) {
    return ts.factory.createJsxExpression(
      undefined,
      createAccessExpression(identifier),
    );
  }

  function parseBinaryExpression(binaryExpression: ts.BinaryExpression) {
    return ts.factory.createJsxExpression(
      undefined,
      createAccessExpression(binaryExpression),
    );
  }
  function parseCallExpression(className: ts.CallExpression) {
    // const args = className.arguments.map((arg) => {
    //   return parseExpressionClass(arg).expression!;
    // });
    return ts.factory.createJsxExpression(
      undefined,
      createAccessExpression(className),
    );
  }

  function parseTemplateSpan(span: TemplateSpan) {
    switch (span.expression.kind) {
      case SyntaxKind.StringLiteral:
        return span.expression.getText().trim().split(/\s+/);
      case SyntaxKind.Identifier:
        return [
          createAccessExpression(
            ts.factory.createIdentifier(span.expression.getText()),
          ),
        ];
      case SyntaxKind.ConditionalExpression:
        return [
          parseConditionExpression(span.expression as ConditionalExpression),
        ];
      default:
        return [span.expression];
    }
  }

  function parseTemplateExpression(templateExpression: ts.TemplateExpression) {
    let arr: (string | Expression)[] = [];
    if (
      templateExpression.head.rawText &&
      !ignorePrefixTest(
        templateExpression.head.rawText,
        ignorePrefix,
        exactMatch,
      )
    ) {
      arr.push(...(templateExpression.head.rawText?.trim().split(/\s+/) || []));
    }

    templateExpression.templateSpans.forEach((span: TemplateSpan) => {
      arr.push(...parseTemplateSpan(span));
      if (
        span.literal.rawText &&
        !ignorePrefixTest(span.literal.rawText, ignorePrefix, exactMatch)
      ) {
        arr.push(...(span.literal.rawText?.trim().split(/\s+/) || []));
      }
    });
    if (
      arr.length === 1 &&
      typeof arr[0] !== 'string' &&
      ts.isElementAccessExpression(arr[0])
    ) {
      return ts.factory.createJsxExpression(undefined, arr[0]);
    }
    return ts.factory.createJsxExpression(
      undefined,
      supportClassnames
        ? createFunctionExpression(arr)
        : createTemplateString(arr),
    );
  }

  function createAccessExpression(className: string | ts.Expression) {
    const stylesIdentifier = ts.factory.createIdentifier(importName);
    // className用横线连接的也返回style[className]

    if (typeof className === 'string' && !jsRegExp.test(className)) {
      // create style.className
      return ts.factory.createPropertyAccessExpression(
        stylesIdentifier,
        className,
      );
    } else {
      // create style[className]
      const classNameExpression =
        typeof className === 'string'
          ? ts.factory.createStringLiteral(className, true)
          : className;
      return ts.factory.createElementAccessExpression(
        stylesIdentifier,
        classNameExpression,
      );
    }
  }

  function parseConditionExpression(expression: ConditionalExpression) {
    let whenTrue = expression.whenTrue;
    let whenFalse = expression.whenFalse;

    if (isConditionalExpression(expression.whenTrue)) {
      whenTrue = parseConditionExpression(expression.whenTrue);
    }

    if (isConditionalExpression(expression.whenFalse)) {
      whenFalse = parseConditionExpression(expression.whenFalse);
    }

    if (isStringLiteral(expression.whenTrue)) {
      const exp = parseStringClass(expression.whenTrue.getText().slice(1, -1));
      whenTrue = exp.expression || expression.whenTrue;
    }

    if (isStringLiteral(expression.whenFalse)) {
      const exp = parseStringClass(expression.whenFalse.getText().slice(1, -1));
      whenFalse = exp.expression || expression.whenFalse;
    }

    if (isIdentifier(expression.whenTrue)) {
      whenTrue = createAccessExpression(
        ts.factory.createIdentifier(expression.whenTrue.getText()),
      );
    }
    if (isIdentifier(expression.whenFalse)) {
      whenFalse = createAccessExpression(
        ts.factory.createIdentifier(expression.whenFalse.getText()),
      );
    }

    return ts.factory.createConditionalExpression(
      expression.condition,
      ts.factory.createToken(ts.SyntaxKind.QuestionToken),
      whenTrue,
      ts.factory.createToken(ts.SyntaxKind.ColonToken),
      whenFalse,
    );
  }

  function createFunctionExpression(variableNames: (string | Expression)[]) {
    const spans = variableNames.map((item, index) => {
      let expression: ts.Expression;
      if (
        typeof item === 'string' &&
        !ignorePrefixTest(item, ignorePrefix, exactMatch)
      ) {
        const variable = `${importName}['${item}']`;
        expression = ts.factory.createIdentifier(variable);
      } else {
        expression = item as Expression;
      }
      return expression;
    });
    const funcIdentifer = ts.factory.createIdentifier('classname');
    return ts.factory.createCallExpression(funcIdentifer, undefined, spans);
  }

  function createTemplateString(variableNames: (string | Expression)[]) {
    // 创建模板头部
    let templateHead = ts.factory.createTemplateHead('');
    // 创建所有模板跨度
    let spans: any[] = [];
    variableNames.forEach((variable, index) => {
      let expression: ts.Expression;
      let templateChunk: ts.TemplateMiddle | ts.TemplateTail;

      if (typeof variable === 'string') {
        if (ignorePrefixTest(variable, ignorePrefix, exactMatch)) {
          // 如果是第一个元素，创建模板头部，否则创建模板中间部分
          if (index === 0) {
            templateHead = ts.factory.createTemplateHead(variable + ' ');
          } else {
            // templateChunk = ts.factory.createTemplateMiddle(variable + ' ');
          }
        } else {
          const variableAccess = jsRegExp.test(variable)
            ? `${importName}['${variable}']`
            : `${importName}.${variable}`;
          expression = ts.factory.createIdentifier(variableAccess);

          // 根据位置创建模板中间部分或尾部
          if (index === variableNames.length - 1) {
            // 对于最后一个变量，创建模板尾部
            templateChunk = ts.factory.createTemplateTail('');
          } else {
            // 对于中间变量，后面跟一个空格
            templateChunk = ts.factory.createTemplateMiddle(' ');
          }

          // 创建模板跨度
          const span = ts.factory.createTemplateSpan(expression, templateChunk);
          spans.push(span);
        }
      } else {
        // 如果已经是表达式，直接使用
        expression = variable;

        // 根据位置创建模板中间部分或尾部
        if (index === variableNames.length - 1) {
          // 对于最后一个变量，创建模板尾部
          templateChunk = ts.factory.createTemplateTail('');
        } else {
          // 对于中间变量，后面跟一个空格
          templateChunk = ts.factory.createTemplateMiddle(' ');
        }

        // 创建模板跨度
        const span = ts.factory.createTemplateSpan(expression, templateChunk);
        spans.push(span);
      }
    });

    // 确保 templateHead 已经定义
    if (!templateHead) {
      templateHead = ts.factory.createTemplateHead('');
    }

    // 创建模板表达式
    const templateExpression = ts.factory.createTemplateExpression(
      templateHead,
      spans,
    );

    // 返回完整的模板字符串表达式
    return templateExpression;
  }

  function parseStringClass(className: string) {
    if (className.trim() === '') {
      return ts.factory.createJsxExpression(
        undefined,
        ts.factory.createStringLiteral(className, true),
      );
    }
    const classArr = className.trim().split(/\s+/);

    if (classArr.length === 1) {
      if (ignorePrefixTest(classArr[0], ignorePrefix, exactMatch)) {
        return ts.factory.createJsxExpression(
          undefined,
          ts.factory.createStringLiteral(classArr[0], true),
        );
      } else {
        return ts.factory.createJsxExpression(
          undefined,
          createAccessExpression(className),
        );
      }
    }
    const expression = supportClassnames
      ? createFunctionExpression(classArr)
      : createTemplateString(classArr);
    return ts.factory.createJsxExpression(undefined, expression);
  }

  function transformer(context: ts.TransformationContext) {
    return (rootNode: ts.Node) => {
      function visit(node: ts.Node): ts.Node {
        if (ts.isJsxAttribute(node) && node.name.getText() === 'className') {
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
              transform,
            );
          }
        }
        return ts.visitEachChild(node, visit, context);
      }
      return ts.visitNode(rootNode, visit);
    };
  }

  function extractClassNames(sourceFile: ts.SourceFile) {
    let classNames = sourceCode;

    function visit(node: ts.Node) {
      if (ts.isJsxAttribute(node) && node.name.getText() === 'className') {
        if (!node.initializer) {
          return;
        }

        let expression;

        if (ts.isJsxExpression(node.initializer)) {
          expression = parseExpressionClass(node.initializer.expression!);
        } else if (ts.isStringLiteral(node.initializer)) {
          expression = parseStringClass(node.initializer.text);
        } else {
          expression = node.initializer;
        }

        if (typeof expression === 'string') {
          classNames = expression;
        } else {
          const printer = ts.createPrinter({
            newLine: ts.NewLineKind.LineFeed,
          });
          // 将新的 Expression 节点转换为源码字符串
          const newExpressionText = printer.printNode(
            ts.EmitHint.Unspecified,
            expression,
            sourceFile,
          );
          classNames = newExpressionText;
        }
        // Continue visiting any child nodes
      }
      node.forEachChild(visit);
    }

    visit(sourceFile);
    return classNames;
  }

  if (onlyClassName) {
    return extractClassNames(sourceFile);
  } else {
    const printer = ts.createPrinter();
    const result = ts.transform(sourceFile, [transformer]);
    return printer.printFile(result.transformed[0] as any);
  }
}

/**
 * 1. className={style['class1']}
 * 2. className={classnames(style['class1'],style['class2'])}
 * 3. className={'class1 class2'}
 * 4. className={style[value1]}}
 * 5. className={classnames(style[value1],style['class1']}
 * 6. className={isShow?style['show']:style['hide']}
 * 7. className={test+'class'}
 */
export function transformCSSModuleToClass(
  sourceCode?: string,
  options?: Options,
) {
  const {
    importName = 'style',
    exactMatch = true,
    supportClassnames = false,
    ignorePrefix,
    onlyClassName,
  } = options || {};

  let source = sourceCode;

  if (onlyClassName) {
    source = `<div className=${sourceCode}></div>`;
  }

  if (!source) {
    return;
  }

  function parseExpressionClass(className: Expression) {
    let res;
    switch (className.kind) {
      case SyntaxKind.ConditionalExpression:
        res = ts.factory.createJsxExpression(
          undefined,
          parseConditionExpression(className as ConditionalExpression),
        );
        break;
      case SyntaxKind.TemplateExpression:
        res = parseTemplateExpression(
          className as ts.TemplateExpression,
        ) as JsxExpression;
        break;
      case SyntaxKind.CallExpression:
        res = parseCallExpression(className as ts.CallExpression);
        break;
      case SyntaxKind.ElementAccessExpression:
        res = parseElementAccessExpression(
          className as ts.ElementAccessExpression,
        );
        break;
      case SyntaxKind.PropertyAccessExpression:
        res = parsePropertyAccessExpression(
          className as ts.PropertyAccessExpression,
        );
        break;
      // case SyntaxKind.BinaryExpression:
      default:
        return className;
    }

    return typeof res === 'string' || ts.isJsxExpression(res)
      ? res
      : ts.factory.createJsxExpression(undefined, res);
  }

  function parsePropertyAccessExpression(className: PropertyAccessExpression) {
    if (className.expression.getText() !== importName) {
      return className;
    }
    return className.name.text;
  }

  function parseElementAccessExpression(
    node: ts.ElementAccessExpression,
    needExpression = false,
  ) {
    const argumentExpression = node.argumentExpression;
    const expression = node.expression;
    // 确定是CSS模块的写法
    if (expression.getText().trim() === importName) {
      if (ts.isStringLiteral(argumentExpression)) {
        return needExpression
          ? ts.factory.createStringLiteral(argumentExpression.text, true)
          : argumentExpression.text;
      } else {
        return argumentExpression;
      }
    } else {
      return node;
    }
  }

  function parseCallExpression(className: CallExpression) {
    const res: Expression[] = className.arguments.map((item) => {
      const parsed = parseExpressionClass(item);
      if (typeof parsed === 'string') {
        return ts.factory.createStringLiteral(parsed, true);
      } else {
        return (parsed as any)?.expression;
      }
    });

    return ts.factory.createJsxExpression(
      undefined,
      ts.factory.createCallExpression(className.expression, undefined, res),
    );
  }

  function parseTemplateSpan(span: TemplateSpan) {
    switch (span.expression.kind) {
      case SyntaxKind.ElementAccessExpression:
        return parseElementAccessExpression(
          span.expression as ElementAccessExpression,
        );
      case SyntaxKind.ConditionalExpression:
        return parseConditionExpression(
          span.expression as ConditionalExpression,
        );
      case SyntaxKind.PropertyAccessExpression:
        return parsePropertyAccessExpression(
          span.expression as PropertyAccessExpression,
        );
      default:
        return span.expression;
    }
  }

  function parseTemplateExpression(
    templateExpression: ts.TemplateExpression,
    needExpression = false,
  ) {
    let arr: (string | Expression)[] = [];
    if (!!templateExpression.head.rawText?.trim()) {
      arr.push(...(templateExpression.head.rawText?.trim().split(/\s+/) || []));
    }

    templateExpression.templateSpans.forEach((span: TemplateSpan) => {
      let parsed = parseTemplateSpan(span);
      parsed && arr.push(parsed);
      if (!!span.literal.rawText?.trim()) {
        arr.push(...(span.literal.rawText?.trim().split(/\s+/) || []));
      }
    });

    if (arr.every((item) => typeof item === 'string')) {
      return needExpression
        ? ts.factory.createStringLiteral(arr.join(' '), true)
        : arr.join(' ');
    }
    if (needExpression) {
      return supportClassnames
        ? createFunctionExpression(arr)
        : createTemplateString(arr);
    }

    return ts.factory.createJsxExpression(
      undefined,
      supportClassnames
        ? createFunctionExpression(arr)
        : createTemplateString(arr),
    );
  }

  function parseConditionExpression(expression: ConditionalExpression) {
    let whenTrue = expression.whenTrue;
    let whenFalse = expression.whenFalse;

    if (isConditionalExpression(expression.whenTrue)) {
      whenTrue = parseConditionExpression(expression.whenTrue);
    }

    if (isConditionalExpression(expression.whenFalse)) {
      whenFalse = parseConditionExpression(expression.whenFalse);
    }

    if (isTemplateExpression(expression.whenTrue)) {
      whenTrue = parseTemplateExpression(
        expression.whenTrue,
        true,
      ) as Expression;
    }

    if (isTemplateExpression(expression.whenFalse)) {
      whenFalse = parseTemplateExpression(
        expression.whenFalse,
        true,
      ) as Expression;
    }
    if (isElementAccessExpression(expression.whenTrue)) {
      whenTrue = parseElementAccessExpression(
        expression.whenTrue,
        true,
      ) as Expression;
    }
    if (isElementAccessExpression(expression.whenFalse)) {
      whenFalse = parseElementAccessExpression(
        expression.whenFalse,
        true,
      ) as Expression;
    }

    if (isPropertyAccessExpression(expression.whenTrue)) {
      const property = parsePropertyAccessExpression(expression.whenTrue);
      whenTrue =
        typeof property === 'string'
          ? ts.factory.createStringLiteral(property, true)
          : property;
    }

    if (isPropertyAccessExpression(expression.whenFalse)) {
      const property = parsePropertyAccessExpression(expression.whenFalse);
      whenFalse =
        typeof property === 'string'
          ? ts.factory.createStringLiteral(property, true)
          : property;
    }
    return ts.factory.createConditionalExpression(
      expression.condition,
      ts.factory.createToken(ts.SyntaxKind.QuestionToken),
      whenTrue,
      ts.factory.createToken(ts.SyntaxKind.ColonToken),
      whenFalse,
    );
  }

  // return classname('class1','class2')
  function createFunctionExpression(variableNames: (string | Expression)[]) {
    const spans = variableNames.map((item, index) => {
      let expression: ts.Expression;
      if (typeof item === 'string') {
        expression = ts.factory.createStringLiteral(item);
      } else {
        expression = item as Expression;
      }
      return expression;
    });
    const funcIdentifer = ts.factory.createIdentifier('classname');
    return ts.factory.createCallExpression(funcIdentifer, undefined, spans);
  }

  function createTemplateString(
    elements: Array<string | ts.Expression>,
  ): ts.TemplateLiteral {
    // 如果第一个元素是字符串，则创建头部模板文字，否则创建空字符串头部模板文字并将表达式添加为第一个跨度
    let headArr: string[] = [];
    let curExp: Expression | null = null;
    let head: ts.TemplateHead | null = null;
    const spans: ts.TemplateSpan[] = [];
    elements.forEach((element, index) => {
      const isLast = index === elements.length - 1;

      const literal = isLast
        ? ts.factory.createTemplateTail('')
        : ts.factory.createTemplateMiddle(headArr.join(' '));

      if (typeof element === 'string') {
        headArr.push(element);
      } else {
        if (curExp) {
          spans.push(ts.factory.createTemplateSpan(curExp, literal));
          return;
        }

        if (!head) {
          head = ts.factory.createTemplateHead(headArr.join(' '));
        }
        headArr = [];
        curExp = element;
      }
    });

    if (!head) {
      head = ts.factory.createTemplateHead(headArr.join(' '));
    }

    if (curExp) {
      spans.push(
        ts.factory.createTemplateSpan(
          curExp,
          ts.factory.createTemplateTail(
            headArr.length === 0 ? '' : ' ' + headArr.join(' '),
          ),
        ),
      );
    }
    return ts.factory.createTemplateExpression(head, spans);
  }

  function extractClassNames(sourceFile: ts.SourceFile) {
    let classNames = sourceCode;
    function visit(node: ts.Node) {
      if (ts.isJsxAttribute(node) && node.name.getText() === 'className') {
        if (!node.initializer) {
          return;
        }
        if (ts.isJsxExpression(node.initializer)) {
          const expression = parseExpressionClass(node.initializer.expression!);
          if (typeof expression === 'string') {
            classNames = expression;
          } else {
            const printer = ts.createPrinter({
              newLine: ts.NewLineKind.LineFeed,
            });
            // 将新的 Expression 节点转换为源码字符串
            const newExpressionText = printer.printNode(
              ts.EmitHint.Unspecified,
              expression,
              sourceFile,
            );
            classNames = newExpressionText;
          }
        }
      }
      node.forEachChild(visit);
    }

    visit(sourceFile);
    return classNames;
  }

  function transformer(context: ts.TransformationContext) {
    return (rootNode: ts.Node) => {
      function visit(node: ts.Node): ts.Node {
        if (ts.isJsxAttribute(node) && node.name.getText() === 'className') {
          if (!node.initializer) return node;
          let transform: any;
          if (ts.isJsxExpression(node.initializer)) {
            transform = parseExpressionClass(node.initializer.expression!);
          } else {
            return node;
          }

          if (transform) {
            return context.factory.updateJsxAttribute(
              node,
              node.name,
              typeof transform === 'string'
                ? ts.factory.createStringLiteral(transform, true)
                : transform,
            );
          }
        }
        return ts.visitEachChild(node, visit, context);
      }
      return ts.visitNode(rootNode, visit);
    };
  }

  const sourceFile = ts.createSourceFile(
    '',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  if (onlyClassName) {
    return extractClassNames(sourceFile);
  } else {
    const printer = ts.createPrinter();
    const result = ts.transform(sourceFile, [transformer]);
    return printer.printFile(result.transformed[0] as any);
  }
}

// Test code
const testCode =
  "{`class1 ${condition ? `nested-${nestedCondition ? 'true' : 'false'}` : ''}`}";
const res = transformClassToCSSModule(testCode, {
  onlyClassName: true,
});
console.log(res);
