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
  "'class1'",
  "{style.class1}",
  'class1',
];
const combineCode = [
  'combineCode transform',
  "'class1 class2'",
  "{`${style.class1} ${style.class2}`}",
  'class1 class2',
];
const tsxCode = [
  'tsxCode transform',
  "{'class1 class2'}",
  "{`${style.class1} ${style.class2}`}",
  'class1 class2',
];
const ternaryCode = [
  'ternaryCode transform',
  "{true ? 'class1' : 'class2'}",
  "{true ? style.class1 : style.class2}",
];
const mixedCode = [
  'mixCode transform',
  "{true ? 'class1 class2' : 'class2'}",
  "{true ? `${style.class1} ${style.class2}` : style.class2}",
];
const valClassCode = [
  'valClassCode transform',
  '{`${value}`}',
  '{style[value]}',
  '{value}',
];
const mixValClassCode = [
  'mixValClassCode transform',
  '{`${value} class1`}',
  "{`${style[value]} ${style.class1}`}",
];
const mixTernaryClassCode = [
  'mixTernaryClassCode transform',
  '{`${true ? value : value1} class1`}',
  "{`${true ? style[value] : style[value1]} ${style.class1}`}",
];

const funcClassCode = [
  'funcClassCode',
  "{func('class1')}",
  "{style[func('class1')]}",
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
  funcClassCode,
];

describe('transform Test', () => {
  describe.each(testArr)(
    'transformClassToCSSModule Test - %s',
    (name, input, expected) => {
      it(`${name}`, () => {
        const result = transformClassToCSSModule(input, { onlyClassName: true });
        expect(result?.trim().replace(';', '')).toBe(
          expected.trim().replace(';', ''),
        );
      });
    },
  );

  describe.each(testArr)(
    'transformCSSModuleToClassName Test - %s',
    (name, expected, input, _expected) => {
      it(`${name}`, () => {
        const result = transformCSSModuleToClass(input, { onlyClassName: true });
        expect(result?.trim().replace(';', '')).toBe(
          (_expected || expected).trim().replace(';', ''),
        );
      });
    },
  );
});
