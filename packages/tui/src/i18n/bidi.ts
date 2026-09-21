// opentui draws text one cell at a time, left to right, in the order of the string. It has
// no idea about text direction, so Hebrew/Arabic comes out mirrored. We work around that
// by converting text into *visual order* ourselves before handing it to opentui, using a
// real implementation of the Unicode Bidirectional Algorithm (bidi-js) rather than a
// hand-rolled approximation. That gets numbers, punctuation, brackets and mixed
// Hebrew/English right.
//
// Two things matter beyond the ordering itself:
//  - Wrapping must happen *before* reordering. Each visual row of a wrapped paragraph has
//    to be reordered on its own, otherwise the rows read bottom-to-top.
//  - It has to be applied to the full text before it reaches opentui, so it survives
//    streaming re-renders (opentui re-parses the whole source on every update).

import bidiFactory from "bidi-js"

const bidi = bidiFactory()

const NBSP = " "
// Stand-in for anything that must be treated as one opaque, direction-neutral unit
// (emoji, markdown links). Its real text is kept in `Cell.out`.
const OBJECT = "￼"

function isRtlChar(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0
  return (code >= 0x0590 && code <= 0x05ff) || (code >= 0x0600 && code <= 0x06ff) || (code >= 0xfb1d && code <= 0xfdff)
}

export function containsRtl(text: string): boolean {
  for (const ch of text) {
    if (isRtlChar(ch)) return true
  }
  return false
}

// Terminal cell width of a single code point.
function cellWidth(cp: string): number {
  const code = cp.codePointAt(0) ?? 0
  if (code >= 0x0591 && code <= 0x05c7) return 0 // Hebrew points
  if (code >= 0x0300 && code <= 0x036f) return 0 // combining marks
  if (code >= 0x200b && code <= 0x200f) return 0 // zero-width / direction marks
  if (
    code >= 0x1100 &&
    (code <= 0x115f ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x1f300 && code <= 0x1faff) ||
      (code >= 0x20000 && code <= 0x3fffd))
  )
    return 2
  return 1
}

type Cell = { out: string; w: number }
type Options = {
  // Markdown emphasis/code markers are hidden by opentui when `conceal` is on, so they
  // take no space on screen.
  conceal?: boolean
}

const LINK = /!?\[[^\]\n]*\]\([^)\n]*\)/g

// A markdown link is kept whole (only its visible text is reordered) so the syntax
// `[text](url)` survives.
function linkAtom(link: string): string {
  const match = link.match(/^(!?\[)([^\]]*)(\]\(.*\))$/)
  if (!match) return link
  return match[1] + visualLine(match[2]) + match[3]
}

function toCells(text: string, options: Options = {}) {
  const cells: Cell[] = []
  let safe = ""
  const pushText = (part: string) => {
    for (const cp of part) {
      const hidden = options.conceal && (cp === "*" || cp === "`" || cp === "~")
      cells.push({ out: cp, w: hidden ? 0 : cellWidth(cp) })
      safe += cp.length === 1 ? cp : OBJECT
    }
  }
  let last = 0
  for (const match of text.matchAll(LINK)) {
    pushText(text.slice(last, match.index))
    const out = linkAtom(match[0])
    cells.push({ out, w: Array.from(out).reduce((sum, cp) => sum + cellWidth(cp), 0) })
    safe += OBJECT
    last = match.index + match[0].length
  }
  pushText(text.slice(last))
  return { cells, safe }
}

// Base paragraph direction. Real Hebrew text is full of English identifiers and file
// names, so "first strong character wins" flips too easily; use the proportion instead,
// leaning towards RTL as soon as a fair share of the letters are Hebrew.
function baseDirection(text: string): "ltr" | "rtl" {
  let rtl = 0
  let ltr = 0
  for (const ch of text) {
    if (isRtlChar(ch)) rtl++
    else if (/\p{L}/u.test(ch)) ltr++
  }
  return rtl > 0 && rtl * 4 >= ltr ? "rtl" : "ltr"
}

function renderRange(
  cells: Cell[],
  safe: string,
  levels: ReturnType<typeof bidi.getEmbeddingLevels>,
  start: number,
  end: number,
) {
  // bidi-js returns the indices for the whole string with only [start, end] reordered.
  const all = bidi.getReorderedIndices(safe, levels, start, end)
  const order = all.length === end - start + 1 ? all : all.slice(start, end + 1)
  const mirrored = bidi.getMirroredCharactersMap(safe, levels.levels, start, end)
  let out = ""
  let width = 0
  for (const index of order) {
    out += mirrored.get(index) ?? cells[index].out
    width += cells[index].w
  }
  return { out, width }
}

// Reorders one logical line into visual order, without wrapping or alignment.
function visualLine(text: string, options?: Options): string {
  if (!containsRtl(text)) return text
  const { cells, safe } = toCells(text, options)
  const levels = bidi.getEmbeddingLevels(safe, baseDirection(text))
  return renderRange(cells, safe, levels, 0, cells.length - 1).out
}

export function toVisualRtl(text: string): string {
  return visualLine(text)
}

