import { transformCSSModuleToClass } from "../index";

// 读取文件内容
const fs = require('fs');
fs.readFile('./template.tsx', 'utf8', (err: any, data: string) => {
    if (err) {
        console.error(err);
        return;
    }
    const res = transformCSSModuleToClass(data)
    console.log(res)
})