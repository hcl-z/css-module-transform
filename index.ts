import ts, {
  CallExpression,
  ConditionalExpression,
  ElementAccessExpression,
  Expression,
  JsxExpression,
  StringLiteral,
  SyntaxKind,
  TemplateSpan,
  isConditionalExpression,
  isElementAccessExpression,
  isIdentifier,
  isStringLiteral,
  isTemplateExpression,
  transpileModule,
} from 'typescript';
import { ignorePrefixTest } from './util';

export interface Options {
  importName?: string; // css module 文件的引用名
  supportClassnames?: boolean; // 三方库 classnames
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
export function transformClassToCSSModule(
  sourceCode: string,
  options?: Options,
) {
  // TODO options
  const {
    importName = 'style',
    exactMatch = true,
    supportClassnames = false,
    ignorePrefix,
  } = options || {};
  const sourceFile = ts.createSourceFile(
    '',
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  const printer = ts.createPrinter();
  const result = ts.transform(sourceFile, [transformer]);
  return printer.printFile(result.transformed[0] as any);

  function parseExpressionClass(className: Expression): ts.JsxExpression {
    switch (className.kind) {
      case SyntaxKind.StringLiteral:
      case SyntaxKind.NoSubstitutionTemplateLiteral:
        return parseStringClass(className.getText().slice(1, -1));
      case SyntaxKind.ConditionalExpression:
        return ts.factory.createJsxExpression(
          undefined,
          parseConditionExpression(className as ConditionalExpression),
        );
      case SyntaxKind.TemplateExpression:
        return parseTemplateExpression(className as ts.TemplateExpression);
      case SyntaxKind.CallExpression:
        return parseCallExpression(className as ts.CallExpression);
      default:
        return ts.factory.createJsxExpression(
          undefined,
          ts.factory.createStringLiteral(''),
        );
    }
  }

  function parseCallExpression(className: ts.CallExpression) {
    const args = className.arguments.map((arg) => {
      return parseExpressionClass(arg).expression!;
    });
    return ts.factory.createJsxExpression(
      undefined,
      ts.factory.createCallExpression(className.expression, undefined, args),
    );
  }

  function parseTemplateSpan(span: TemplateSpan) {
    switch (span.expression.kind) {
      case SyntaxKind.StringLiteral:
        return span.expression.getText().trim().split(/\s+/);
      case SyntaxKind.Identifier:
        return [createAccessExpression(span.expression.getText(), true)];
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

    templateExpression.templateSpans.forEach((span) => {
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

  function createAccessExpression(className: string, isVariable = false) {
    const stylesIdentifier = ts.factory.createIdentifier(importName);
    const classLiteral = isVariable
      ? ts.factory.createIdentifier(className)
      : ts.factory.createStringLiteral(className, true);
    const elementAccess = ts.factory.createElementAccessExpression(
      stylesIdentifier,
      classLiteral,
    );

    return elementAccess;
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
      whenTrue = createAccessExpression(expression.whenTrue.getText(), true);
    }
    if (isIdentifier(expression.whenFalse)) {
      whenFalse = createAccessExpression(expression.whenFalse.getText(), true);
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
          const variableAccess = `${importName}['${variable}']`;
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
        if (
          ts.isJsxAttribute(node) &&
          (node.name.getText() === 'className' ||
            node.name.getText() === 'class')
        ) {
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
}

/**
 * 1. className={style['class1']}
 * 2. className={classnames(style['class1'],style['class2'])}
 * 3. className={'class1 class2'}
 * 4. className={style[value1]}}
 * 5. className={classnames(style[value1],style['class1']}
 * 6. className={isShow?style['show']:style['hide']}
 */
export function transformCSSModuleToClass(
  sourceCode: string,
  options?: Options,
) {
  // TODO options
  const {
    importName = 'style',
    exactMatch = true,
    supportClassnames = false,
    ignorePrefix,
  } = options || {};

  const sourceFile = ts.createSourceFile(
    '',
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  const printer = ts.createPrinter();
  const result = ts.transform(sourceFile, [transformer]);
  return printer.printFile(result.transformed[0] as any);

  function parseExpressionClass(className: Expression) {
    switch (className.kind) {
      case SyntaxKind.ConditionalExpression:
        return ts.factory.createJsxExpression(
          undefined,
          parseConditionExpression(className as ConditionalExpression),
        );
      case SyntaxKind.TemplateExpression:
        return parseTemplateExpression(
          className as ts.TemplateExpression,
        ) as JsxExpression;
      case SyntaxKind.CallExpression:
        return parseCallExpression(className as ts.CallExpression);
      case SyntaxKind.ElementAccessExpression:
        let res = parseElementAccessExpression(
          className as ts.ElementAccessExpression,
        );
        return typeof res === 'string'
          ? res
          : ts.factory.createJsxExpression(undefined, res);
      default:
        return;
    }
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
        return parsed?.expression!;
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

    templateExpression.templateSpans.forEach((span) => {
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

  function transformer(context: ts.TransformationContext) {
    return (rootNode: ts.Node) => {
      function visit(node: ts.Node): ts.Node {
        if (
          ts.isJsxAttribute(node) &&
          (node.name.getText() === 'className' ||
            node.name.getText() === 'class')
        ) {
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
}
