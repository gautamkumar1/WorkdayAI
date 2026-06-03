// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')
import mammoth from 'mammoth'

export async function extractText(buffer: Buffer, mimetype: string): Promise<string> {
  if (mimetype === 'application/pdf') {
    // pdf-parse v2 ships as CJS; call via require to avoid ESM interop issues
    const result = await (pdfParse.default ?? pdfParse)(buffer)
    return (result.text as string).trim()
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword'
  ) {
    const result = await mammoth.extractRawText({ buffer })
    return result.value.trim()
  }

  throw new Error(`Unsupported file type: ${mimetype}`)
}
