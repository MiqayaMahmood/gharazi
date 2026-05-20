import { NextResponse } from 'next/server';
import { submitBlogComment } from '@/lib/api/wordpress';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { postId?: number; name?: string; email?: string; message?: string; website?: string };
    if (body.website) return NextResponse.json({ ok: true });
    if (!body.postId || !body.name || !body.message || body.name.trim().length < 2 || body.message.trim().length < 5) {
      return NextResponse.json({ error: 'Name and message are required.' }, { status: 400 });
    }
    await submitBlogComment({
      postId: body.postId,
      name: body.name.trim(),
      email: body.email?.trim(),
      message: body.message.trim(),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unable to submit comment.' }, { status: 502 });
  }
}
