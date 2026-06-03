import { cleanResumeText } from './resumeTextCleaner.js'

/**
 * Extract readable text from a PDF file client-side.
 *
 * pdf-lib is not available in the extension. Instead we read the file as a
 * binary string and pull out all runs of printable ASCII characters that are
 * long enough to be real content. This is a lightweight best-effort approach;
 * the backend /api/resumes/upload path (using pdf-parse) gives better results
 * for complex PDFs.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const raw = await readFileAsBinaryText(file)

  // Extract readable ASCII sequences: words, numbers, punctuation — at least 4 chars
  const matches = raw.match(/[a-zA-Z0-9\s@.,\-:;'"()\[\]\/\\+&!?%#]{4,}/g)
  if (!matches) return ''

  const joined = matches.join(' ')
  return cleanResumeText(joined)
}

function readFileAsBinaryText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result as string)
    }
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'))
    reader.readAsBinaryString(file)
  })
}
