export async function generatePdf(resumeText: string, name?: string): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 54, bottom: 54, left: 54, right: 54 },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const lines = resumeText.split('\n');
    let isFirstLine = true;

    for (const line of lines) {
      const trimmed = line.trimEnd();

      if (isFirstLine && trimmed) {
        // First non-empty line = name
        doc.font('Helvetica-Bold').fontSize(16).text(trimmed, { align: 'center' });
        isFirstLine = false;
        continue;
      }

      if (!trimmed) {
        doc.moveDown(0.3);
        continue;
      }

      // Section headers: ALL CAPS lines
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 2 && !/^\d/.test(trimmed)) {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fontSize(10).text(trimmed.toUpperCase());
        doc.moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.width - doc.page.margins.right, doc.y)
          .stroke('#cccccc');
        doc.moveDown(0.2);
        continue;
      }

      // Bold lines starting with known patterns (company names, job titles)
      if (/^[A-Z][^a-z]{0,5}/.test(trimmed) && trimmed.length < 60) {
        doc.font('Helvetica-Bold').fontSize(10).text(trimmed);
      } else {
        doc.font('Helvetica').fontSize(10).text(trimmed, { lineGap: 1 });
      }
    }

    doc.end();
  });
}
