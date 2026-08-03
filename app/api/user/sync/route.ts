import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  const data = await req.json().catch(() => ({}));
  return NextResponse.json({ ok: true, user: { email: session.user.email, name: session.user.name }, syncedAt: new Date().toISOString(), data });
}
