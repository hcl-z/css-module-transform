import { describe } from '@jest/globals';
import { transformCSSModuleToClass, transformClassToCSSModule } from '../index';

/**
 * 1. className="class1"
 * 2. className="class1 class2"
 * 3. className={'class1 class2'}
 * 4. className={`${value1}`}
 * 5. className={`${value1} class1`}
 * 6. className={isShow?'show':'hide'}
 */

const basicCode = [
  'Basic transform',
  `<div className='class1'>Hello</div>`,
  "<div className={style['class1']}>Hello</div>",
];
const combineCode = [
  'combineCode transform',
  `<div className='class1 class2'>Hello</div>`,
  "<div className={`${style['class1']} ${style['class2']}`}>Hello</div>;",
];
const tsxCode = [
  'tsxCode transform',
  "<div className={'class1 class2'}>Hello</div>",
  "<div className={`${style['class1']} ${style['class2']}`}>Hello</div>;",
];
const ternaryCode = [
  'ternaryCode transform',
  "<div className={true ? 'class1' : 'class2'}>Hello</div>",
  "<div className={true ? style['class1'] : style['class2']}>Hello</div>;",
];
const mixedCode = [
  'mixCode transform',
  "<div className={true ? 'class1 class2' : 'class2'}>Hello</div>",
  "<div className={true ? `${style['class1']} ${style['class2']}` : style['class2']}>Hello</div>;",
];
const valClassCode = [
  'valClassCode transform',
  '<div className={`${value}`}>Hello</div>',
  '<div className={style[value]}>Hello</div>;',
];
const mixValClassCode = [
  'mixValClassCode transform',
  '<div className={`${value} class1`}>Hello</div>',
  "<div className={`${style[value]} ${style['class1']}`}>Hello</div>;",
];
const mixTernaryClassCode = [
  'mixValClassCode transform',
  '<div className={`${true?value:value1} class1`}>Hello</div>',
  "<div className={`${true ? style[value] : style[value1]} ${style['class1']}`}>Hello</div>;",
];

const classnameFuncClassCode = [
  'mixValClassCode transform',
  '<div className={classname("class1")}>Hello</div>',
  "<div className={classname(style['class1'])}>Hello</div>;",
];

const testArr = [
  basicCode,
  combineCode,
  tsxCode,
  ternaryCode,
  mixedCode,
  valClassCode,
  mixValClassCode,
  mixTernaryClassCode,
  classnameFuncClassCode,
];

describe('transform Test', () => {
  describe.each(testArr)(
    'transformClassToCSSModule Test - %s',
    (name, input, expected) => {
      it(`${name}`, () => {
        const result = transformClassToCSSModule(input);
        expect(result.trim().replace(';', '')).toBe(
          expected.trim().replace(';', ''),
        );
      });
    },
  );

  describe.each(testArr)(
    'transformCSSModuleToClassName Test - %s',
    (name, expected, input) => {
      it(`${name}`, () => {
        const result = transformCSSModuleToClass(input);
        expect(result.trim().replace(';', '')).toBe(
          expected.trim().replace(';', ''),
        );
      });
    },
  );
});
