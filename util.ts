import ts from "typescript";

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // 转义特殊字符
}

export function ignorePrefixTest(
  str: string,
  ignorePrefix?: (string | RegExp)[],
  exactMatch?: boolean,
) {
  return (ignorePrefix || []).some((item) => {
    if (typeof item === 'string') {
      let formatStr = escapeRegExp(item);
      let newRegExp = exactMatch
        ? new RegExp(`^${formatStr}$`)
        : new RegExp(formatStr);
      return newRegExp.test(str.trim());
    } else if (item instanceof RegExp) {
      return item.test(str);
    } else {
      return false;
    }
  });
}

export function createJsxExpression(
  expression: ts.Expression
) {
  return ts.factory.createJsxExpression(
    undefined,
    ts.factory.createJsxExpression(undefined, expression),
  );
}