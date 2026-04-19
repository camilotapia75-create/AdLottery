import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const user = await prisma.user.findUnique({ where: { email: credentials.email as string } });
          if (!user || !user.password) return null;
          const passwordMatch = await bcrypt.compare(credentials.password as string, user.password);
          if (!passwordMatch) return null;
          return { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin };
        } catch (err) {
          console.error("Auth DB error:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.isAdmin = (user as { isAdmin?: boolean }).isAdmin; }
      return token;
    },
    async session({ session, token }) {
      if (token) { session.user.id = token.id as string; session.user.isAdmin = token.isAdmin as boolean; }
      return session;
    },
  },
});
