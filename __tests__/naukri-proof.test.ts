import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import { proofsDir } from '@/lib/naukri/safety';
import { GET } from '@/app/api/naukri/proof/route';

describe('GET /api/naukri/proof', () => {
  const dir = proofsDir();
  const testFileName = 'test-proof-sample-12345.png';
  const testFilePath = path.join(dir, testFileName);

  beforeEach(() => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(testFilePath, Buffer.from('fake-png-content'));
  });

  afterEach(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  test('returns 400 when file parameter is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/naukri/proof');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  test('returns 400 when file parameter has invalid extension or characters', async () => {
    const req1 = new NextRequest('http://localhost:3000/api/naukri/proof?file=passwords.txt');
    const res1 = await GET(req1);
    expect(res1.status).toBe(400);

    const req2 = new NextRequest('http://localhost:3000/api/naukri/proof?file=../../etc/passwd');
    const res2 = await GET(req2);
    expect(res2.status).toBe(400);
  });

  test('returns 404 when file does not exist', async () => {
    const req = new NextRequest('http://localhost:3000/api/naukri/proof?file=nonexistent-file.png');
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  test('serves the file correctly when it exists', async () => {
    const req = new NextRequest(`http://localhost:3000/api/naukri/proof?file=${testFileName}`);
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    const body = await res.arrayBuffer();
    expect(Buffer.from(body).toString()).toBe('fake-png-content');
  });
});
