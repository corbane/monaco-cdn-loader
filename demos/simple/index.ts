/*/
    Executer la commande:
    `yarn add https://github.com/corbane/monaco-cdn-loader/releases/download/2.1.0/monaco-cdn-loader-v2.1.0.tgz --modules-folder ./libs`.

    Ajouter un le fichier de script `index.js`
/*/

//@ts-check

import * as MonacoLoader from "monaco-cdn-loader"

const filepath = "./index.js"
var content = ''

MonacoLoader.initialize ()
.then
(
    () => fetch (filepath)
          .then (reply => reply.text ())
          .then (text  => content = text)
          .catch (
              reason => content =  'Cannot load the file: ' + filepath + "\n" + reason
          )
)
.finally
(
    () => {
        const editor = monaco.editor.create
        (
            document.getElementById ("editor"), {
                automaticLayout: true,
            }
        )

        const workspace = new MonacoLoader.Workspace ()
        workspace.set (filepath, content, "javascript")

        editor.setModel (workspace.get (filepath))
    }
)
