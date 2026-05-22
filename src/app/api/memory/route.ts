import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── GET /api/memory ──────────────────────────────────────────────────────────
export async function GET() {
    const memories = await prisma.sys_brain_memory.findMany({
        select: {
            id: true,
            topic: true,
            summary: true,
            confidence: true,
            source: true,
            created_at: true,
            expires_at: true,
        },
        orderBy: { updated_at: "desc" },
        take: 20,
    }).catch(() => []);

    return NextResponse.json(memories);
}

// ─── POST /api/memory ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);
    if (!body?.topic || !body?.summary) {
        return NextResponse.json({ error: "topic and summary are required" }, { status: 400 });
    }

    const { topic, summary, rawData } = body as {
        topic: string;
        summary: string;
        rawData?: Record<string, unknown>;
    };

    const memory = await prisma.sys_brain_memory.create({
        data: {
            topic,
            summary,
            raw_data: rawData ?? null,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
    }).catch((e: unknown) => {
        console.error("Memory create error:", e);
        return null;
    });

    if (!memory) {
        return NextResponse.json({ error: "Failed to save memory" }, { status: 500 });
    }

    return NextResponse.json(memory);
}
