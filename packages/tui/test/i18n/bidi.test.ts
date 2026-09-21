import { describe, expect, test } from "bun:test"
import { bidiRows, bidiText, containsRtl, rtlMarkdown, toVisualRtl } from "../../src/i18n/bidi"

const plain = (text: string) => text.replaceAll(" ", "·")

describe("toVisualRtl", () => {
  test("leaves text without RTL characters untouched", () => {
    expect(toVisualRtl("plain English, 123")).toBe("plain English, 123")
    expect(containsRtl("plain English")).toBe(false)
    expect(containsRtl("שלום")).toBe(true)
  })

  test("reverses a Hebrew sentence into visual order", () => {
    expect(toVisualRtl("שלום עולם")).toBe("םלוע םולש")
  })

  test("keeps embedded English in reading order", () => {
    expect(toVisualRtl("שלום world עולם")).toBe("םלוע world םולש")
  })

  test("places numbers and dashes between Hebrew words correctly", () => {
    expect(toVisualRtl("פרק 5 — יש 5 יוזקייסים")).toBe("םיסייקזוי 5 שי — 5 קרפ")
  })

  test("mirrors brackets", () => {
    expect(toVisualRtl("(רווחה + HR) אחרי")).toBe("ירחא (HR + החוור)")
  })
})

describe("bidiRows", () => {
  test("wraps first, then reorders each row so rows read top to bottom", () => {
    const rows = bidiRows("זהו משפט ארוך בעברית שצריך לעבור שורה כמה פעמים", 20).map(plain)
    expect(rows).toEqual(["·תירבעב ךורא טפשמ והז", "·המכ הרוש רובעל ךירצש", "···············םימעפ"])
  })

  test("right-aligns rows and never exceeds the width", () => {
    for (const row of bidiRows("זהו משפט ארוך בעברית שצריך לעבור שורה כמה פעמים", 20)) {
      expect(row.length).toBeLessThanOrEqual(21)
      expect(row.startsWith(" ")).toBe(true)
    }
  })

  test("does not touch text without RTL characters", () => {
    expect(bidiRows("just some long English text here", 10)).toEqual(["just some long English text here"])
  })

  test("start alignment adds no padding", () => {
    expect(bidiRows("שלום עולם", 20, "start")).toEqual(["םלוע םולש"])
  })
})

describe("bidiText", () => {
  test("processes every line independently", () => {
    expect(bidiText("שלום\nhello\nעולם", 20, "start")).toBe("םולש\nhello\nםלוע")
  })
})

describe("rtlMarkdown", () => {
  test("returns markdown without RTL text unchanged", () => {
    const md = "# Title\n\n- item\n\n```ts\nconst a = 1\n```"
    expect(rtlMarkdown(md, 40)).toBe(md)
  })

  test("keeps the heading marker and right-aligns the text", () => {
    expect(plain(rtlMarkdown("## כותרת בעברית", 40))).toBe("## ·························תירבעב תרתוכ")
  })

  test("moves list markers to the right", () => {
    expect(plain(rtlMarkdown("- פריט ראשון ברשימה", 40))).toBe("·····················המישרב ןושאר טירפ •")
    expect(plain(rtlMarkdown("1. ממוספר ראשון", 40))).toBe("··························ןושאר רפסוממ .1")
  })

  test("keeps bold markers, links and inline code intact", () => {
    const out = rtlMarkdown("זוהי פסקה עם **מודגש** וגם [קישור בעברית](https://example.com/x) וקוד `npm run dev` בפנים.", 40)
    expect(out).toContain("**שגדומ**")
    expect(out).toContain("[תירבעב רושיק](https://example.com/x)")
    expect(out).toContain("`npm run dev`")
  })

  test("leaves fenced code blocks alone", () => {
    const md = 'שלום\n\n```ts\nconst x = "שלום"\n```'
    expect(rtlMarkdown(md, 40).endsWith('```ts\nconst x = "שלום"\n```')).toBe(true)
  })

  test("mirrors RTL tables and reorders their cells", () => {
    const md = "| # | יוזקייס |\n|---|---|\n| 1 | סוכן רווחה |"
    expect(rtlMarkdown(md, 40)).toBe("| סייקזוי | # |\n| --- | --- |\n| החוור ןכוס | 1 |")
  })
})
