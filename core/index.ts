/// <reference path="./monaco-0.27.0.d.ts" />

type None = null|undefined
type CompilerOptions = monaco.languages.typescript.CompilerOptions
type ICodeEditor     = monaco.editor.IStandaloneCodeEditor
type ITextModel      = monaco.editor.ITextModel
type Uri             = monaco.Uri

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


/*/
    Utility class to store "monaco.editor.ITextModel" objects.

    Currently this class encapsulates a "Map" type only to automate the creation of "monaco.editor.ITextModel" objects.
/*/


export class Workspace implements Map <string, ITextModel>
{
    _models = new Map <string, ITextModel> ()

    get size () { return this._models.size }

    clear ()
    {
        for (var mod of this._models.values ()) mod.dispose ()
        this._models.clear ()
    }

    delete (path: string|Uri)
    {
        if (path == null) return false
        path = path.toString ()
        const mod = this._models.get (path)
        if (mod) mod.dispose ()
        return this._models.delete (path)
    }

    forEach (callback: (value: ITextModel, key: string, map: Map<string, ITextModel>) => void, thisArg?: any){ this.forEach (callback, thisArg) }

    get (path: string|Uri): ITextModel
    {
        return typeof path == "string"
             ? this._models.get (path)
             : this._models.get (path.toString ())
    }

    has (path: string|Uri)
    {
        return typeof path == "string"
             ? this._models.has (path)
             : this._models.has (path.toString ())
    }

    set (path: string|Uri, model: string|ITextModel, lang?: None|string)
    {
        path = path.toString ()
        lang = lang || fromExtenstion (path)

        const previous = this._models.get (path)
        if (typeof model === "string")
        {
            if (previous)
            {
                previous.setValue (model)
                model = previous
            }
            else
            {
                model = monaco.editor.createModel (
                    model, lang,
                    monaco.Uri.from (monaco.Uri.parse (path))
                )
            }
        }
        else 
        {
            if (previous) 
            {
                if (previous === model) return
                this.delete (path)
            }
        }
        this._models.set (path, model)
        return this
    }

    entries () { return this._models.entries () }

    keys () { return this._models.keys () }

    values () { return this._models.values () }

    [Symbol.iterator] () { return this._models[Symbol.iterator] () }

    get [Symbol.toStringTag] () { return this[Symbol.toStringTag] }

}


/*/
    Detect programming languages from extension or shebang

    Data converted from https://github.com/blakeembrey/node-language-detect/blob/master/vendor/
/*/


function fromExtenstion (path: string, defaultLanguage: None|string = "Text")
{
    const i = path.lastIndexOf ('.')
    if (i < 0) return defaultLanguage
    const lang = extensions[path.substring (i)]
    return lang.toLowerCase () || defaultLanguage
}

function fromShebang (code: string, defaultLanguage: None|string = "Text")
{
    const isWhiteChar = (c: string) => c === ' ' || c === '\t' || c === '\n' || c === '\r'

    var count = code.length
    var i = 0

    // Get first line
    while (i < count) if (!isWhiteChar (code[i++])) break
    i++
    if (i >= count) return defaultLanguage
    
    // Ensure shebang line
    if (code[i] !== '#' || code[i] !== '!') return defaultLanguage
    i += 2

    // Remove white characters
    while (i < count) if (!isWhiteChar (code[i++])) break
    i++
    if (i >= count) return defaultLanguage

    // Get program name
    var start = i, end = i
    while (end < count)
    {
        var c = code[end++]
        if (isWhiteChar (c)) break
        else if (c == '/') start = end+1
    }
    const prog = code.substring (start, end)
    if (prog == null) return defaultLanguage
    
    // Get language
    const lang = programs[prog]
    return lang || defaultLanguage
}

