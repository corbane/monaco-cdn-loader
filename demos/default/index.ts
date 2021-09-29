//@ts-check

import * as Monaco from "monaco-cdn-loader"
import * as Dat from "./libs/dat.gui.module.js"

document.addEventListener ("DOMContentLoaded", () =>
{
    Monaco.initialize (null, null, "fr").then (intialize)
})

function intialize ()
{
    new View ()
}

class View
{
    model
    editor
    workspace

    constructor ()
    {
        this.model = {
            /** @type {"vs"|"vs-dark"|"hc-black"} */
            editorTheme: "vs",
            codeLanguage: "markdown"
        }

        this.editor = monaco.editor.create (
            document.getElementById ("editor"), {
                automaticLayout: true,
            }
        )

        this.workspace = new Monaco.Workspace ()

        monaco.editor.createModel ("", )

        const gui = new  Dat.GUI ({ autoPlace: false, closeOnTop: false })

        gui.add (this.model, "editorTheme")
            .options (["vs", "vs-dark", "hc-black"])
            .onFinishChange (() => this.editor.updateOptions ({ theme: this.model.editorTheme }))

        gui.add (this.model, "codeLanguage")
            .options (monaco.languages.getLanguages ().map (l => l.id).sort ())
            .onFinishChange (lang => this.loadFile ("./samples/sample." + lang + ".txt", lang) )

        const guiContainer = document.createElement ("div")
        guiContainer.style.position   = "relative"
        gui.domElement.style.position = "absolute"
        gui.domElement.style.bottom   = "20px" // 20px is the height of the close buttom.
        gui.domElement.style.right    = "0"

        document.body.appendChild (guiContainer.appendChild (gui.domElement))
    }

    /**
     * @param {string} path
     * @param {string} lang 
     */
    async loadFile (path, lang)
    {
        try
        {
            const rep = await fetch(path)
            var model = this.workspace.get(path)
            if (model == null)
            {
                if (rep.ok === false)
                    throw "Cannot load the file: \"" + path + "\"\n"
                this.workspace.set(path, await rep.text(), lang)
                model = this.workspace.get(path)
            }
            this.editor.setModel(model)
        } catch (err)
        {
            this.workspace.set("<ERROR>", '' + err, "text")
            this.editor.setModel(this.workspace.get("<ERROR>"))
        }

    }
}
