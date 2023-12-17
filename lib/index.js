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
exports.transformClassToCSSModule = void 0;
var typescript_1 = __importStar(require("typescript"));
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
    var _a = options || {}, _b = _a.importName, importName = _b === void 0 ? 'style' : _b, _c = _a.needClassnames, needClassnames = _c === void 0 ? false : _c;
    var sourceFile = typescript_1.default.createSourceFile('', sourceCode, typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TSX);
    var printer = typescript_1.default.createPrinter();
    var result = typescript_1.default.transform(sourceFile, [transformer]);
    return printer.printFile(result.transformed[0]);
    function parseExpressionClass(className) {
        switch (className.kind) {
            case typescript_1.SyntaxKind.StringLiteral:
            case typescript_1.SyntaxKind.NoSubstitutionTemplateLiteral:
                return parseStringClass(className.getText().slice(1, -1));
            case typescript_1.SyntaxKind.ConditionalExpression:
                return typescript_1.default.factory.createJsxExpression(undefined, parseConditionExpression(className));
            case typescript_1.SyntaxKind.TemplateExpression:
                return parseTemplateExpression(className);
            default:
                break;
        }
    }
    function parseTemplateSpan(span) {
        switch (span.expression.kind) {
            case typescript_1.SyntaxKind.StringLiteral:
                return span.expression.getText().trim().split(/\s+/);
            case typescript_1.SyntaxKind.Identifier:
                return [createAccessExpression(span.expression.getText(), true)];
            case typescript_1.SyntaxKind.ConditionalExpression:
                return [parseConditionExpression(span.expression)];
            default:
                return [span.expression];
        }
    }
    function parseTemplateExpression(templateExpression) {
        var _a;
        var arr = [];
        if (templateExpression.head.rawText) {
            arr.push.apply(arr, ((_a = templateExpression.head.rawText) === null || _a === void 0 ? void 0 : _a.trim().split(/\s+/)) || []);
        }
        templateExpression.templateSpans.forEach(function (span) {
            var _a;
            arr.push.apply(arr, parseTemplateSpan(span));
            if (span.literal.rawText) {
                arr.push.apply(arr, ((_a = span.literal.rawText) === null || _a === void 0 ? void 0 : _a.trim().split(/\s+/)) || []);
            }
        });
        if (arr.length === 1 && typeof arr[0] !== 'string' && typescript_1.default.isElementAccessExpression(arr[0])) {
            return typescript_1.default.factory.createJsxExpression(undefined, arr[0]);
        }
        return typescript_1.default.factory.createJsxExpression(undefined, createTemplateString(arr));
    }
    function createAccessExpression(className, isVariable) {
        if (isVariable === void 0) { isVariable = false; }
        var stylesIdentifier = typescript_1.default.factory.createIdentifier(importName);
        var classLiteral = isVariable ? typescript_1.default.factory.createIdentifier(className) : typescript_1.default.factory.createStringLiteral(className, true);
        var elementAccess = typescript_1.default.factory.createElementAccessExpression(stylesIdentifier, classLiteral);
        return elementAccess;
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
            whenTrue = createAccessExpression(expression.whenTrue.getText(), true);
        }
        if ((0, typescript_1.isIdentifier)(expression.whenFalse)) {
            whenFalse = createAccessExpression(expression.whenFalse.getText(), true);
        }
        return typescript_1.default.factory.createConditionalExpression(expression.condition, typescript_1.default.factory.createToken(typescript_1.default.SyntaxKind.QuestionToken), whenTrue, typescript_1.default.factory.createToken(typescript_1.default.SyntaxKind.ColonToken), whenFalse);
    }
    function createTemplateString(variableNames) {
        // 创建模板头部
        var templateHead = typescript_1.default.factory.createTemplateHead('');
        // 创建所有模板跨度
        var spans = variableNames.map(function (item, index) {
            var expression;
            if (typeof item === 'string') {
                var variable = "".concat(importName, "['").concat(item, "']");
                expression = typescript_1.default.factory.createIdentifier(variable);
            }
            else {
                expression = item;
            }
            if (index === variableNames.length - 1) {
                // 对于最后一个变量，创建模板尾部
                var templateTail = typescript_1.default.factory.createTemplateTail('');
                return typescript_1.default.factory.createTemplateSpan(expression, templateTail);
            }
            else {
                // 对于中间变量，创建模板中间部分
                var templateMiddle = typescript_1.default.factory.createTemplateMiddle(' ');
                return typescript_1.default.factory.createTemplateSpan(expression, templateMiddle);
            }
        });
        // 创建模板表达式
        var templateExpression = typescript_1.default.factory.createTemplateExpression(templateHead, spans);
        // 返回完整的模板字符串
        return templateExpression;
    }
    function parseStringClass(className) {
        var classArr = className.trim().split(/\s+/);
        if (classArr.length === 1) {
            return typescript_1.default.factory.createJsxExpression(undefined, createAccessExpression(className));
        }
        var templateString = createTemplateString(classArr);
        return typescript_1.default.factory.createJsxExpression(undefined, templateString);
    }
    function transformer(context) {
        return function (rootNode) {
            function visit(node) {
                if (typescript_1.default.isJsxAttribute(node) && (node.name.getText() === 'className' || node.name.getText() === 'class')) {
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
}
exports.transformClassToCSSModule = transformClassToCSSModule;
