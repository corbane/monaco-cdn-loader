
import * as MonacoLoader from "monaco-cdn-loader"

const filepath = "./index.ts"
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
