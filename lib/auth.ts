import crypto from 'crypto';
const secret = process.env.JWT_SECRET || 'animesu-dev-secret-change-me';
function b64(input: string | Buffer) { return Buffer.from(input).toString('base64url'); }
export function signJwt(payload: Record<string, unknown>) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { ...payload, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 60*60*24*30, iss: 'animesu' };
  const data = `${b64(JSON.stringify(header))}.${b64(JSON.stringify(body))}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}
export function verifyJwt(token = '') {
  const [h,p,s] = token.split('.'); if(!h||!p||!s) return null;
  const data = `${h}.${p}`; const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  if (sig !== s) return null;
  const payload = JSON.parse(Buffer.from(p,'base64url').toString());
  if (payload.exp && payload.exp < Math.floor(Date.now()/1000)) return null;
  return payload;
}
