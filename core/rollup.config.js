// @ts-check

import typescript from "@rollup/plugin-typescript"
import dts from "rollup-plugin-dts"

/** @type {import ("rollup").RollupOptions[]} RollupOptions */
const options = [
    {
        input: "0-index.ts",
        output: {
            file      : "../dist/index.js",
            format    : "esm",
            sourcemap : true
        },
        plugins: [
            typescript ({
                tsconfig       : './tsconfig.json',
                declaration    : true,
                declarationDir : "dts" // Note: is relative to the "output.file".
            })
        ]
    },
    {
        input: "../dist/dts/0-index.d.ts",
        output: {
            file   : "../dist/index.d.ts",
            format : "esm"
        },
        plugins: [
            dts ()
        ]
    }
]

export default options