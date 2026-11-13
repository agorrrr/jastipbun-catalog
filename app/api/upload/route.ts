import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(req: Request) {
  try {
    const { filename, dataUrl } = await req.json();
    if (!dataUrl || !filename) {
      return NextResponse.json({ error: 'Missing dataUrl or filename' }, { status: 400 });
    }

    // Parse base64 string
    const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid dataUrl format' }, { status: 400 });
    }

    const contentType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const cleanFilename = `catalogs/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const blob = await put(cleanFilename, buffer, {
      access: 'public',
      contentType,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err: any) {
    console.error('Blob upload error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
