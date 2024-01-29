"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformCSSModuleToClass = exports.transformClassToCSSModule = void 0;
var typescript_1 = __importStar(require("typescript"));
var util_1 = require("./util");
/**
 * 1. className="class1"
 * 2. className="class1 class2"
 * 3. className={'class1 class2'}
 * 4. className={`${value1}`}
 * 5. className={`${value1} class1`}
 * 6. className={isShow?'show':'hide'}
 */
function transformClassToCSSModule(sourceCode, options) {
    // TODO options
    var _a = options || {}, _b = _a.importName, importName = _b === void 0 ? 'style' : _b, _c = _a.exactMatch, exactMatch = _c === void 0 ? true : _c, _d = _a.supportClassnames, supportClassnames = _d === void 0 ? false : _d, ignorePrefix = _a.ignorePrefix, onlyClassName = _a.onlyClassName;
    var source = sourceCode;
    if (onlyClassName) {
        source = "<div className=".concat(sourceCode, "></div>");
    }
    if (!source) {
        return;
    }
    var sourceFile = typescript_1.default.createSourceFile('', source, typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TSX);
    function parseExpressionClass(className) {
        switch (className.kind) {
            case typescript_1.SyntaxKind.StringLiteral:
            case typescript_1.SyntaxKind.NoSubstitutionTemplateLiteral:
                return parseStringClass(className.getText().slice(1, -1));
            case typescript_1.SyntaxKind.Identifier:
                return parseIdentifierClass(className);
            case typescript_1.SyntaxKind.ConditionalExpression:
                return typescript_1.default.factory.createJsxExpression(undefined, parseConditionExpression(className));
            case typescript_1.SyntaxKind.TemplateExpression:
                return parseTemplateExpression(className);
            case typescript_1.SyntaxKind.CallExpression:
                return parseCallExpression(className);
            case typescript_1.SyntaxKind.BinaryExpression:
                return parseBinaryExpression(className);
            case typescript_1.SyntaxKind.PropertyAccessExpression:
                return parsePropertyAccessExpression(className);
            default:
                return typescript_1.default.factory.createJsxExpression(undefined, typescript_1.default.factory.createStringLiteral(''));
        }
    }
    function parsePropertyAccessExpression(propertyAccessExpression) {
        if (propertyAccessExpression.expression.getText() === importName) {
            return typescript_1.default.factory.createJsxExpression(undefined, propertyAccessExpression);
        }
        else {
            return typescript_1.default.factory.createJsxExpression(undefined, createAccessExpression(propertyAccessExpression));
        }
    }
    function parseIdentifierClass(identifier) {
        return typescript_1.default.factory.createJsxExpression(undefined, createAccessExpression(identifier));
    }
    function parseBinaryExpression(binaryExpression) {
        return typescript_1.default.factory.createJsxExpression(undefined, createAccessExpression(binaryExpression));
    }
    function parseCallExpression(className) {
        var args = className.arguments.map(function (arg) {
            return parseExpressionClass(arg).expression;
        });
        return typescript_1.default.factory.createJsxExpression(undefined, typescript_1.default.factory.createCallExpression(className.expression, undefined, args));
    }
    function parseTemplateSpan(span) {
        switch (span.expression.kind) {
            case typescript_1.SyntaxKind.StringLiteral:
                return span.expression.getText().trim().split(/\s+/);
            case typescript_1.SyntaxKind.Identifier:
                return [createAccessExpression(typescript_1.default.factory.createIdentifier(span.expression.getText()))];
            case typescript_1.SyntaxKind.ConditionalExpression:
                return [
                    parseConditionExpression(span.expression),
                ];
            default:
                return [span.expression];
        }
    }
    function parseTemplateExpression(templateExpression) {
        var _a;
        var arr = [];
        if (templateExpression.head.rawText &&
            !(0, util_1.ignorePrefixTest)(templateExpression.head.rawText, ignorePrefix, exactMatch)) {
            arr.push.apply(arr, (((_a = templateExpression.head.rawText) === null || _a === void 0 ? void 0 : _a.trim().split(/\s+/)) || []));
        }
        templateExpression.templateSpans.forEach(function (span) {
            var _a;
            arr.push.apply(arr, parseTemplateSpan(span));
            if (span.literal.rawText &&
                !(0, util_1.ignorePrefixTest)(span.literal.rawText, ignorePrefix, exactMatch)) {
                arr.push.apply(arr, (((_a = span.literal.rawText) === null || _a === void 0 ? void 0 : _a.trim().split(/\s+/)) || []));
            }
        });
        if (arr.length === 1 &&
            typeof arr[0] !== 'string' &&
            typescript_1.default.isElementAccessExpression(arr[0])) {
            return typescript_1.default.factory.createJsxExpression(undefined, arr[0]);
        }
        return typescript_1.default.factory.createJsxExpression(undefined, supportClassnames
            ? createFunctionExpression(arr)
            : createTemplateString(arr));
    }
    function createAccessExpression(className) {
        var stylesIdentifier = typescript_1.default.factory.createIdentifier(importName);
        // className用横线连接的也返回style[className]
        var jsRegExp = new RegExp(/[a-zA-Z_$]+-[a-zA-Z0-9_$]+/);
        if (typeof className === 'string' && jsRegExp.test(className)) {
            // create style.className
            return typescript_1.default.factory.createPropertyAccessExpression(stylesIdentifier, className);
        }
        else {
            // create style[className]
            var classNameExpression = typeof className === 'string' ? typescript_1.default.factory.createStringLiteral(className) : className;
            return typescript_1.default.factory.createElementAccessExpression(stylesIdentifier, classNameExpression);
        }
    }
    function parseConditionExpression(expression) {
        var whenTrue = expression.whenTrue;
        var whenFalse = expression.whenFalse;
        if ((0, typescript_1.isConditionalExpression)(expression.whenTrue)) {
            whenTrue = parseConditionExpression(expression.whenTrue);
        }
        if ((0, typescript_1.isConditionalExpression)(expression.whenFalse)) {
            whenFalse = parseConditionExpression(expression.whenFalse);
        }
        if ((0, typescript_1.isStringLiteral)(expression.whenTrue)) {
            var exp = parseStringClass(expression.whenTrue.getText().slice(1, -1));
            whenTrue = exp.expression || expression.whenTrue;
        }
        if ((0, typescript_1.isStringLiteral)(expression.whenFalse)) {
            var exp = parseStringClass(expression.whenFalse.getText().slice(1, -1));
            whenFalse = exp.expression || expression.whenFalse;
        }
        if ((0, typescript_1.isIdentifier)(expression.whenTrue)) {
            whenTrue = createAccessExpression(typescript_1.default.factory.createIdentifier(expression.whenTrue.getText()));
        }
        if ((0, typescript_1.isIdentifier)(expression.whenFalse)) {
            whenFalse = createAccessExpression(typescript_1.default.factory.createIdentifier((expression.whenFalse.getText())));
        }
        return typescript_1.default.factory.createConditionalExpression(expression.condition, typescript_1.default.factory.createToken(typescript_1.default.SyntaxKind.QuestionToken), whenTrue, typescript_1.default.factory.createToken(typescript_1.default.SyntaxKind.ColonToken), whenFalse);
    }
    function createFunctionExpression(variableNames) {
        var spans = variableNames.map(function (item, index) {
            var expression;
            if (typeof item === 'string' &&
                !(0, util_1.ignorePrefixTest)(item, ignorePrefix, exactMatch)) {
                var variable = "".concat(importName, "['").concat(item, "']");
                expression = typescript_1.default.factory.createIdentifier(variable);
            }
            else {
                expression = item;
            }
            return expression;
        });
        var funcIdentifer = typescript_1.default.factory.createIdentifier('classname');
        return typescript_1.default.factory.createCallExpression(funcIdentifer, undefined, spans);
    }
    function createTemplateString(variableNames) {
        // 创建模板头部
        var templateHead = typescript_1.default.factory.createTemplateHead('');
        // 创建所有模板跨度
        var spans = [];
        variableNames.forEach(function (variable, index) {
            var expression;
            var templateChunk;
            if (typeof variable === 'string') {
                if ((0, util_1.ignorePrefixTest)(variable, ignorePrefix, exactMatch)) {
                    // 如果是第一个元素，创建模板头部，否则创建模板中间部分
                    if (index === 0) {
                        templateHead = typescript_1.default.factory.createTemplateHead(variable + ' ');
                    }
                    else {
                        // templateChunk = ts.factory.createTemplateMiddle(variable + ' ');
                    }
                }
                else {
                    var variableAccess = "".concat(importName, "['").concat(variable, "']");
                    expression = typescript_1.default.factory.createIdentifier(variableAccess);
                    // 根据位置创建模板中间部分或尾部
                    if (index === variableNames.length - 1) {
                        // 对于最后一个变量，创建模板尾部
                        templateChunk = typescript_1.default.factory.createTemplateTail('');
                    }
                    else {
                        // 对于中间变量，后面跟一个空格
                        templateChunk = typescript_1.default.factory.createTemplateMiddle(' ');
                    }
                    // 创建模板跨度
                    var span = typescript_1.default.factory.createTemplateSpan(expression, templateChunk);
                    spans.push(span);
                }
            }
            else {
                // 如果已经是表达式，直接使用
                expression = variable;
                // 根据位置创建模板中间部分或尾部
                if (index === variableNames.length - 1) {
                    // 对于最后一个变量，创建模板尾部
                    templateChunk = typescript_1.default.factory.createTemplateTail('');
                }
                else {
                    // 对于中间变量，后面跟一个空格
                    templateChunk = typescript_1.default.factory.createTemplateMiddle(' ');
                }
                // 创建模板跨度
                var span = typescript_1.default.factory.createTemplateSpan(expression, templateChunk);
                spans.push(span);
            }
        });
        // 确保 templateHead 已经定义
        if (!templateHead) {
            templateHead = typescript_1.default.factory.createTemplateHead('');
        }
        // 创建模板表达式
        var templateExpression = typescript_1.default.factory.createTemplateExpression(templateHead, spans);
        // 返回完整的模板字符串表达式
        return templateExpression;
    }
    function parseStringClass(className) {
        var classArr = className.trim().split(/\s+/);
        if (classArr.length === 1) {
            if ((0, util_1.ignorePrefixTest)(classArr[0], ignorePrefix, exactMatch)) {
                return typescript_1.default.factory.createJsxExpression(undefined, typescript_1.default.factory.createStringLiteral(classArr[0], true));
            }
            else {
                return typescript_1.default.factory.createJsxExpression(undefined, createAccessExpression(className));
            }
        }
        var expression = supportClassnames
            ? createFunctionExpression(classArr)
            : createTemplateString(classArr);
        return typescript_1.default.factory.createJsxExpression(undefined, expression);
    }
    function transformer(context) {
        return function (rootNode) {
            function visit(node) {
                if (typescript_1.default.isJsxAttribute(node) &&
                    (node.name.getText() === 'className')) {
                    if (!node.initializer)
                        return node;
                    var transform = void 0;
                    if (typescript_1.default.isJsxExpression(node.initializer)) {
                        transform = parseExpressionClass(node.initializer.expression);
                    }
                    else if (typescript_1.default.isStringLiteral(node.initializer)) {
                        transform = parseStringClass(node.initializer.text);
                    }
                    else {
                        return node;
                    }
                    if (transform) {
                        return context.factory.updateJsxAttribute(node, node.name, transform);
                    }
                }
                return typescript_1.default.visitEachChild(node, visit, context);
            }
            return typescript_1.default.visitNode(rootNode, visit);
        };
    }
    function extractClassNames(sourceFile) {
        var classNames = sourceCode;
        function visit(node) {
            if (typescript_1.default.isJsxAttribute(node) &&
                (node.name.getText() === 'className')) {
                console.log('enter');
                if (!node.initializer) {
                    console.log('error');
                    return;
                }
                var expression = void 0;
                if (typescript_1.default.isJsxExpression(node.initializer)) {
                    expression = parseExpressionClass(node.initializer.expression);
                }
                else if (typescript_1.default.isStringLiteral(node.initializer)) {
                    expression = parseStringClass(node.initializer.text);
                }
                else {
                    expression = node.initializer;
                }
                if (typeof expression === 'string') {
                    classNames = expression;
                }
                else {
                    var printer = typescript_1.default.createPrinter({ newLine: typescript_1.default.NewLineKind.LineFeed });
                    // 将新的 Expression 节点转换为源码字符串
                    var newExpressionText = printer.printNode(typescript_1.default.EmitHint.Unspecified, expression, sourceFile);
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
    }
    else {
        var printer = typescript_1.default.createPrinter();
        var result = typescript_1.default.transform(sourceFile, [transformer]);
        return printer.printFile(result.transformed[0]);
    }
}
exports.transformClassToCSSModule = transformClassToCSSModule;
/**
 * 1. className={style['class1']}
 * 2. className={classnames(style['class1'],style['class2'])}
 * 3. className={'class1 class2'}
 * 4. className={style[value1]}}
 * 5. className={classnames(style[value1],style['class1']}
 * 6. className={isShow?style['show']:style['hide']}
 * 7. className={test+'class'}
 */
function transformCSSModuleToClass(sourceCode, options) {
    // TODO options
    var _a = options || {}, _b = _a.importName, importName = _b === void 0 ? 'style' : _b, _c = _a.exactMatch, exactMatch = _c === void 0 ? true : _c, _d = _a.supportClassnames, supportClassnames = _d === void 0 ? false : _d, ignorePrefix = _a.ignorePrefix, onlyClassName = _a.onlyClassName;
    var source = sourceCode;
    if (onlyClassName) {
        source = "<div className=".concat(sourceCode, "></div>");
    }
    if (!source) {
        return;
    }
    function parseExpressionClass(className) {
        var res;
        switch (className.kind) {
            case typescript_1.SyntaxKind.ConditionalExpression:
                res = typescript_1.default.factory.createJsxExpression(undefined, parseConditionExpression(className));
                break;
            case typescript_1.SyntaxKind.TemplateExpression:
                res = parseTemplateExpression(className);
                break;
            case typescript_1.SyntaxKind.CallExpression:
                res = parseCallExpression(className);
                break;
            case typescript_1.SyntaxKind.ElementAccessExpression:
                res = parseElementAccessExpression(className);
                break;
            case typescript_1.SyntaxKind.PropertyAccessExpression:
                res = parsePropertyAccessExpression(className);
                break;
            // case SyntaxKind.BinaryExpression:
            default:
                return className;
        }
        return typeof res === 'string' || typescript_1.default.isJsxExpression(res)
            ? res
            : typescript_1.default.factory.createJsxExpression(undefined, res);
    }
    function parsePropertyAccessExpression(className) {
        if (className.expression.getText() !== importName) {
            return className;
        }
        return className.name.text;
    }
    function parseElementAccessExpression(node, needExpression) {
        if (needExpression === void 0) { needExpression = false; }
        var argumentExpression = node.argumentExpression;
        var expression = node.expression;
        // 确定是CSS模块的写法
        if (expression.getText().trim() === importName) {
            if (typescript_1.default.isStringLiteral(argumentExpression)) {
                return needExpression
                    ? typescript_1.default.factory.createStringLiteral(argumentExpression.text, true)
                    : argumentExpression.text;
            }
            else {
                return argumentExpression;
            }
        }
        else {
            return node;
        }
    }
    function parseCallExpression(className) {
        var res = className.arguments.map(function (item) {
            var parsed = parseExpressionClass(item);
            if (typeof parsed === 'string') {
                return typescript_1.default.factory.createStringLiteral(parsed, true);
            }
            else {
                return parsed === null || parsed === void 0 ? void 0 : parsed.expression;
            }
        });
        return typescript_1.default.factory.createJsxExpression(undefined, typescript_1.default.factory.createCallExpression(className.expression, undefined, res));
    }
    function parseTemplateSpan(span) {
        switch (span.expression.kind) {
            case typescript_1.SyntaxKind.ElementAccessExpression:
                return parseElementAccessExpression(span.expression);
            case typescript_1.SyntaxKind.ConditionalExpression:
                return parseConditionExpression(span.expression);
            default:
                return span.expression;
        }
    }
    function parseTemplateExpression(templateExpression, needExpression) {
        var _a, _b;
        if (needExpression === void 0) { needExpression = false; }
        var arr = [];
        if (!!((_a = templateExpression.head.rawText) === null || _a === void 0 ? void 0 : _a.trim())) {
            arr.push.apply(arr, (((_b = templateExpression.head.rawText) === null || _b === void 0 ? void 0 : _b.trim().split(/\s+/)) || []));
        }
        templateExpression.templateSpans.forEach(function (span) {
            var _a, _b;
            var parsed = parseTemplateSpan(span);
            parsed && arr.push(parsed);
            if (!!((_a = span.literal.rawText) === null || _a === void 0 ? void 0 : _a.trim())) {
                arr.push.apply(arr, (((_b = span.literal.rawText) === null || _b === void 0 ? void 0 : _b.trim().split(/\s+/)) || []));
            }
        });
        if (arr.every(function (item) { return typeof item === 'string'; })) {
            return needExpression
                ? typescript_1.default.factory.createStringLiteral(arr.join(' '), true)
                : arr.join(' ');
        }
        if (needExpression) {
            return supportClassnames
                ? createFunctionExpression(arr)
                : createTemplateString(arr);
        }
        return typescript_1.default.factory.createJsxExpression(undefined, supportClassnames
            ? createFunctionExpression(arr)
            : createTemplateString(arr));
    }
    function parseConditionExpression(expression) {
        var whenTrue = expression.whenTrue;
        var whenFalse = expression.whenFalse;
        if ((0, typescript_1.isConditionalExpression)(expression.whenTrue)) {
            whenTrue = parseConditionExpression(expression.whenTrue);
        }
        if ((0, typescript_1.isConditionalExpression)(expression.whenFalse)) {
            whenFalse = parseConditionExpression(expression.whenFalse);
        }
        if ((0, typescript_1.isTemplateExpression)(expression.whenTrue)) {
            whenTrue = parseTemplateExpression(expression.whenTrue, true);
        }
        if ((0, typescript_1.isTemplateExpression)(expression.whenFalse)) {
            whenFalse = parseTemplateExpression(expression.whenFalse, true);
        }
        if ((0, typescript_1.isElementAccessExpression)(expression.whenTrue)) {
            whenTrue = parseElementAccessExpression(expression.whenTrue, true);
        }
        if ((0, typescript_1.isElementAccessExpression)(expression.whenFalse)) {
            whenFalse = parseElementAccessExpression(expression.whenFalse, true);
        }
        return typescript_1.default.factory.createConditionalExpression(expression.condition, typescript_1.default.factory.createToken(typescript_1.default.SyntaxKind.QuestionToken), whenTrue, typescript_1.default.factory.createToken(typescript_1.default.SyntaxKind.ColonToken), whenFalse);
    }
    // return classname('class1','class2')
    function createFunctionExpression(variableNames) {
        var spans = variableNames.map(function (item, index) {
            var expression;
            if (typeof item === 'string') {
                expression = typescript_1.default.factory.createStringLiteral(item);
            }
            else {
                expression = item;
            }
            return expression;
        });
        var funcIdentifer = typescript_1.default.factory.createIdentifier('classname');
        return typescript_1.default.factory.createCallExpression(funcIdentifer, undefined, spans);
    }
    function createTemplateString(elements) {
        // 如果第一个元素是字符串，则创建头部模板文字，否则创建空字符串头部模板文字并将表达式添加为第一个跨度
        var headArr = [];
        var curExp = null;
        var head = null;
        var spans = [];
        elements.forEach(function (element, index) {
            var isLast = index === elements.length - 1;
            var literal = isLast
                ? typescript_1.default.factory.createTemplateTail('')
                : typescript_1.default.factory.createTemplateMiddle(headArr.join(' '));
            if (typeof element === 'string') {
                headArr.push(element);
            }
            else {
                if (curExp) {
                    spans.push(typescript_1.default.factory.createTemplateSpan(curExp, literal));
                    return;
                }
                if (!head) {
                    head = typescript_1.default.factory.createTemplateHead(headArr.join(' '));
                }
                headArr = [];
                curExp = element;
            }
        });
        if (!head) {
            head = typescript_1.default.factory.createTemplateHead(headArr.join(' '));
        }
        if (curExp) {
            spans.push(typescript_1.default.factory.createTemplateSpan(curExp, typescript_1.default.factory.createTemplateTail(headArr.length === 0 ? '' : ' ' + headArr.join(' '))));
        }
        return typescript_1.default.factory.createTemplateExpression(head, spans);
    }
    function extractClassNames(sourceFile) {
        var classNames = sourceCode;
        function visit(node) {
            if (typescript_1.default.isJsxAttribute(node) &&
                (node.name.getText() === 'className')) {
                if (!node.initializer) {
                    return;
                }
                if (typescript_1.default.isJsxExpression(node.initializer)) {
                    var expression = parseExpressionClass(node.initializer.expression);
                    if (typeof expression === 'string') {
                        classNames = expression;
                    }
                    else {
                        var printer = typescript_1.default.createPrinter({ newLine: typescript_1.default.NewLineKind.LineFeed });
                        // 将新的 Expression 节点转换为源码字符串
                        var newExpressionText = printer.printNode(typescript_1.default.EmitHint.Unspecified, expression, sourceFile);
                        classNames = newExpressionText;
                    }
                }
            }
            node.forEachChild(visit);
        }
        visit(sourceFile);
        return classNames;
    }
    function transformer(context) {
        return function (rootNode) {
            function visit(node) {
                if (typescript_1.default.isJsxAttribute(node) &&
                    (node.name.getText() === 'className')) {
                    if (!node.initializer)
                        return node;
                    var transform = void 0;
                    if (typescript_1.default.isJsxExpression(node.initializer)) {
                        transform = parseExpressionClass(node.initializer.expression);
                    }
                    else {
                        return node;
                    }
                    if (transform) {
                        return context.factory.updateJsxAttribute(node, node.name, typeof transform === 'string'
                            ? typescript_1.default.factory.createStringLiteral(transform, true)
                            : transform);
                    }
                }
                return typescript_1.default.visitEachChild(node, visit, context);
            }
            return typescript_1.default.visitNode(rootNode, visit);
        };
    }
    console.log(source);
    var sourceFile = typescript_1.default.createSourceFile('', source, typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TSX);
    if (onlyClassName) {
        return extractClassNames(sourceFile);
    }
    else {
        var printer = typescript_1.default.createPrinter();
        var result = typescript_1.default.transform(sourceFile, [transformer]);
        return printer.printFile(result.transformed[0]);
    }
}
exports.transformCSSModuleToClass = transformCSSModuleToClass;
// Test code
var testCode = "{`${style['class1']} ${style['class2']}`}";
var res = transformClassToCSSModule(testCode, {
    onlyClassName: true
});
console.log(res);
