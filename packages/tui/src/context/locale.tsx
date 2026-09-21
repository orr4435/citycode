import { createMemo } from "solid-js"
import { createStore } from "solid-js/store"
import { createSimpleContext } from "./helper"
import { useKV } from "./kv"
import { useTuiConfig } from "../config"
import {
  BRAND,
  BRAND_PARTS,
  DEFAULT_LOCALE,
  isRtlLocale,
  LOCALES,
  LOCALE_LABEL,
  translate,
  type Locale,
} from "../i18n/strings"
import { toVisualRtl } from "../i18n/bidi"

export { BRAND, BRAND_PARTS, LOCALES, LOCALE_LABEL, type Locale }

const KV_LANGUAGE = "language"

export const { use: useLocale, provider: LocaleProvider } = createSimpleContext({
  name: "Locale",
  init: () => {
    const kv = useKV()
    const config = useTuiConfig()

    const initial: Locale = LOCALES.includes(config.language as Locale)
      ? (config.language as Locale)
      : LOCALES.includes(kv.get(KV_LANGUAGE) as Locale)
        ? (kv.get(KV_LANGUAGE) as Locale)
        : DEFAULT_LOCALE

    const [store, setStore] = createStore<{ locale: Locale }>({ locale: initial })

    const brand = createMemo(() => BRAND[store.locale])
    const brandParts = createMemo(() => BRAND_PARTS[store.locale])
    const rtl = createMemo(() => isRtlLocale(store.locale))
    // Two-tone brand mark (muted + bold word) in the order/orientation opentui should
    // draw them so a right-to-left reader sees the words in the correct sequence.
    const brandPartsVisual = createMemo(() => {
      const [muted, bold] = brandParts()
      if (!rtl()) return [{ text: muted, bold: false }, { text: bold, bold: true }] as const
      return [
        { text: toVisualRtl(bold), bold: true },
        { text: toVisualRtl(muted), bold: false },
      ] as const
    })

    return {
      get locale() {
        return store.locale
      },
      rtl,
      brand,
      brandParts,
      brandPartsVisual,
      set(next: Locale) {
        setStore("locale", next)
        kv.set(KV_LANGUAGE, next)
      },
      // Raw, logically-ordered translation. Use for anything that goes through a
      // bidi-aware OS text path (terminal window title, desktop notifications) — those
      // reorder RTL text themselves, so pre-reordering here would double-flip it.
      t(key: Parameters<typeof translate>[1], ...args: string[]) {
        return translate(store.locale, key, ...args)
      },
      // Visual-order translation for opentui's own <text>/<span> grid rendering, which
      // does not do bidi shaping. Use this for anything drawn inside the app's own UI.
      tv(key: Parameters<typeof translate>[1], ...args: string[]) {
        return toVisualRtl(translate(store.locale, key, ...args))
      },
      // Reorders an arbitrary string (e.g. chat content, a brand fragment) for display
      // in the app's own grid-rendered UI. Safe to call unconditionally: text with no
      // RTL characters passes through unchanged, so this doesn't need to be gated on
      // the current app locale — a Hebrew-typed message should display correctly even
      // if the UI language is set to English.
      visual(text: string) {
        return toVisualRtl(text)
      },
    }
  },
})