const extensions : Record <string, string> = {
    /* Extensions         | Languages */
    ".abap"               : "ABAP",
    ".asc"                : "Public Key",
    ".ash"                : "AGS Script",
    ".ampl"               : "AMPL",
    ".mod"                : "XML",
    ".g4"                 : "ANTLR",
    ".apib"               : "API Blueprint",
    ".apl"                : "APL",
    ".dyalog"             : "APL",
    ".asp"                : "ASP",
    ".asax"               : "ASP",
    ".ascx"               : "ASP",
    ".ashx"               : "ASP",
    ".asmx"               : "ASP",
    ".aspx"               : "ASP",
    ".axd"                : "ASP",
    ".dats"               : "ATS",
    ".hats"               : "ATS",
    ".sats"               : "ATS",
    ".as"                 : "ActionScript",
    ".adb"                : "Ada",
    ".ada"                : "Ada",
    ".ads"                : "Ada",
    ".agda"               : "Agda",
    ".als"                : "Alloy",
    ".apacheconf"         : "ApacheConf",
    ".vhost"              : "Nginx",
    ".cls"                : "Visual Basic",
    ".applescript"        : "AppleScript",
    ".scpt"               : "AppleScript",
    ".arc"                : "Arc",
    ".ino"                : "Arduino",
    ".asciidoc"           : "AsciiDoc",
    ".adoc"               : "AsciiDoc",
    ".aj"                 : "AspectJ",
    ".asm"                : "Assembly",
    ".a51"                : "Assembly",
    ".inc"                : "SourcePawn",
    ".nasm"               : "Assembly",
    ".aug"                : "Augeas",
    ".ahk"                : "AutoHotkey",
    ".ahkl"               : "AutoHotkey",
    ".au3"                : "AutoIt",
    ".awk"                : "Awk",
    ".auk"                : "Awk",
    ".gawk"               : "Awk",
    ".mawk"               : "Awk",
    ".nawk"               : "Awk",
    ".bat"                : "Batchfile",
    ".cmd"                : "Batchfile",
    ".befunge"            : "Befunge",
    ".bison"              : "Bison",
    ".bb"                 : "BlitzBasic",
    ".decls"              : "BlitzBasic",
    ".bmx"                : "BlitzMax",
    ".bsv"                : "Bluespec",
    ".boo"                : "Boo",
    ".b"                  : "Limbo",
    ".bf"                 : "HyPhy",
    ".brs"                : "Brightscript",
    ".bro"                : "Bro",
    ".c"                  : "C",
    ".cats"               : "C",
    ".h"                  : "Objective-C",
    ".idc"                : "C",
    ".w"                  : "C",
    ".cs"                 : "Smalltalk",
    ".cshtml"             : "C#",
    ".csx"                : "C#",
    ".cpp"                : "C++",
    ".c++"                : "C++",
    ".cc"                 : "C++",
    ".cp"                 : "Component Pascal",
    ".cxx"                : "C++",
    ".h++"                : "C++",
    ".hh"                 : "Hack",
    ".hpp"                : "C++",
    ".hxx"                : "C++",
    ".inl"                : "C++",
    ".ipp"                : "C++",
    ".tcc"                : "C++",
    ".tpp"                : "C++",
    ".c-objdump"          : "C-ObjDump",
    ".chs"                : "C2hs Haskell",
    ".clp"                : "CLIPS",
    ".cmake"              : "CMake",
    ".cmake.in"           : "CMake",
    ".cob"                : "COBOL",
    ".cbl"                : "COBOL",
    ".ccp"                : "COBOL",
    ".cobol"              : "COBOL",
    ".cpy"                : "COBOL",
    ".css"                : "CSS",
    ".capnp"              : "Cap'n Proto",
    ".mss"                : "CartoCSS",
    ".ceylon"             : "Ceylon",
    ".chpl"               : "Chapel",
    ".ch"                 : "xBase",
    ".ck"                 : "ChucK",
    ".cirru"              : "Cirru",
    ".clw"                : "Clarion",
    ".icl"                : "Clean",
    ".dcl"                : "Clean",
    ".clj"                : "Clojure",
    ".boot"               : "Clojure",
    ".cl2"                : "Clojure",
    ".cljc"               : "Clojure",
    ".cljs"               : "Clojure",
    ".cljs.hl"            : "Clojure",
    ".cljscm"             : "Clojure",
    ".cljx"               : "Clojure",
    ".hic"                : "Clojure",
    ".coffee"             : "CoffeeScript",
    "._coffee"            : "CoffeeScript",
    ".cjsx"               : "CoffeeScript",
    ".cson"               : "CoffeeScript",
    ".iced"               : "CoffeeScript",
    ".cfm"                : "ColdFusion",
    ".cfml"               : "ColdFusion",
    ".cfc"                : "ColdFusion CFC",
    ".lisp"               : "NewLisp",
    ".asd"                : "Common Lisp",
    ".cl"                 : "OpenCL",
    ".l"                  : "PicoLisp",
    ".lsp"                : "NewLisp",
    ".ny"                 : "Common Lisp",
    ".podsl"              : "Common Lisp",
    ".sexp"               : "Common Lisp",
    ".cps"                : "Component Pascal",
    ".coq"                : "Coq",
    ".v"                  : "Verilog",
    ".cppobjdump"         : "Cpp-ObjDump",
    ".c++-objdump"        : "Cpp-ObjDump",
    ".c++objdump"         : "Cpp-ObjDump",
    ".cpp-objdump"        : "Cpp-ObjDump",
    ".cxx-objdump"        : "Cpp-ObjDump",
    ".creole"             : "Creole",
    ".cr"                 : "Crystal",
    ".feature"            : "Cucumber",
    ".cu"                 : "Cuda",
    ".cuh"                : "Cuda",
    ".cy"                 : "Cycript",
    ".pyx"                : "Cython",
    ".pxd"                : "Cython",
    ".pxi"                : "Cython",
    ".d"                  : "Makefile",
    ".di"                 : "D",
    ".d-objdump"          : "D-ObjDump",
    ".com"                : "DIGITAL Command Language",
    ".dm"                 : "DM",
    ".zone"               : "DNS Zone",
    ".arpa"               : "DNS Zone",
    ".darcspatch"         : "Darcs Patch",
    ".dpatch"             : "Darcs Patch",
    ".dart"               : "Dart",
    ".diff"               : "Diff",
    ".patch"              : "Diff",
    ".dockerfile"         : "Dockerfile",
    ".djs"                : "Dogescript",
    ".dylan"              : "Dylan",
    ".dyl"                : "Dylan",
    ".intr"               : "Dylan",
    ".lid"                : "Dylan",
    ".e"                  : "Eiffel",
    ".ecl"                : "ECLiPSe",
    ".eclxml"             : "ECL",
    ".sch"                : "KiCad",
    ".brd"                : "Eagle",
    ".epj"                : "Ecere Projects",
    ".ex"                 : "Elixir",
    ".exs"                : "Elixir",
    ".elm"                : "Elm",
    ".el"                 : "Emacs Lisp",
    ".emacs"              : "Emacs Lisp",
    ".emacs.desktop"      : "Emacs Lisp",
    ".em"                 : "EmberScript",
    ".emberscript"        : "EmberScript",
    ".erl"                : "Erlang",
    ".es"                 : "Erlang",
    ".escript"            : "Erlang",
    ".hrl"                : "Erlang",
    ".fs"                 : "GLSL",
    ".fsi"                : "F#",
    ".fsx"                : "F#",
    ".fx"                 : "FLUX",
    ".flux"               : "FLUX",
    ".f90"                : "FORTRAN",
    ".f"                  : "Forth",
    ".f03"                : "FORTRAN",
    ".f08"                : "FORTRAN",
    ".f77"                : "FORTRAN",
    ".f95"                : "FORTRAN",
    ".for"                : "Forth",
    ".fpp"                : "FORTRAN",
    ".factor"             : "Factor",
    ".fy"                 : "Fancy",
    ".fancypack"          : "Fancy",
    ".fan"                : "Fantom",
    ".fth"                : "Forth",
    ".4th"                : "Forth",
    ".forth"              : "Forth",
    ".fr"                 : "Text",
    ".frt"                : "Forth",
    ".g"                  : "GAP",
    ".gco"                : "G-code",
    ".gcode"              : "G-code",
    ".gms"                : "GAMS",
    ".gap"                : "GAP",
    ".gd"                 : "GDScript",
    ".gi"                 : "GAP",
    ".tst"                : "Scilab",
    ".s"                  : "GAS",
    ".ms"                 : "Groff",
    ".glsl"               : "GLSL",
    ".fp"                 : "GLSL",
    ".frag"               : "JavaScript",
    ".frg"                : "GLSL",
    ".fshader"            : "GLSL",
    ".geo"                : "GLSL",
    ".geom"               : "GLSL",
    ".glslv"              : "GLSL",
    ".gshader"            : "GLSL",
    ".shader"             : "GLSL",
    ".vert"               : "GLSL",
    ".vrx"                : "GLSL",
    ".vshader"            : "GLSL",
    ".gml"                : "XML",
    ".kid"                : "Genshi",
    ".ebuild"             : "Gentoo Ebuild",
    ".eclass"             : "Gentoo Eclass",
    ".po"                 : "Gettext Catalog",
    ".pot"                : "Gettext Catalog",
    ".glf"                : "Glyph",
    ".gp"                 : "Gnuplot",
    ".gnu"                : "Gnuplot",
    ".gnuplot"            : "Gnuplot",
    ".plot"               : "Gnuplot",
    ".plt"                : "Gnuplot",
    ".go"                 : "Go",
    ".golo"               : "Golo",
    ".gs"                 : "JavaScript",
    ".gst"                : "Gosu",
    ".gsx"                : "Gosu",
    ".vark"               : "Gosu",
    ".grace"              : "Grace",
    ".gradle"             : "Gradle",
    ".gf"                 : "Grammatical Framework",
    ".dot"                : "Graphviz (DOT)",
    ".gv"                 : "Graphviz (DOT)",
    ".man"                : "Groff",
    ".1"                  : "Groff",
    ".1in"                : "Groff",
    ".1m"                 : "Groff",
    ".1x"                 : "Groff",
    ".2"                  : "Groff",
    ".3"                  : "Groff",
    ".3in"                : "Groff",
    ".3m"                 : "Groff",
    ".3qt"                : "Groff",
    ".3x"                 : "Groff",
    ".4"                  : "Groff",
    ".5"                  : "Groff",
    ".6"                  : "Groff",
    ".7"                  : "Groff",
    ".8"                  : "Groff",
    ".9"                  : "Groff",
    ".n"                  : "Nemerle",
    ".rno"                : "Groff",
    ".roff"               : "Groff",
    ".groovy"             : "Groovy",
    ".grt"                : "Groovy",
    ".gtpl"               : "Groovy",
    ".gvy"                : "Groovy",
    ".gsp"                : "Groovy Server Pages",
    ".hcl"                : "HCL",
    ".tf"                 : "HCL",
    ".html"               : "HTML",
    ".htm"                : "HTML",
    ".html.hl"            : "HTML",
    ".st"                 : "Smalltalk",
    ".xht"                : "HTML",
    ".xhtml"              : "HTML",
    ".mustache"           : "HTML+Django",
    ".jinja"              : "HTML+Django",
    ".erb"                : "HTML+ERB",
    ".erb.deface"         : "HTML+ERB",
    ".phtml"              : "HTML+PHP",
    ".http"               : "HTTP",
    ".php"                : "PHP",
    ".haml"               : "Haml",
    ".haml.deface"        : "Haml",
    ".handlebars"         : "Handlebars",
    ".hbs"                : "Handlebars",
    ".hb"                 : "Harbour",
    ".hs"                 : "Haskell",
    ".hsc"                : "Haskell",
    ".hx"                 : "Haxe",
    ".hxsl"               : "Haxe",
    ".hy"                 : "Hy",
    ".pro"                : "QMake",
    ".dlm"                : "IDL",
    ".ipf"                : "IGOR Pro",
    ".ini"                : "INI",
    ".cfg"                : "INI",
    ".prefs"              : "INI",
    ".properties"         : "INI",
    ".irclog"             : "IRC log",
    ".weechatlog"         : "IRC log",
    ".idr"                : "Idris",
    ".lidr"               : "Idris",
    ".ni"                 : "Inform 7",
    ".i7x"                : "Inform 7",
    ".iss"                : "Inno Setup",
    ".io"                 : "Io",
    ".ik"                 : "Ioke",
    ".thy"                : "Isabelle",
    ".ijs"                : "J",
    ".flex"               : "JFlex",
    ".jflex"              : "JFlex",
    ".json"               : "JSON",
    ".lock"               : "JSON",
    ".json5"              : "JSON5",
    ".jsonld"             : "JSONLD",
    ".jq"                 : "JSONiq",
    ".jade"               : "Jade",
    ".j"                  : "Objective-J",
    ".java"               : "Java",
    ".jsp"                : "Java Server Pages",
    ".js"                 : "JavaScript",
    "._js"                : "JavaScript",
    ".bones"              : "JavaScript",
    ".es6"                : "JavaScript",
    ".jake"               : "JavaScript",
    ".jsb"                : "JavaScript",
    ".jsfl"               : "JavaScript",
    ".jsm"                : "JavaScript",
    ".jss"                : "JavaScript",
    ".jsx"                : "JavaScript",
    ".njs"                : "JavaScript",
    ".pac"                : "JavaScript",
    ".sjs"                : "JavaScript",
    ".ssjs"               : "JavaScript",
    ".sublime-build"      : "JavaScript",
    ".sublime-commands"   : "JavaScript",
    ".sublime-completions": "JavaScript",
    ".sublime-keymap"     : "JavaScript",
    ".sublime-macro"      : "JavaScript",
    ".sublime-menu"       : "JavaScript",
    ".sublime-mousemap"   : "JavaScript",
    ".sublime-project"    : "JavaScript",
    ".sublime-settings"   : "JavaScript",
    ".sublime-theme"      : "JavaScript",
    ".sublime-workspace"  : "JavaScript",
    ".sublime_metrics"    : "JavaScript",
    ".sublime_session"    : "JavaScript",
    ".xsjs"               : "JavaScript",
    ".xsjslib"            : "JavaScript",
    ".jl"                 : "Julia",
    ".krl"                : "KRL",
    ".kicad_pcb"          : "KiCad",
    ".kit"                : "Kit",
    ".kt"                 : "Kotlin",
    ".ktm"                : "Kotlin",
    ".kts"                : "Kotlin",
    ".lfe"                : "LFE",
    ".ll"                 : "LLVM",
    ".lol"                : "LOLCODE",
    ".lsl"                : "LSL",
    ".lvproj"             : "LabVIEW",
    ".lasso"              : "Lasso",
    ".las"                : "Lasso",
    ".lasso8"             : "Lasso",
    ".lasso9"             : "Lasso",
    ".ldml"               : "Lasso",
    ".latte"              : "Latte",
    ".lean"               : "Lean",
    ".hlean"              : "Lean",
    ".less"               : "Less",
    ".lex"                : "Lex",
    ".ly"                 : "LilyPond",
    ".ily"                : "LilyPond",
    ".m"                  : "Objective-C",
    ".ld"                 : "Linker Script",
    ".lds"                : "Linker Script",
    ".liquid"             : "Liquid",
    ".lagda"              : "Literate Agda",
    ".litcoffee"          : "Literate CoffeeScript",
    ".lhs"                : "Literate Haskell",
    ".ls"                 : "LoomScript",
    "._ls"                : "LiveScript",
    ".xm"                 : "Logos",
    ".x"                  : "Logos",
    ".xi"                 : "Logos",
    ".lgt"                : "Logtalk",
    ".logtalk"            : "Logtalk",
    ".lookml"             : "LookML",
    ".lua"                : "Lua",
    ".fcgi"               : "Shell",
    ".nse"                : "Lua",
    ".pd_lua"             : "Lua",
    ".rbxs"               : "Lua",
    ".wlua"               : "Lua",
    ".mumps"              : "M",
    ".mtml"               : "MTML",
    ".muf"                : "MUF",
    ".mak"                : "Makefile",
    ".mk"                 : "Makefile",
    ".mako"               : "Mako",
    ".mao"                : "Mako",
    ".md"                 : "Markdown",
    ".markdown"           : "Markdown",
    ".mkd"                : "Markdown",
    ".mkdn"               : "Markdown",
    ".mkdown"             : "Markdown",
    ".ron"                : "Markdown",
    ".mask"               : "Mask",
    ".mathematica"        : "Mathematica",
    ".cdf"                : "Mathematica",
    ".ma"                 : "Mathematica",
    ".nb"                 : "Mathematica",
    ".nbp"                : "Mathematica",
    ".wl"                 : "Mathematica",
    ".wlt"                : "Mathematica",
    ".matlab"             : "Matlab",
    ".maxpat"             : "Max",
    ".maxhelp"            : "Max",
    ".maxproj"            : "Max",
    ".mxt"                : "Max",
    ".pat"                : "Max",
    ".mediawiki"          : "MediaWiki",
    ".moo"                : "Moocode",
    ".minid"              : "MiniD",
    ".druby"              : "Mirah",
    ".duby"               : "Mirah",
    ".mir"                : "Mirah",
    ".mirah"              : "Mirah",
    ".mo"                 : "Modelica",
    ".mms"                : "Module Management System",
    ".mmk"                : "Module Management System",
    ".monkey"             : "Monkey",
    ".moon"               : "MoonScript",
    ".myt"                : "Myghty",
    ".ncl"                : "Text",
    ".nl"                 : "NewLisp",
    ".nsi"                : "NSIS",
    ".nsh"                : "NSIS",
    ".axs"                : "NetLinx",
    ".axi"                : "NetLinx",
    ".axs.erb"            : "NetLinx+ERB",
    ".axi.erb"            : "NetLinx+ERB",
    ".nlogo"              : "NetLogo",
    ".nginxconf"          : "Nginx",
    ".nim"                : "Nimrod",
    ".nimrod"             : "Nimrod",
    ".ninja"              : "Ninja",
    ".nit"                : "Nit",
    ".nix"                : "Nix",
    ".nu"                 : "Nu",
    ".numpy"              : "NumPy",
    ".numpyw"             : "NumPy",
    ".numsc"              : "NumPy",
    ".ml"                 : "Standard ML",
    ".eliom"              : "OCaml",
    ".eliomi"             : "OCaml",
    ".ml4"                : "OCaml",
    ".mli"                : "OCaml",
    ".mll"                : "OCaml",
    ".mly"                : "OCaml",
    ".objdump"            : "ObjDump",
    ".mm"                 : "XML",
    ".sj"                 : "Objective-J",
    ".omgrofl"            : "Omgrofl",
    ".opa"                : "Opa",
    ".opal"               : "Opal",
    ".opencl"             : "OpenCL",
    ".p"                  : "OpenEdge ABL",
    ".scad"               : "OpenSCAD",
    ".org"                : "Org",
    ".ox"                 : "Ox",
    ".oxh"                : "Ox",
    ".oxo"                : "Ox",
    ".oxygene"            : "Oxygene",
    ".oz"                 : "Oz",
    ".pwn"                : "PAWN",
    ".aw"                 : "PHP",
    ".ctp"                : "PHP",
    ".php3"               : "PHP",
    ".php4"               : "PHP",
    ".php5"               : "PHP",
    ".phpt"               : "PHP",
    ".pls"                : "PLSQL",
    ".pkb"                : "PLSQL",
    ".pks"                : "PLSQL",
    ".plb"                : "PLSQL",
    ".plsql"              : "PLSQL",
    ".sql"                : "SQLPL",
    ".pan"                : "Pan",
    ".psc"                : "Papyrus",
    ".parrot"             : "Parrot",
    ".pasm"               : "Parrot Assembly",
    ".pir"                : "Parrot Internal Representation",
    ".pas"                : "Pascal",
    ".dfm"                : "Pascal",
    ".dpr"                : "Pascal",
    ".lpr"                : "Pascal",
    ".pp"                 : "Puppet",
    ".pl"                 : "Prolog",
    ".al"                 : "Perl",
    ".cgi"                : "Shell",
    ".perl"               : "Perl",
    ".ph"                 : "Perl",
    ".plx"                : "Perl",
    ".pm"                 : "Perl6",
    ".pod"                : "Pod",
    ".psgi"               : "Perl",
    ".t"                  : "Turing",
    ".6pl"                : "Perl6",
    ".6pm"                : "Perl6",
    ".nqp"                : "Perl6",
    ".p6"                 : "Perl6",
    ".p6l"                : "Perl6",
    ".p6m"                : "Perl6",
    ".pl6"                : "Perl6",
    ".pm6"                : "Perl6",
    ".pig"                : "PigLatin",
    ".pike"               : "Pike",
    ".pmod"               : "Pike",
    ".pogo"               : "PogoScript",
    ".ps"                 : "PostScript",
    ".eps"                : "PostScript",
    ".ps1"                : "PowerShell",
    ".psd1"               : "PowerShell",
    ".psm1"               : "PowerShell",
    ".pde"                : "Processing",
    ".prolog"             : "Prolog",
    ".spin"               : "Propeller Spin",
    ".proto"              : "Protocol Buffer",
    ".pub"                : "Public Key",
    ".pd"                 : "Pure Data",
    ".pb"                 : "PureBasic",
    ".pbi"                : "PureBasic",
    ".purs"               : "PureScript",
    ".py"                 : "Python",
    ".gyp"                : "Python",
    ".lmi"                : "Python",
    ".pyde"               : "Python",
    ".pyp"                : "Python",
    ".pyt"                : "Python",
    ".pyw"                : "Python",
    ".tac"                : "Python",
    ".wsgi"               : "Python",
    ".xpy"                : "Python",
    ".pytb"               : "Python traceback",
    ".qml"                : "QML",
    ".qbs"                : "QML",
    ".pri"                : "QMake",
    ".r"                  : "Rebol",
    ".rd"                 : "R",
    ".rsx"                : "R",
    ".raml"               : "RAML",
    ".rdoc"               : "RDoc",
    ".rbbas"              : "REALbasic",
    ".rbfrm"              : "REALbasic",
    ".rbmnu"              : "REALbasic",
    ".rbres"              : "REALbasic",
    ".rbtbar"             : "REALbasic",
    ".rbuistate"          : "REALbasic",
    ".rhtml"              : "RHTML",
    ".rmd"                : "RMarkdown",
    ".rkt"                : "Racket",
    ".rktd"               : "Racket",
    ".rktl"               : "Racket",
    ".scrbl"              : "Racket",
    ".rl"                 : "Ragel in Ruby Host",
    ".raw"                : "Raw token data",
    ".reb"                : "Rebol",
    ".r2"                 : "Rebol",
    ".r3"                 : "Rebol",
    ".rebol"              : "Rebol",
    ".red"                : "Red",
    ".reds"               : "Red",
    ".cw"                 : "Redcode",
    ".rs"                 : "Rust",
    ".rsh"                : "RenderScript",
    ".robot"              : "RobotFramework",
    ".rg"                 : "Rouge",
    ".rb"                 : "Ruby",
    ".builder"            : "Ruby",
    ".gemspec"            : "Ruby",
    ".god"                : "Ruby",
    ".irbrc"              : "Ruby",
    ".jbuilder"           : "Ruby",
    ".mspec"              : "Ruby",
    ".pluginspec"         : "XML",
    ".podspec"            : "Ruby",
    ".rabl"               : "Ruby",
    ".rake"               : "Ruby",
    ".rbuild"             : "Ruby",
    ".rbw"                : "Ruby",
    ".rbx"                : "Ruby",
    ".ru"                 : "Ruby",
    ".ruby"               : "Ruby",
    ".thor"               : "Ruby",
    ".watchr"             : "Ruby",
    ".sas"                : "SAS",
    ".scss"               : "SCSS",
    ".smt2"               : "SMT",
    ".smt"                : "SMT",
    ".sparql"             : "SPARQL",
    ".rq"                 : "SPARQL",
    ".sqf"                : "SQF",
    ".hqf"                : "SQF",
    ".cql"                : "SQL",
    ".ddl"                : "SQL",
    ".prc"                : "SQL",
    ".tab"                : "SQL",
    ".udf"                : "SQL",
    ".viw"                : "SQL",
    ".db2"                : "SQLPL",
    ".ston"               : "STON",
    ".svg"                : "SVG",
    ".sage"               : "Sage",
    ".sagews"             : "Sage",
    ".sls"                : "Scheme",
    ".sass"               : "Sass",
    ".scala"              : "Scala",
    ".sbt"                : "Scala",
    ".sc"                 : "SuperCollider",
    ".scaml"              : "Scaml",
    ".scm"                : "Scheme",
    ".sld"                : "Scheme",
    ".sps"                : "Scheme",
    ".ss"                 : "Scheme",
    ".sci"                : "Scilab",
    ".sce"                : "Scilab",
    ".self"               : "Self",
    ".sh"                 : "Shell",
    ".bash"               : "Shell",
    ".bats"               : "Shell",
    ".command"            : "Shell",
    ".ksh"                : "Shell",
    ".tmux"               : "Shell",
    ".tool"               : "Shell",
    ".zsh"                : "Shell",
    ".sh-session"         : "ShellSession",
    ".shen"               : "Shen",
    ".sl"                 : "Slash",
    ".slim"               : "Slim",
    ".smali"              : "Smali",
    ".tpl"                : "Smarty",
    ".sp"                 : "SourcePawn",
    ".sma"                : "SourcePawn",
    ".nut"                : "Squirrel",
    ".fun"                : "Standard ML",
    ".sig"                : "Standard ML",
    ".sml"                : "Standard ML",
    ".do"                 : "Stata",
    ".ado"                : "Stata",
    ".doh"                : "Stata",
    ".ihlp"               : "Stata",
    ".mata"               : "Stata",
    ".matah"              : "Stata",
    ".sthlp"              : "Stata",
    ".styl"               : "Stylus",
    ".scd"                : "SuperCollider",
    ".swift"              : "Swift",
    ".sv"                 : "SystemVerilog",
    ".svh"                : "SystemVerilog",
    ".vh"                 : "SystemVerilog",
    ".toml"               : "TOML",
    ".txl"                : "TXL",
    ".tcl"                : "Tcl",
    ".adp"                : "Tcl",
    ".tm"                 : "Tcl",
    ".tcsh"               : "Tcsh",
    ".csh"                : "Tcsh",
    ".tex"                : "TeX",
    ".aux"                : "TeX",
    ".bbx"                : "TeX",
    ".bib"                : "TeX",
    ".cbx"                : "TeX",
    ".dtx"                : "TeX",
    ".ins"                : "TeX",
    ".lbx"                : "TeX",
    ".ltx"                : "TeX",
    ".mkii"               : "TeX",
    ".mkiv"               : "TeX",
    ".mkvi"               : "TeX",
    ".sty"                : "TeX",
    ".toc"                : "TeX",
    ".tea"                : "Tea",
    ".txt"                : "Text",
    ".textile"            : "Textile",
    ".thrift"             : "Thrift",
    ".tu"                 : "Turing",
    ".ttl"                : "Turtle",
    ".twig"               : "Twig",
    ".ts"                 : "XML",
    ".upc"                : "Unified Parallel C",
    ".anim"               : "Unity3D Asset",
    ".asset"              : "Unity3D Asset",
    ".mat"                : "Unity3D Asset",
    ".meta"               : "Unity3D Asset",
    ".prefab"             : "Unity3D Asset",
    ".unity"              : "Unity3D Asset",
    ".uc"                 : "UnrealScript",
    ".vcl"                : "VCL",
    ".vhdl"               : "VHDL",
    ".vhd"                : "VHDL",
    ".vhf"                : "VHDL",
    ".vhi"                : "VHDL",
    ".vho"                : "VHDL",
    ".vhs"                : "VHDL",
    ".vht"                : "VHDL",
    ".vhw"                : "VHDL",
    ".vala"               : "Vala",
    ".vapi"               : "Vala",
    ".veo"                : "Verilog",
    ".vim"                : "VimL",
    ".vb"                 : "Visual Basic",
    ".bas"                : "Visual Basic",
    ".frm"                : "Visual Basic",
    ".frx"                : "Visual Basic",
    ".vba"                : "Visual Basic",
    ".vbhtml"             : "Visual Basic",
    ".vbs"                : "Visual Basic",
    ".volt"               : "Volt",
    ".vue"                : "Vue",
    ".owl"                : "Web Ontology Language",
    ".webidl"             : "WebIDL",
    ".xc"                 : "XC",
    ".xml"                : "XML",
    ".ant"                : "XML",
    ".axml"               : "XML",
    ".ccxml"              : "XML",
    ".clixml"             : "XML",
    ".cproject"           : "XML",
    ".csproj"             : "XML",
    ".ct"                 : "XML",
    ".dita"               : "XML",
    ".ditamap"            : "XML",
    ".ditaval"            : "XML",
    ".dll.config"         : "XML",
    ".filters"            : "XML",
    ".fsproj"             : "XML",
    ".fxml"               : "XML",
    ".glade"              : "XML",
    ".grxml"              : "XML",
    ".iml"                : "XML",
    ".ivy"                : "XML",
    ".jelly"              : "XML",
    ".kml"                : "XML",
    ".launch"             : "XML",
    ".mdpolicy"           : "XML",
    ".mxml"               : "XML",
    ".nproj"              : "XML",
    ".nuspec"             : "XML",
    ".odd"                : "XML",
    ".osm"                : "XML",
    ".plist"              : "XML",
    ".ps1xml"             : "XML",
    ".psc1"               : "XML",
    ".pt"                 : "XML",
    ".rdf"                : "XML",
    ".rss"                : "XML",
    ".scxml"              : "XML",
    ".srdf"               : "XML",
    ".storyboard"         : "XML",
    ".sttheme"            : "XML",
    ".sublime-snippet"    : "XML",
    ".targets"            : "XML",
    ".tmcommand"          : "XML",
    ".tml"                : "XML",
    ".tmlanguage"         : "XML",
    ".tmpreferences"      : "XML",
    ".tmsnippet"          : "XML",
    ".tmtheme"            : "XML",
    ".ui"                 : "XML",
    ".urdf"               : "XML",
    ".vbproj"             : "XML",
    ".vcxproj"            : "XML",
    ".vxml"               : "XML",
    ".wsdl"               : "XML",
    ".wsf"                : "XML",
    ".wxi"                : "XML",
    ".wxl"                : "XML",
    ".wxs"                : "XML",
    ".x3d"                : "XML",
    ".xacro"              : "XML",
    ".xaml"               : "XML",
    ".xib"                : "XML",
    ".xlf"                : "XML",
    ".xliff"              : "XML",
    ".xmi"                : "XML",
    ".xml.dist"           : "XML",
    ".xsd"                : "XML",
    ".xul"                : "XML",
    ".zcml"               : "XML",
    ".xsp-config"         : "XPages",
    ".xsp.metadata"       : "XPages",
    ".xpl"                : "XProc",
    ".xproc"              : "XProc",
    ".xquery"             : "XQuery",
    ".xq"                 : "XQuery",
    ".xql"                : "XQuery",
    ".xqm"                : "XQuery",
    ".xqy"                : "XQuery",
    ".xs"                 : "XS",
    ".xslt"               : "XSLT",
    ".xsl"                : "XSLT",
    ".xojo_code"          : "Xojo",
    ".xojo_menu"          : "Xojo",
    ".xojo_report"        : "Xojo",
    ".xojo_script"        : "Xojo",
    ".xojo_toolbar"       : "Xojo",
    ".xojo_window"        : "Xojo",
    ".xtend"              : "Xtend",
    ".yml"                : "YAML",
    ".reek"               : "YAML",
    ".rviz"               : "YAML",
    ".syntax"             : "YAML",
    ".yaml"               : "YAML",
    ".yaml-tmlanguage"    : "YAML",
    ".y"                  : "Yacc",
    ".yacc"               : "Yacc",
    ".yy"                 : "Yacc",
    ".zep"                : "Zephir",
    ".zimpl"              : "Zimpl",
    ".zmpl"               : "Zimpl",
    ".zpl"                : "Zimpl",
    ".desktop"            : "desktop",
    ".desktop.in"         : "desktop",
    ".ec"                 : "eC",
    ".eh"                 : "eC",
    ".edn"                : "edn",
    ".fish"               : "fish",
    ".mu"                 : "mupad",
    ".nc"                 : "nesC",
    ".ooc"                : "ooc",
    ".rst"                : "reStructuredText",
    ".rest"               : "reStructuredText",
    ".wisp"               : "wisp",
    ".prg"                : "xBase",
    ".prw"                : "xBase"
}

