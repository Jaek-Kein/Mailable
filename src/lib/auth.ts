// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import { getServerSession } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/src/lib/prisma";
import { encrypt } from "@/src/lib/crypto";

// PrismaAdapter를 래핑하여 OAuth 토큰을 DB 저장 전에 암호화합니다.
const baseAdapter = PrismaAdapter(prisma);
const encryptingAdapter: Adapter = {
  ...baseAdapter,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkAccount: (async (account: any) => {
    return baseAdapter.linkAccount!({
      ...account,
      refresh_token: account.refresh_token ? encrypt(account.refresh_token) : account.refresh_token,
      access_token: account.access_token ? encrypt(account.access_token) : account.access_token,
      id_token: account.id_token ? encrypt(account.id_token) : account.id_token,
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any,
};

export const authOptions: NextAuthOptions = {
  adapter: encryptingAdapter,
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.send",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (user && session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signIn({ account }: { account: any }) {
      if (account?.provider === "google" && account.refresh_token) {
        await prisma.account.updateMany({
          where: { providerAccountId: account.providerAccountId, provider: "google" },
          data: {
            refresh_token: encrypt(account.refresh_token),
            access_token: account.access_token ? encrypt(account.access_token) : undefined,
            id_token: account.id_token ? encrypt(account.id_token) : undefined,
            expires_at: account.expires_at ?? undefined,
          },
        });
      }
      return true;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login', // Redirect errors to login page
  },
};

export const auth = () => getServerSession(authOptions);
