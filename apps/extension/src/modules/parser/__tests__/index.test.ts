import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractResumeText, UnsupportedFileTypeError } from '../index.js';

vi.mock('../pdfExtractor.js', () => ({
  extractTextFromPdf: vi.fn().mockResolvedValue('pdf extracted text'),
}));

vi.mock('../docxExtractor.js', () => ({
  extractTextFromDocx: vi.fn().mockResolvedValue('docx extracted text'),
}));

// Import mocked modules so we can assert on them
import { extractTextFromPdf } from '../pdfExtractor.js';
import { extractTextFromDocx } from '../docxExtractor.js';

function makeFile(name: string, type: string): File {
  return new File(['dummy content'], name, { type });
}

describe('extractResumeText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws UnsupportedFileTypeError for an unsupported MIME type', async () => {
    const file = makeFile('resume.txt', 'text/plain');
    await expect(extractResumeText(file)).rejects.toBeInstanceOf(
      UnsupportedFileTypeError
    );
  });

  it('throws UnsupportedFileTypeError for an unknown extension with no MIME type', async () => {
    const file = makeFile('resume.rtf', '');
    await expect(extractResumeText(file)).rejects.toBeInstanceOf(
      UnsupportedFileTypeError
    );
  });

  it('routes a PDF MIME type to extractTextFromPdf', async () => {
    const file = makeFile('resume.pdf', 'application/pdf');
    const result = await extractResumeText(file);
    expect(extractTextFromPdf).toHaveBeenCalledWith(file);
    expect(extractTextFromDocx).not.toHaveBeenCalled();
    expect(result).toBe('pdf extracted text');
  });

  it('routes a .pdf extension (no MIME) to extractTextFromPdf', async () => {
    const file = makeFile('resume.pdf', '');
    await extractResumeText(file);
    expect(extractTextFromPdf).toHaveBeenCalledWith(file);
  });

  it('routes a DOCX MIME type to extractTextFromDocx', async () => {
    const file = makeFile(
      'resume.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    const result = await extractResumeText(file);
    expect(extractTextFromDocx).toHaveBeenCalledWith(file);
    expect(extractTextFromPdf).not.toHaveBeenCalled();
    expect(result).toBe('docx extracted text');
  });

  it('routes a .docx extension (no MIME) to extractTextFromDocx', async () => {
    const file = makeFile('resume.docx', '');
    await extractResumeText(file);
    expect(extractTextFromDocx).toHaveBeenCalledWith(file);
  });
});
