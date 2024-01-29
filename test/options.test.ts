import { describe } from '@jest/globals';
import { transformClassToCSSModule } from '../index';

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
  `<div className="class1">Hello</div>`,
  "<div className={style['class1']}>Hello</div>;",
  "<div className={'class1'}>Hello</div>;",
];
const combineCode = [
  'combineCode transform',
  `<div className="class1 class2">Hello</div>`,
  "<div className={classname(style['class1'], style['class2'])}>Hello</div>;",
  "<div className={`class1 ${style['class2']}`}>Hello</div>;",
];
const tsxCode = [
  'tsxCode transform',
  "<div className={'class1 class2'}>Hello</div>",
  "<div className={classname(style['class1'], style['class2'])}>Hello</div>;",
  "<div className={`class1 ${style['class2']}`}>Hello</div>;",
];
const ternaryCode = [
  'ternaryCode transform',
  "<div className={true ? 'class1' : 'class2'}>Hello</div>",
  "<div className={true ? style['class1'] : style['class2']}>Hello</div>;",
  "<div className={true ? 'class1' : style['class2']}>Hello</div>;",
];
const mixedCode = [
  'mixCode transform',
  "<div className={true ? 'class1 class2' : 'class2'}>Hello</div>",
  "<div className={true ? classname(style['class1'], style['class2']) : style['class2']}>Hello</div>;",
  "<div className={true ? `class1 ${style['class2']}` : style['class2']}>Hello</div>;",
];
const valClassCode = [
  'valClassCode transform',
  '<div className={`${value}`}>Hello</div>',
  '<div className={style[value]}>Hello</div>;',
  '<div className={style[value]}>Hello</div>;',
];
const mixValClassCode = [
  'mixValClassCode transform',
  '<div className={`${value} class1`}>Hello</div>',
  "<div className={classname(style[value], style['class1'])}>Hello</div>;",
  '<div className={style[value]}>Hello</div>;',
];
const mixTernaryClassCode = [
  'mixValClassCode transform',
  '<div className={`${true?value:value1} class1`}>Hello</div>',
  "<div className={classname(true ? style[value] : style[value1], style['class1'])}>Hello</div>;",
  '<div className={`${true ? style[value] : style[value1]}`}>Hello</div>;',
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
];

describe('options Test', () => {
  describe.each(testArr)(
    'supportClassnames Test - %s',
    (name, input, expectedSupportClassnames, expectedIgnorePrefix) => {
      it('should support classnames', () => {
        const result = transformClassToCSSModule(input, {
          supportClassnames: true,
        });
        expect(result?.trim()).toBe(expectedSupportClassnames.trim());
      });
    },
  );

  describe.each(testArr)(
    'ignorePrefix Test - %s',
    (name, input, expectedSupportClassnames, expectedIgnorePrefix) => {
      it('should ignore specified prefix', () => {
        const result = transformClassToCSSModule(input, {
          ignorePrefix: ['class1'],
        });
        expect(result?.trim()).toBe(expectedIgnorePrefix.trim());
      });
    },
  );
});
