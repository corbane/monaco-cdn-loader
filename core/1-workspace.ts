
import * as Languages from "./1-languages.js"

type None = null|undefined
type ICodeEditor     = monaco.editor.IStandaloneCodeEditor
type ITextModel      = monaco.editor.ITextModel
type Uri             = monaco.Uri

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
        lang = lang || Languages.fromExtenstion (path)

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
