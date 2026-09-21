import { RGBA, TextAttributes } from "@opentui/core"
import { For, Show, type JSX } from "solid-js"
import { tint, useTheme } from "../context/theme"
import { logo } from "../logo"
import { useLocale } from "../context/locale"

// The splash logo is hand-drawn block-art Latin lettering, so it has no Hebrew
// equivalent glyphs. Non-Latin locales fall back to a plain styled text banner.
function LocalizedLogo() {
  const { theme } = useTheme()
  const locale = useLocale()

  return (
    <box alignItems="center">
      <text attributes={TextAttributes.BOLD}>
        <span style={{ fg: locale.brandPartsVisual()[0].bold ? theme.text : theme.textMuted }}>
          {locale.brandPartsVisual()[0].text}
        </span>
        <span> </span>
        <span style={{ fg: locale.brandPartsVisual()[1].bold ? theme.text : theme.textMuted }}>
          {locale.brandPartsVisual()[1].text}
        </span>
      </text>
    </box>
  )
}

export function Logo() {
  const { theme } = useTheme()
  const locale = useLocale()

  const renderLine = (line: string, fg: RGBA, bold: boolean): JSX.Element[] => {
    const shadow = tint(theme.background, fg, 0.25)
    const attrs = bold ? TextAttributes.BOLD : undefined
    return Array.from(line).map((char) => {
      if (char === "_") {
        return (
          <text fg={fg} bg={shadow} attributes={attrs} selectable={false}>
            {" "}
          </text>
        )
      }
      if (char === "^") {
        return (
          <text fg={fg} bg={shadow} attributes={attrs} selectable={false}>
            ▀
          </text>
        )
      }
      if (char === "~") {
        return (
          <text fg={shadow} attributes={attrs} selectable={false}>
            ▀
          </text>
        )
      }
      if (char === ",") {
        return (
          <text fg={shadow} attributes={attrs} selectable={false}>
            ▄
          </text>
        )
      }
      return (
        <text fg={fg} attributes={attrs} selectable={false}>
          {char}
        </text>
      )
    })
  }

  return (
    <Show when={locale.locale === "en"} fallback={<LocalizedLogo />}>
      <box>
        <For each={logo.left}>
          {(line, index) => (
            <box flexDirection="row" gap={1}>
              <box flexDirection="row">{renderLine(line, theme.textMuted, false)}</box>
              <box flexDirection="row">{renderLine(logo.right[index()], theme.text, true)}</box>
            </box>
          )}
        </For>
      </box>
    </Show>
  )
}
