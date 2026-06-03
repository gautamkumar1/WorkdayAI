import { extractTextFromPdf } from './pdfExtractor.js';
import { extractTextFromDocx } from './docxExtractor.js';

export class UnsupportedFileTypeError extends Error {
  constructor(public readonly fileType: string) {
    super(`Unsupported file type: "${fileType}". Only PDF and DOCX are accepted.`);
    this.name = 'UnsupportedFileTypeError';
  }
}

/**
 * Extract resume text from a PDF or DOCX file.
 * Throws UnsupportedFileTypeError for any other file type.
 */
export async function extractResumeText(file: File): Promise<string> {
  const mimeType = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  const isPdf =
    mimeType === 'application/pdf' || (mimeType === '' && ext === 'pdf');

  const isDocx =
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    (mimeType === '' && ext === 'docx');

  if (isPdf) return extractTextFromPdf(file);
  if (isDocx) return extractTextFromDocx(file);

  const label = mimeType || ext || 'unknown';
  throw new UnsupportedFileTypeError(label);
}

export { extractTextFromPdf } from './pdfExtractor.js';
export { extractTextFromDocx } from './docxExtractor.js';
export { cleanResumeText } from './resumeTextCleaner.js';
