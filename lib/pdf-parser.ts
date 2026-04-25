export async function parsePdf(buffer: Buffer): Promise<string> {
  // Dynamic import to avoid Next.js edge runtime issues
  const pdfParse = (await import('pdf-parse')).default;

  const data = await pdfParse(buffer);
  const text = data.text.trim();

  if (!text) {
    throw new Error('PDF appears to be image-only or password-protected');
  }

  return text;
}
