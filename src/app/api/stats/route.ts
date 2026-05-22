import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const [users, orgs, safety, flights] = await Promise.all([
            prisma.user.count(),
            prisma.organisation.count(),
            prisma.safetyReport.count().catch(() => 0),
            prisma.flight.count().catch(() => 0),
        ]);
        return NextResponse.json({ users, orgs, safety, flights });
    } catch (e) {
        console.error("Stats error:", e);
        return NextResponse.json({ users: 0, orgs: 0, safety: 0, flights: 0 });
    }
}
