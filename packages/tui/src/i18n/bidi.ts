// opentui's grid renderer draws each character in logical string order with no bidi
// reordering (it has no concept of text direction — see Yoga's flex `direction`, which
// only mirrors layout, not glyph order). Hebrew/Arabic text therefore comes out mirrored
// unless we pre-reorder it into "visual order" ourselves before handing it to <text>.
//
// This implements a simplified, single-level version of the Unicode Bidirectional
// Algorithm (UAX #9), at word granularity: split into runs of RTL-containing vs
// LTR-only words, reverse the run order (base paragraph direction is RTL), and reverse
// the word order + each word's own characters within RTL runs, while LTR runs (an
// English phrase, a URL, a command) keep both their word order and each word's spelling
// untouched. This covers flat sentences/paragraphs with at most one level of embedding.

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

// Groups consecutive items into RTL/LTR runs, reverses run order, and reverses the
// order + content of items within RTL runs only. LTR runs keep both their internal
// item order and each item's own content untouched.
function reorderBidiRuns<T>(items: T[], isRtl: (item: T) => boolean, reverseUnit: (item: T) => T): T[] {
  const runs: { rtl: boolean; items: T[] }[] = []
  for (const item of items) {
    const rtl = isRtl(item)
    const last = runs[runs.length - 1]
    if (last && last.rtl === rtl) last.items.push(item)
    else runs.push({ rtl, items: [item] })
  }

  return runs
    .reverse()
    .flatMap((run) => (run.rtl ? run.items.slice().reverse().map(reverseUnit) : run.items))
}

// Word-level, not character-level: a space between two runs doesn't "belong" to
// either side, so classifying and reordering individual characters (with the space
// carried along by whichever run happened to come first) leaves the separating space
// stranded on the wrong side once run order is reversed — it can end up glued to the
// wrong neighbor or vanish between two reordered runs entirely. Tokenizing by word
// sidesteps this: each run is reassembled by joining its words with a fresh single
// space, and runs are joined the same way, so a separator always exists exactly once
// at every boundary regardless of how the runs get reordered.
export function toVisualRtl(text: string): string {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return text

  const tagged = words.map((word) => ({ word, rtl: containsRtl(word) }))
  const reordered = reorderBidiRuns(
    tagged,
    (w) => w.rtl,
    (w) => ({ ...w, word: Array.from(w.word).reverse().join("") }),
  )

  return reordered.map((w) => w.word).join(" ")
}

// A line counts as "plain prose" if it has no inline markdown syntax markers. opentui's
// markdown renderer hands the raw source straight to a tree-sitter syntax highlighter
// (it does not build a separate styled-node tree we could safely reorder after the
// fact), so reordering characters is only safe where there's no markup to disturb —
// bold/italic/strikethrough markers, links, inline code, or escapes.
const INLINE_MARKDOWN_RE = /[*_~`[\]\\]/

function isPlainProseLine(line: string): boolean {
  return !INLINE_MARKDOWN_RE.test(line)
}

// Matches a leading heading marker (# through ######) or list marker (-, *, +, or an
// ordered "1." / "1)") so it can be preserved exactly while only the text after it
// gets bidi-corrected.
const BLOCK_PREFIX_RE = /^(#{1,6}[ \t]+|[-*+][ \t]+|\d+[.)][ \t]+)/

// Bidi-corrects the raw markdown source of a single block (paragraph, heading, or list
// item), in place at the text level, before opentui ever sees it — so opentui's normal
// parsing, syntax highlighting and layout all run unchanged, just on already-corrected
// text. Only lines that are plain prose (no markdown syntax) and contain RTL characters
// are touched; a heading's `#` or a list item's bullet/number marker is preserved
// exactly. Lines with inline formatting (bold, links, code spans) are left as-is rather
// than risk corrupting the syntax.
export function correctMarkdownRaw(raw: string): string {
  const prefixMatch = raw.match(BLOCK_PREFIX_RE)
  const prefix = prefixMatch ? prefixMatch[1] : ""
  const body = raw.slice(prefix.length)

  const corrected = body
    .split("\n")
    .map((line) => (isPlainProseLine(line) && containsRtl(line) ? toVisualRtl(line) : line))
    .join("\n")

  return prefix + corrected
}
