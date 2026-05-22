import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const orgs = await prisma.organisation.findMany({
            select: {
                id: true,
                name: true,
                slug: true,
                country: true,
                createdAt: true,
                _count: { select: { users: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        });
        return NextResponse.json(orgs);
    } catch (e) {
        console.error("Tenants API error:", e);
        return NextResponse.json([], { status: 200 });
    }
}
