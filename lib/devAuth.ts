import { notFound } from 'next/navigation';

export function isDevAuthorized(key?: string | null) {
  const secret = process.env.DEV_HEALTH_SECRET;
  if (!secret) return true;
  return key === secret;
}

export function requireDevAccess(key?: string | null) {
  if (!isDevAuthorized(key)) notFound();
}
