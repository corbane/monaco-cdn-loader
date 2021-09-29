
/*/
    # CHANGES

    ## 2.1.0 (27.09.2021)
      - append Promise support
      - remove Workspace class
      - bug with "globalThis.isInitialized" inside "initialize" function
    ## 2.0.0 (14.09.2021)
      - update to monaco-0.27.0
      - move "MonacoEditor.initialize" to module function "initialize"
      - remove "MonacoEditor" and feature support
      - append Workspace class

    ## 1.1.0 (07.08.2021)
    - update to monaco-0.26.1
    
    ## 1.0.0 (21.04.2021)


    # USSUES

    - Cannot change the locale after the initialization (https://github.com/microsoft/monaco-editor/issues/2673)
    - Auto size not good if the model is empty: "Error: Cannot read properties of null (reading 'clearRect')"
    - With JsDelivr, browser cannot load the source from source-map

    # REMARKS

    Malgrés tout mes éfforts, je n'ais pas été capable de charger monaco via un CDN autrement qu'en global.
/*/

type None = null|undefined
type CompilerOptions = monaco.languages.typescript.CompilerOptions

const IS_INITIALIZED = Symbol ("monaco-cdn-loader-status")
globalThis[IS_INITIALIZED] = false;

export function initialize (
    base    ?: string | null,
    version ?: `${number}.${number}.${number}` | null,
    local   ?: ""|"de"|"es"|"fr"|"it"|"ja"|"ko"|"ru"|"zh-cn"|"zh-tw",
) {
    
    if (globalThis[IS_INITIALIZED]) {
        console.error ("Try to initialize Monaco Editor, but it is already loaded.")
        return
    }
    
    base
        = base == null ? "https://cdn.jsdelivr.net/npm/monaco-editor"
        : base[base.length-1] == '/' ? base.slice (0, base.length-1)
        : base
    version
        = version == null ? "0.27.0"
        : version
    local
        = local == null ? ""
        : local

    const href = `${base}@${version}/min/vs`

    if (globalThis.require == null)
    {
        globalThis.require = {
            // @ts-ignore
            baseUrl : href,
            paths   : { vs: href }
        }
        if (local) {
            globalThis.require["vs/nls"] = { availableLanguages: { '*': local } }
            //globalThis.require["vs/nls"] = { availableLanguages: { '*': local } }
            local = '.' + local as any
        }
    }
    
    var _pendingResources = 0
    var _resolve: () => void

    return new Promise <void> (resolve =>
    {
        _resolve = resolve
        _injectStyle  (`${href}/editor/editor.main.css`, "vs/editor/editor.main.css")
        _injectScript (`${href}/loader.js`)
        _injectScript (`${href}/editor/editor.main.nls${local}.js`)
        _injectScript (`${href}/editor/editor.main.js`)
    }) 
    
    function _injectStyle (href: string, dataName: string = null)
    {
        var style  = document.createElement ("link")
        style.rel  = "stylesheet"
        style.href = href
        if (dataName) style.dataset.name = dataName // <------
        _appendRessource (style)
    }

    function _injectScript (src: string)
    {
        var script = document.createElement ("script")
        script.type   = "text/javascript"
        script.async  = true
        script.src    = src
        _appendRessource (script)
    }

    function _appendRessource (node: HTMLElement)
    {
        node.onload = _onScriptLoaded
        _pendingResources++
        document.head.appendChild (node)
    }

    function _onScriptLoaded ()
    {
        _pendingResources--
        if (globalThis[IS_INITIALIZED] == false && _pendingResources <= 0)
        {
            globalThis[IS_INITIALIZED] = true
            _resolve ()
        }
    }
}

export function setTsCompilerOptions (options: CompilerOptions): void {
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions (options)
}
