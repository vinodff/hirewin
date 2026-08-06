import { describe, it, expect } from 'vitest';
import PDFDocument from 'pdfkit';
import { parsePdf } from '@/lib/pdf-parser';

const SENTINEL = 'Vinod Kondeti Software Engineer';

/** A PDF shaped like the resumes this app hands users to download. */
function makePdf(): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.text(SENTINEL);
    doc.end();
  });
}

describe('parsePdf', () => {
  // Under 4096 bytes Node clones the Buffer out of its shared pool, which used to
  // shift every xref offset and fail with "bad XRef entry" / "Illegal character".
  it('reads a PDF small enough to be pool-allocated', async () => {
    const pdf = await makePdf();
    expect(pdf.length).toBeLessThan(4096);
    expect(await parsePdf(pdf)).toContain(SENTINEL);
  });

  it('reads a PDF too large to be pool-allocated', async () => {
    const pdf = Buffer.concat([await makePdf(), Buffer.alloc(0)]);
    const padded = Buffer.concat([pdf, Buffer.from('\n'.repeat(5000))]);
    expect(padded.length).toBeGreaterThan(4096);
    expect(await parsePdf(padded)).toContain(SENTINEL);
  });

  it('reports a readable error when the file is not a PDF at all', async () => {
    await expect(parsePdf(Buffer.from('not a pdf'))).rejects.toThrow(/Couldn't read this PDF/);
  });
});
