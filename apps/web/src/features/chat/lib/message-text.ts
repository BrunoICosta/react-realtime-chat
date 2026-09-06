export type TextPart =
  { kind: 'text'; value: string } | { kind: 'link'; value: string; href: string }

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/gi

/** Splits a message into plain text and http(s) links (rendered as safe anchors, no HTML). */
export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = []
  let lastIndex = 0
  for (const match of text.matchAll(URL_PATTERN)) {
    const index = match.index
    if (index > lastIndex) parts.push({ kind: 'text', value: text.slice(lastIndex, index) })
    parts.push({ kind: 'link', value: match[0], href: match[0] })
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) parts.push({ kind: 'text', value: text.slice(lastIndex) })
  return parts
}

const EMOJI_ONLY =
  /^(?:\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|\p{Emoji_Modifier})*\s*){1,3}$/u

/** Messages made of 1 to 3 emojis are rendered bigger, like in most messengers. */
export function isEmojiOnly(text: string): boolean {
  return EMOJI_ONLY.test(text.trim())
}
