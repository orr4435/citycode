export type Locale = "en" | "he"

export const LOCALES: Locale[] = ["en", "he"]

// The app UI defaults to English. Hebrew input support (the live corrected preview
// and the faded raw textarea) is content-triggered independent of this setting, so
// typing Hebrew still works correctly even with the UI itself in English. Users can
// still switch the UI language explicitly via /language.
export const DEFAULT_LOCALE: Locale = "en"

export const RTL_LOCALES: ReadonlySet<Locale> = new Set(["he"])

export function isRtlLocale(locale: Locale): boolean {
  return RTL_LOCALES.has(locale)
}

export const LOCALE_LABEL: Record<Locale, string> = {
  en: "English",
  he: "עברית (Hebrew)",
}

// Terminal emulators generally do not implement the Unicode Bidirectional
// Algorithm, so we translate strings but keep panel layout left-to-right.
export const BRAND: Record<Locale, string> = {
  en: "CODE-CAL",
  he: "קוד קל",
}

// [muted part, bold part] for two-tone brand marks (e.g. the sidebar footer)
export const BRAND_PARTS: Record<Locale, [string, string]> = {
  en: ["CODE-", "CAL"],
  he: ["קוד", "קל"],
}

type StringKey =
  | "app.terminal_title"
  | "app.update_complete"
  | "sidebar.footer.free_models"
  | "permission.restart.until"
  | "permission.restart.patterns"
  | "permission.feedback"
  | "tips.prevent_reading"
  | "tips.headless"

type StringValue = string | ((...args: string[]) => string)

export const strings: Record<Locale, Partial<Record<StringKey, StringValue>>> = {
  en: {
    "app.terminal_title": BRAND.en,
    "app.update_complete": (version: string) =>
      `Successfully updated to ${BRAND.en} v${version}. Please restart the application.`,
    "sidebar.footer.free_models": `${BRAND.en} includes free models so you can start immediately.`,
    "permission.restart.until": (permission: string) => `This will allow ${permission} until ${BRAND.en} is restarted.`,
    "permission.restart.patterns": `This will allow the following patterns until ${BRAND.en} is restarted`,
    "permission.feedback": `Tell ${BRAND.en} what to do differently`,
    "tips.prevent_reading": `Create a plugin to prevent ${BRAND.en} from reading sensitive files`,
    "tips.headless": `Run {highlight}opencode serve{/highlight} for headless API access to ${BRAND.en}`,
  },
  he: {
    "app.terminal_title": BRAND.he,
    "app.update_complete": (version: string) => `העדכון ל${BRAND.he} גרסה ${version} הושלם. יש להפעיל מחדש את האפליקציה.`,
    "sidebar.footer.free_models": `${BRAND.he} כולל מודלים חינמיים כדי שתוכלו להתחיל מיד.`,
    "permission.restart.until": (permission: string) => `הפעולה ${permission} תותר עד להפעלה מחדש של ${BRAND.he}.`,
    "permission.restart.patterns": `הדפוסים הבאים יותרו עד להפעלה מחדש של ${BRAND.he}`,
    "permission.feedback": `ספרו ל${BRAND.he} מה לעשות אחרת`,
    "tips.prevent_reading": `צרו תוסף כדי למנוע מ${BRAND.he} לקרוא קבצים רגישים`,
    "tips.headless": `הריצו {highlight}opencode serve{/highlight} לגישת API ללא ממשק אל ${BRAND.he}`,
  },
}

export function translate(locale: Locale, key: StringKey, ...args: string[]): string {
  const value = strings[locale]?.[key] ?? strings.en[key]
  if (value === undefined) return key
  return typeof value === "function" ? value(...args) : value
}
