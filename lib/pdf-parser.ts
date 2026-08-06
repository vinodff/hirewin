export async function parsePdf(buffer: Buffer): Promise<string> {
  // Dynamic import to avoid Next.js edge runtime issues
  const pdfParse = (await import('pdf-parse')).default;

  // pdf.js clones the input with `new value.constructor(value)`. For a Node Buffer
  // that is `Buffer.from(...)`, which allocates out of the shared 8 KB pool whenever
  // the file is under 4096 bytes — so the clone starts partway into a pool that
  // pdf.js then reads from offset 0. Every byte offset in the xref table lands
  // short and a perfectly valid PDF dies with "bad XRef entry" or "Illegal
  // character: N". A plain Uint8Array clones element-wise and stays aligned.
  const bytes = new Uint8Array(buffer) as unknown as Buffer;

  let data;
  try {
    data = await pdfParse(bytes);
  } catch {
    throw new Error("Couldn't read this PDF — try re-saving or exporting it again.");
  }

  const text = data.text.trim();

  if (!text) {
    throw new Error('PDF appears to be image-only or password-protected');
  }

  return text;
}