const programs : Record <string, string> = {
    "osascript"  : "AppleScript",
    "awk"        : "Awk",
    "gawk"       : "Awk",
    "mawk"       : "Awk",
    "nawk"       : "Awk",
    "tcc"        : "C",
    "coffee"     : "CoffeeScript",
    "lisp"       : "Common Lisp",
    "sbcl"       : "Common Lisp",
    "ccl"        : "Common Lisp",
    "clisp"      : "Common Lisp",
    "ecl"        : "Common Lisp",
    "crystal"    : "Crystal",
    "dtrace"     : "DTrace",
    "escript"    : "Erlang",
    "gnuplot"    : "Gnuplot",
    "groovy"     : "Groovy",
    "ioke"       : "Ioke",
    "node"       : "JavaScript",
    "lsl"        : "LSL",
    "lua"        : "Lua",
    "make"       : "Makefile",
    "mmi"        : "Mercury",
    "moon"       : "MoonScript",
    "newlisp"    : "NewLisp",
    "nush"       : "Nu",
    "ocaml"      : "OCaml",
    "ocamlrun"   : "OCaml",
    "php"        : "PHP",
    "parrot"     : "Parrot Internal Representation",
    "perl"       : "Perl",
    "perl6"      : "Perl6",
    "picolisp"   : "PicoLisp",
    "pil"        : "PicoLisp",
    "pike"       : "Pike",
    "swipl"      : "Prolog",
    "python"     : "Python",
    "python2"    : "Python",
    "python3"    : "Python",
    "qmake"      : "QMake",
    "Rscript"    : "R",
    "racket"     : "Racket",
    "ruby"       : "Ruby",
    "macruby"    : "Ruby",
    "rake"       : "Ruby",
    "jruby"      : "Ruby",
    "rbx"        : "Ruby",
    "boolector"  : "SMT",
    "cvc4"       : "SMT",
    "mathsat5"   : "SMT",
    "opensmt"    : "SMT",
    "smtinterpol": "SMT",
    "smt-rat"    : "SMT",
    "stp"        : "SMT",
    "verit"      : "SMT",
    "yices2"     : "SMT",
    "z3"         : "SMT",
    "scala"      : "Scala",
    "guile"      : "Scheme",
    "bigloo"     : "Scheme",
    "chicken"    : "Scheme",
    "bash"       : "Shell",
    "rc"         : "Shell",
    "sh"         : "Shell",
    "zsh"        : "Shell",
    "tclsh"      : "Tcl",
    "wish"       : "Tcl"
}
