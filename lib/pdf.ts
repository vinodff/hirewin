/** Layout knobs we are willing to tighten to keep a resume on one page.
 *  Ordered loosest → tightest. Nothing here goes below 9pt body text or 40pt
 *  margins: a resume that fits only by being unreadable has not been fixed. */
type Style = { margin: number; body: number; header: number; name: number; lineGap: number };

const STYLES: Style[] = [
  { margin: 54, body: 10,  header: 10,  name: 16, lineGap: 1 },
  { margin: 48, body: 9.8, header: 9.8, name: 15, lineGap: 0.6 },
  { margin: 44, body: 9.4, header: 9.4, name: 14, lineGap: 0.3 },
  { margin: 40, body: 9,   header: 9,   name: 14, lineGap: 0 },
];

async function render(resumeText: string, style: Style): Promise<{ buffer: Buffer; pages: number }> {
  const PDFDocument = (await import('pdfkit')).default;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: style.margin, bottom: style.margin, left: style.margin, right: style.margin },
      bufferPages: true, // lets us count pages before the document is flushed
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('error', reject);

    let pages = 1;
    doc.on('pageAdded', () => { pages += 1; });
    doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), pages }));

    const lines = resumeText.split('\n');
    let isFirstLine = true;

    for (const line of lines) {
      const trimmed = line.trimEnd();

      if (isFirstLine && trimmed) {
        // First non-empty line = name
        doc.font('Helvetica-Bold').fontSize(style.name).text(trimmed, { align: 'center' });
        isFirstLine = false;
        continue;
      }

      if (!trimmed) {
        doc.moveDown(style.lineGap > 0 ? 0.3 : 0.2);
        continue;
      }

      // Section headers: ALL CAPS lines
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 2 && !/^\d/.test(trimmed)) {
        doc.moveDown(style.lineGap > 0 ? 0.5 : 0.35);
        doc.font('Helvetica-Bold').fontSize(style.header).text(trimmed.toUpperCase());
        doc.moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.width - doc.page.margins.right, doc.y)
          .stroke('#cccccc');
        doc.moveDown(0.2);
        continue;
      }

      // Bold lines that look like "Company | Role | Date" or "Role at Company | Date"
      // Use pipe or em-dash separator as the structural signal — avoids bolding bullet points
      if (/[|–—]/.test(trimmed) && trimmed.length < 80) {
        doc.font('Helvetica-Bold').fontSize(style.body).text(trimmed);
      } else {
        doc.font('Helvetica').fontSize(style.body).text(trimmed, { lineGap: style.lineGap });
      }
    }

    doc.end();
  });
}

/**
 * Render a resume to PDF.
 *
 * When the content spills just past one page, retry with progressively tighter
 * layout and use the loosest style that fits — a resume with three lines
 * dangling onto page 2 is a formatting bug, not a two-page resume.
 *
 * A genuinely long resume simply won't fit at the tightest style either, so it
 * keeps the default layout and stays multi-page. Nothing is ever truncated.
 */
export async function generatePdf(resumeText: string, name?: string): Promise<Buffer> {
  const [first, ...tighter] = STYLES;
  const base = await render(resumeText, first);
  if (base.pages <= 1) return base.buffer;

  for (const style of tighter) {
    const attempt = await render(resumeText, style);
    if (attempt.pages <= 1) return attempt.buffer;
  }

  return base.buffer;
}

/** Page count for a given resume text at the default layout. Used by tests to
 *  verify the one-page contract end to end. */
export async function pdfPageCount(resumeText: string): Promise<number> {
  const buf = await generatePdf(resumeText);
  // Each page object appears once in the page tree.
  return (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length || 1;
}
