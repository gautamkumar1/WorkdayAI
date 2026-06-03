/**
 * Normalize extracted resume text: fix whitespace, remove header/footer artifacts.
 */
export function cleanResumeText(raw: string): string {
  let text = raw

  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Normalize tabs and other horizontal whitespace to spaces
  text = text.replace(/\t/g, ' ')

  // Remove common header/footer patterns
  // Page number variants: "Page 1 of 3", "Page 1", "1 of 3", "- 1 -"
  text = text.replace(/\bPage\s+\d+\s+of\s+\d+\b/gi, '')
  text = text.replace(/\bPage\s+\d+\b/gi, '')
  text = text.replace(/\b\d+\s+of\s+\d+\b/g, '')
  text = text.replace(/^[-\s]*\d+[-\s]*$/gm, '')

  // Remove "Confidential" lines (standalone)
  text = text.replace(/^[ \t]*Confidential[ \t]*$/gim, '')

  // Collapse multiple blank lines (3+ newlines → 2)
  text = text.replace(/\n{3,}/g, '\n\n')

  // Trim each line's trailing whitespace
  text = text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')

  // Trim leading/trailing whitespace from the whole text
  return text.trim()
}