// Greedy word wrap over the logical cells. Returns inclusive [start, end] cell ranges.
function wrapRanges(cells: Cell[], safe: string, width: number): [number, number][] {
  const rows: [number, number][] = []
  let rowStart = -1
  let rowEnd = -1
  let rowWidth = 0
  const isSpace = (index: number) => /\s/.test(safe[index])

  const close = () => {
    if (rowStart >= 0) rows.push([rowStart, rowEnd])
    rowStart = -1
    rowEnd = -1
    rowWidth = 0
  }

  let index = 0
  while (index < cells.length) {
    if (isSpace(index)) {
      index++
      continue
    }
    const wordStart = index
    let wordWidth = 0
    while (index < cells.length && !isSpace(index)) {
      wordWidth += cells[index].w
      index++
    }
    const wordEnd = index - 1

    if (wordWidth > width) {
      // A single word wider than a row: split it by width.
      close()
      let from = wordStart
      let used = 0
      for (let i = wordStart; i <= wordEnd; i++) {
        if (used + cells[i].w > width && i > from) {
          rows.push([from, i - 1])
          from = i
          used = 0
        }
        used += cells[i].w
      }
      rowStart = from
      rowEnd = wordEnd
      rowWidth = used
      continue
    }

    if (rowStart < 0) {
      rowStart = wordStart
      rowEnd = wordEnd
      rowWidth = wordWidth
    } else if (rowWidth + 1 + wordWidth <= width) {
      rowEnd = wordEnd
      rowWidth += 1 + wordWidth
    } else {
      close()
      rowStart = wordStart
      rowEnd = wordEnd
      rowWidth = wordWidth
    }
  }
  close()
  return rows
}

// Wraps one logical line to `width` columns, then reorders each resulting row on its own.
// Rows of a right-to-left paragraph are right-aligned (padded on the left with NBSP,
// which markdown does not treat as indentation).
export function bidiRows(text: string, width: number, align: "start" | "end" = "end", options?: Options): string[] {
  if (!containsRtl(text)) return [text]
  const { cells, safe } = toCells(text, options)
  const direction = baseDirection(text)
  const levels = bidi.getEmbeddingLevels(safe, direction)
  const ranges = wrapRanges(cells, safe, Math.max(1, width))
  if (ranges.length === 0) return [text]

  return ranges.map(([start, end]) => {
    const row = renderRange(cells, safe, levels, start, end)
    if (direction !== "rtl" || align !== "end") return row.out
    // Always at least one NBSP so a row can never start with markdown syntax.
    return NBSP.repeat(Math.max(1, width - row.width)) + row.out
  })
}

// Plain multi-line text (chat messages, previews): every line wrapped and reordered.
export function bidiText(text: string, width: number, align: "start" | "end" = "end", options?: Options): string {
  return text
    .split("\n")
    .flatMap((line) => bidiRows(line, width, align, options))
    .join("\n")
}

const TABLE_ROW = /^\s*\|.*\|\s*$/
const FENCE = /^\s*(`{3,}|~{3,})/
const LINE_PREFIX = /^(\s*(?:>\s?)*)(?:(#{1,6}\s+)|([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?)?/

function splitRow(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim())
}

const isSeparator = (cells: string[]) => cells.every((cell) => /^:?-+:?$/.test(cell))

const swapAlignment = (cell: string) => {
  const left = cell.startsWith(":")
  const right = cell.endsWith(":")
  if (left === right) return cell
  return (right ? ":" : "") + cell.replace(/^:|:$/g, "") + (left ? ":" : "")
}

// Right-to-left table: reorder each cell and mirror the column order so the first
// column ends up on the right.
function rtlTable(rows: string[]): string[] {
  return rows.map((row) => {
    const cells = splitRow(row)
    const mapped = isSeparator(cells) ? cells.map(swapAlignment) : cells.map((cell) => visualLine(cell))
    return "| " + mapped.reverse().join(" | ") + " |"
  })
}

function rtlLine(line: string, width: number, options?: Options): string[] {
  const match = line.match(LINE_PREFIX)!
  const lead = match[1] ?? ""
  const heading = match[2]
  const marker = match[3]
  const task = match[4]
  const body = line.slice(match[0].length)
  const quote = lead.includes(">") ? lead : ""

  if (heading) {
    const prefix = quote + heading
    const rows = bidiRows(body, width - prefix.length, "end", options)
    return rows.map((row, index) => (index === 0 ? prefix + row : quote + row))
  }

  if (marker) {
    // In right-to-left text the bullet/number sits on the right of the item.
    const symbol = task ? (/[xX]/.test(task) ? "☑" : "☐") : /\d/.test(marker) ? Array.from(marker).reverse().join("") : "•"
    const indent = quote ? 0 : lead.length
    const column = Math.max(1, width - quote.length - 2 - indent)
    const rows = bidiRows(body, column, "end", options)
    return rows.map((row, index) => quote + row + (index === 0 ? " " + symbol : ""))
  }

  return bidiRows(body, width - quote.length, "end", options).map((row) => quote + row)
}

// Prepares raw markdown for opentui: every line that contains RTL text is wrapped,
// reordered and right-aligned. Code blocks are left alone, lists/headings/quotes keep
// working, tables are mirrored, and `[links](urls)` stay intact.
export function rtlMarkdown(markdown: string, width: number, options?: Options): string {
  if (!containsRtl(markdown)) return markdown
  const lines = markdown.split("\n")
  const out: string[] = []
  let fence: string | undefined

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]

    const fenceMatch = line.match(FENCE)
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1][0]
      else if (line.trim().startsWith(fence.repeat(3))) fence = undefined
      out.push(line)
      continue
    }
    if (fence) {
      out.push(line)
      continue
    }

    if (TABLE_ROW.test(line)) {
      const block = [line]
      while (index + 1 < lines.length && TABLE_ROW.test(lines[index + 1])) block.push(lines[++index])
      out.push(...(block.some(containsRtl) ? rtlTable(block) : block))
      continue
    }

    if (!containsRtl(line)) {
      out.push(line)
      continue
    }
    out.push(...rtlLine(line, width, options))
  }
  return out.join("\n")
}
