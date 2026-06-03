import { cleanResumeText } from './resumeTextCleaner.js';

/**
 * Extract readable text from a DOCX file client-side.
 *
 * DOCX files are ZIP archives. The main text is in word/document.xml.
 * Without a ZIP library we decode the ArrayBuffer as UTF-8 (most DOCX XML
 * content survives this), strip XML tags, decode XML entities, and clean up.
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  const buffer = await readFileAsArrayBuffer(file);
  const raw = new TextDecoder('utf-8', { fatal: false }).decode(buffer);

  // Strip XML tags
  const stripped = raw.replace(/<[^>]+>/g, ' ');

  // Decode common XML entities
  const decoded = decodeXmlEntities(stripped);

  return cleanResumeText(decoded);
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(parseInt(code, 10))
    );
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsArrayBuffer(file);
  });
}
