"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var globals_1 = require("@jest/globals");
var index_1 = require("../index");
/**
 * 1. className="class1"
 * 2. className="class1 class2"
 * 3. className={'class1 class2'}
 * 4. className={`${value1}`}
 * 5. className={`${value1} class1`}
 * 6. className={isShow?'show':'hide'}
 */
var basicCode = ["Basic transform", "<div className=\"class1\">Hello</div>", "<div className={style['class1']}>Hello</div>;"];
var combineCode = ["combineCode transform", "<div className=\"class1 class2\">Hello</div>", "<div className={`${style['class1']} ${style['class2']}`}>Hello</div>;"];
var tsxCode = ['tsxCode transform', "<div className={'class1 class2'}>Hello</div>", "<div className={`${style['class1']} ${style['class2']}`}>Hello</div>;"];
var ternaryCode = ['ternaryCode transform', "<div className={true ? 'class1' : 'class2'}>Hello</div>", "<div className={true ? style['class1'] : style['class2']}>Hello</div>;"];
var mixedCode = ['mixCode transform', "<div className={true ? 'class1 class2' : 'class2'}>Hello</div>", "<div className={true ? `${style['class1']} ${style['class2']}` : style['class2']}>Hello</div>;"];
var valClassCode = ['valClassCode transform', '<div className={`${value}`}>Hello</div>', '<div className={style[value]}>Hello</div>;'];
var mixValClassCode = ['mixValClassCode transform', '<div className={`${value} class1`}>Hello</div>', "<div className={`${style[value]} ${style['class1']}`}>Hello</div>;"];
var mixTernaryClassCode = ['mixValClassCode transform', '<div className={`${true?value:value1} class1`}>Hello</div>', "<div className={`${true ? style[value] : style[value1]} ${style['class1']}`}>Hello</div>;"];
var testArr = [basicCode, combineCode, tsxCode, ternaryCode, mixedCode, valClassCode, mixValClassCode, mixTernaryClassCode];
(0, globals_1.describe)("transformClassToCSSModule", function () {
    testArr.forEach(function (item) {
        it(item[0], function () {
            console.log('origin code', item[0]);
            var result = (0, index_1.transformClassToCSSModule)(item[1]);
            expect(result.trim()).toBe(item[2].trim());
        });
    });
});
