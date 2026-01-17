import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { name: string } }) {
  try {
    const dataFile = process.env.DATA_FILE || path.join(process.cwd(), 'data.json');
    const uploadsDir = path.join(path.dirname(dataFile), 'uploads');
    const filePath = path.join(uploadsDir, params.name);

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Not found', { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.webp') contentType = 'image/webp';

    return new NextResponse(buffer, {
      status: 200,
      headers: { 'Content-Type': contentType }
    });
  } catch (err) {
    console.error('Error serving receipt:', err);
    return new NextResponse('Internal error', { status: 500 });
  }
}
