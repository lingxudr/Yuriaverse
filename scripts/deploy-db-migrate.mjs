import { execSync } from 'node:child_process';
const required = ['DATABASE_URL','AUTH_SECRET','AUTH_GOOGLE_ID','AUTH_GOOGLE_SECRET','NEXTAUTH_URL'];
const missing = required.filter((k)=>!process.env[k]);
if (missing.length) {
  console.error(`Missing env: ${missing.join(', ')}`);
  console.error('Set these in Vercel or .env before running migration.');
  process.exit(1);
}
execSync('npx prisma migrate deploy', { stdio: 'inherit' });
console.log('Prisma migration deployed successfully.');
