import type { TuiPlugin } from "@opencode-ai/plugin/tui"
import type { BuiltinTuiPlugin } from "../builtins"

const id = "internal:simple-mode"
export const KV_SIMPLE_MODE = "simple_mode"

const tui: TuiPlugin = async (api) => {
  api.keymap.registerLayer({
    commands: [
      {
        name: "appearance.simple_mode.toggle",
        title: "Toggle simple mode (hide advanced panels)",
        category: "System",
        namespace: "palette",
        run() {
          const next = !api.kv.get(KV_SIMPLE_MODE, false)
          api.kv.set(KV_SIMPLE_MODE, next)
          api.ui.toast({
            variant: "info",
            message: next
              ? "Simple mode on — LSP, MCP, and todo panels are hidden"
              : "Simple mode off — advanced panels restored",
          })
        },
      },
    ],
    bindings: [],
  })
}

const plugin: BuiltinTuiPlugin = {
  id,
  tui,
}

export default plugin
