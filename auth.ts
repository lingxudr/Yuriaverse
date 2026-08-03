import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './lib/prisma';

const hasGoogle = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
const hasDatabase = Boolean(process.env.DATABASE_URL);

const fallbackProvider = Credentials({
  id: 'setup-required',
  name: 'Google OAuth Setup Required',
  credentials: {},
  async authorize() { return null; }
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: hasDatabase ? PrismaAdapter(prisma) : undefined,
  // Google OAuth is the only real auth provider. JWT is used so the site remains safe
  // even before PostgreSQL is connected; user library endpoints persist when DB exists.
  session: { strategy: 'jwt' },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'animesu-development-secret',
  trustHost: true,
  providers: hasGoogle ? [Google({
    clientId: process.env.AUTH_GOOGLE_ID!,
    clientSecret: process.env.AUTH_GOOGLE_SECRET!
  })] : [fallbackProvider],
  pages: { signIn: '/profile' },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub || token.email || '');
        session.user.name = session.user.name || (token.name as string) || undefined;
        session.user.email = session.user.email || (token.email as string) || '';
        session.user.image = session.user.image || (token.picture as string) || undefined;
      }
      return session;
    }
  }
});
