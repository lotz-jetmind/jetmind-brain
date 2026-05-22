import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const start = Date.now();
    try {
        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json({
            status: "ok",
            db: "connected",
            latency: Date.now() - start,
            service: "jetmind-brain",
        });
    } catch {
        return NextResponse.json({ status: "error", db: "unreachable" }, { status: 503 });
    }
}
