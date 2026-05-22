/**
 * src/lib/auth.ts — Brain app auth (shared session with Jetmind)
 *
 * CRITICAL: NEXTAUTH_SECRET must be identical to Jetmind's secret.
 * This means a user logged into Jetmind is automatically authenticated here.
 *
 * Access gate: Only SUPERADMIN role can access Brain.
 */
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { NextAuthOptions } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id:        string;
            email:     string;
            name:      string | null;
            role:      string;
            opsRole:   string;
            orgId:     string | null;
            aiEnabled: boolean;
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id:        string;
        role:      string;
        opsRole:   string;
        orgId:     string | null;
        aiEnabled: boolean;
    }
}

export const authOptions: NextAuthOptions = {
    // Must trust host for multi-domain setup
    ...({ trustHost: true } as object),

    session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
    secret: process.env.NEXTAUTH_SECRET,

    pages: {
        signIn: "/login",
        error:  "/login",
    },

    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email:    { label: "Email",    type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email.toLowerCase() },
                });

                if (!user?.hashedPassword) return null;
                const valid = await bcrypt.compare(credentials.password, user.hashedPassword);
                if (!valid) return null;

                // Brain access: SuperAdmin only
                if (user.role !== "SUPERADMIN") return null;

                return {
                    id:        user.id,
                    email:     user.email,
                    name:      user.name,
                    role:      user.role,
                    opsRole:   user.opsRole ?? "NONE",
                    orgId:     user.orgId,
                    aiEnabled: user.aiEnabled ?? true,
                };
            },
        }),
    ],

    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id        = user.id;
                token.role      = (user as { role: string }).role;
                token.opsRole   = (user as { opsRole: string }).opsRole;
                token.orgId     = (user as { orgId: string | null }).orgId;
                token.aiEnabled = (user as { aiEnabled: boolean }).aiEnabled;
            }
            return token;
        },
        async session({ session, token }) {
            session.user = {
                id:        token.id,
                email:     token.email ?? "",
                name:      token.name ?? null,
                role:      token.role,
                opsRole:   token.opsRole,
                orgId:     token.orgId,
                aiEnabled: token.aiEnabled,
            };
            return session;
        },
    },
};
