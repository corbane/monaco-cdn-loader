// @ts-check

import RollupTs from "@rollup/plugin-typescript"
import { nodeResolve as RollupResolve } from "@rollup/plugin-node-resolve"

/** @type {import ("rollup").RollupOptions} RollupOptions */
const options = {
    input: "index.ts",
    plugins: [
        RollupTs ({ tsconfig: "tsconfig.json" }),
        RollupResolve ({ extensions: ["js", "ts"] }),
    ],
    output: {
        file     : "index.js",
        format   : "esm",
        sourcemap: true
    }
}

export default options