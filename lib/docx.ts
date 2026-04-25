import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Packer,
} from 'docx';

export async function generateDocx(resumeText: string): Promise<Buffer> {
  const lines = resumeText.split('\n');
  const paragraphs: Paragraph[] = [];

  let isFirstLine = true;

  for (const line of lines) {
    const trimmed = line.trimEnd();

    if (isFirstLine && trimmed) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed, bold: true, size: 32 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
        })
      );
      isFirstLine = false;
      continue;
    }

    if (!trimmed) {
      paragraphs.push(new Paragraph({ spacing: { after: 60 } }));
      continue;
    }

    // Section headers: ALL CAPS
    if (trimmed === trimmed.toUpperCase() && trimmed.length > 2 && !/^\d/.test(trimmed)) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: trimmed, bold: true, size: 20 })],
          spacing: { before: 200, after: 80 },
          border: {
            bottom: { color: 'CCCCCC', size: 6, style: BorderStyle.SINGLE },
          },
        })
      );
      continue;
    }

    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: trimmed, size: 20 })],
        spacing: { after: 60 },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
