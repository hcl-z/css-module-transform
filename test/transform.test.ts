import { describe } from "@jest/globals";
import { transformClassToCSSModule } from "../index";

/**
 * 1. className="class1"
 * 2. className="class1 class2"
 * 3. className={'class1 class2'}
 * 4. className={`${value1}`}
 * 5. className={`${value1} class1`}
 * 6. className={isShow?'show':'hide'}
 */


const basicCode = ["Basic transform", `<div className="class1">Hello</div>`, "<div className={style['class1']}>Hello</div>;"];
const combineCode = ["combineCode transform", `<div className="class1 class2">Hello</div>`, "<div className={`${style['class1']} ${style['class2']}`}>Hello</div>;"]
const tsxCode = ['tsxCode transform', "<div className={'class1 class2'}>Hello</div>", "<div className={`${style['class1']} ${style['class2']}`}>Hello</div>;"];
const ternaryCode = ['ternaryCode transform', "<div className={true ? 'class1' : 'class2'}>Hello</div>", "<div className={true ? style['class1'] : style['class2']}>Hello</div>;"];
const mixedCode = ['mixCode transform', "<div className={true ? 'class1 class2' : 'class2'}>Hello</div>", "<div className={true ? `${style['class1']} ${style['class2']}` : style['class2']}>Hello</div>;"];
const valClassCode = ['valClassCode transform', '<div className={`${value}`}>Hello</div>', '<div className={style[value]}>Hello</div>;']
const mixValClassCode = ['mixValClassCode transform', '<div className={`${value} class1`}>Hello</div>', "<div className={`${style[value]} ${style['class1']}`}>Hello</div>;"]
const mixTernaryClassCode = ['mixValClassCode transform', '<div className={`${true?value:value1} class1`}>Hello</div>', "<div className={`${true ? style[value] : style[value1]} ${style['class1']}`}>Hello</div>;"]
const testArr = [basicCode, combineCode, tsxCode, ternaryCode, mixedCode, valClassCode, mixValClassCode, mixTernaryClassCode]
describe("transformClassToCSSModule", () => {

    testArr.forEach((item) => {
        it(item[0], () => {
            console.log('origin code', item[0])
            const result = transformClassToCSSModule(item[1]);
            expect(result.trim()).toBe(item[2].trim())
        })
    })
})