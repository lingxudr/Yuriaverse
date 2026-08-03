import { NextResponse } from 'next/server';
export async function POST() { return NextResponse.json({ ok: true, title: 'Animesu', body: 'Test notification endpoint ready.' }); }
