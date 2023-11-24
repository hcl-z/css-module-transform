import { describe } from "@jest/globals";
import { transformClassToCSSModule } from "..";

const basicCode = `<div className="class1">Hello</div>`;
const combineCode = `<div className="class1 class2">Hello</div>`
describe("transformClassToCSSModule", () => {
    it("Basic transform", () => {
        const result = transformClassToCSSModule(basicCode);
        expect(result).toBe(`<div className={style['class1']}>Hello</div>;`)
    })

    it("combineCode transform", () => {
        const tsxCode = combineCode;
        const result = transformClassToCSSModule(tsxCode);
        expect(result).toBe("<div className={`${style['class1']} ${style['class2']}`}>Hello</div>")
    })
})