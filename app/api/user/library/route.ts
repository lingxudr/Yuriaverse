import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { prisma } from '../../../../lib/prisma';
export const runtime = 'nodejs';

async function getDbUser() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  if (!process.env.DATABASE_URL) return { id: session.user?.id || email, email, memoryOnly: true } as any;
  return prisma.user.upsert({ where: { email }, update: { name: session.user?.name, image: session.user?.image }, create: { email, name: session.user?.name, image: session.user?.image } });
}

export async function GET() {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  if ((user as any).memoryOnly) return NextResponse.json({ ok: true, data: { bookmarks: [], favorites: [], histories: [] }, memoryOnly: true });
  const [bookmarks, favorites, histories] = await Promise.all([
    prisma.bookmark.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.favorite.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.watchHistory.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' }, take: 100 })
  ]);
  return NextResponse.json({ ok: true, data: { bookmarks, favorites, histories } });
}

export async function POST(req: Request) {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  if ((user as any).memoryOnly) return NextResponse.json({ ok: true, memoryOnly: true, data: body });
  const type = body.type as 'bookmark' | 'favorite' | 'history';
  if (type === 'bookmark') {
    const data = await prisma.bookmark.upsert({ where: { userId_animeSlug: { userId: user.id, animeSlug: body.animeSlug } }, update: { title: body.title, poster: body.poster }, create: { userId: user.id, animeSlug: body.animeSlug, title: body.title, poster: body.poster } });
    return NextResponse.json({ ok: true, data });
  }
  if (type === 'favorite') {
    const data = await prisma.favorite.upsert({ where: { userId_animeSlug: { userId: user.id, animeSlug: body.animeSlug } }, update: { title: body.title, poster: body.poster }, create: { userId: user.id, animeSlug: body.animeSlug, title: body.title, poster: body.poster } });
    return NextResponse.json({ ok: true, data });
  }
  if (type === 'history') {
    const data = await prisma.watchHistory.upsert({ where: { userId_episodeSlug: { userId: user.id, episodeSlug: body.episodeSlug } }, update: { title: body.title, animeSlug: body.animeSlug, poster: body.poster, progress: body.progress || 0 }, create: { userId: user.id, episodeSlug: body.episodeSlug, title: body.title, animeSlug: body.animeSlug, poster: body.poster, progress: body.progress || 0 } });
    return NextResponse.json({ ok: true, data });
  }
  return NextResponse.json({ ok: false, message: 'Unknown library type' }, { status: 400 });
}


export async function DELETE(req: Request) {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if ((user as any).memoryOnly) return NextResponse.json({ ok: true, memoryOnly: true });
  const type = body.type as 'bookmark' | 'favorite' | 'history';
  if (type === 'bookmark' && body.animeSlug) {
    await prisma.bookmark.deleteMany({ where: { userId: user.id, animeSlug: body.animeSlug } });
    return NextResponse.json({ ok: true });
  }
  if (type === 'favorite' && body.animeSlug) {
    await prisma.favorite.deleteMany({ where: { userId: user.id, animeSlug: body.animeSlug } });
    return NextResponse.json({ ok: true });
  }
  if (type === 'history' && body.episodeSlug) {
    await prisma.watchHistory.deleteMany({ where: { userId: user.id, episodeSlug: body.episodeSlug } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, message: 'Invalid delete request' }, { status: 400 });
}
