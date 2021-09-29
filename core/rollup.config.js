// @ts-check

/** @type {import ("rollup").RollupOptions} RollupOptions */
const options = {
    input: ".out/index.js",
    plugins: [
    ],
    output: {
        file     : "../dist/index.js",
        format   : "esm"
    }
}

export default options