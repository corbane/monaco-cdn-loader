
## Pour créer un éditeur de code rapidement:

Dans votre dossier projet:

Executer la commande `yarn add https://github.com/corbane/monaco-cdn-loader/releases/download/2.1.0/monaco-cdn-loader-v2.1.0.tgz --modules-folder ./libs`.

Ajouter un le fichier de script `index.js`

```js
//@ts-check

import * as MonacoLoader from "../libs/monaco-cdn-loader/index.js"

const filepath = "./doc.md"
var content = ''

MonacoLoader.initialize ()
.then (
    () => fetch (filepath)
          .then (response => response.text ())
          .then (content  => content = content)
)
.catch
(
    reason => content =  'Cannot load the file: ' + filepath + "\n" + reason
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
        workspace.set (filepath, content, "markdown")

        editor.setModel (workspace.get (filepath))
    }
)
```
