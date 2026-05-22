import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// ─── Keyword router ────────────────────────────────────────────────────────────
function detectTopics(q: string) {
    const lower = q.toLowerCase();
    return {
        findings:   /finding|befund|audit|non.?conform|nc\b/.test(lower),
        cap:        /capa|cap\b|corrective|korrektur|massnahme|maßnahme/.test(lower),
        defects:    /defect|defekt|mel\b|tech.?log|mangel/.test(lower),
        flights:    /flight|flug|ftl|duty|block|airborne|pax/.test(lower),
        tenants:    /tenant|organisation|org\b|kunde|customer|mandant/.test(lower),
        users:      /user|nutzer|benutzer|person|pilot|staff/.test(lower),
        safety:     /safety|sicherheit|hazard|risk|risiko|occurrence/.test(lower),
        manuals:    /manual|handbuch|dokument|document|procedure|revision/.test(lower),
        aircraft:   /aircraft|flugzeug|registration|kennzeichen|tail/.test(lower),
        compliance: /compliance|konform|regulation|easa|part-|requirement|vorschrift/.test(lower),
    };
}

// ─── Context fetcher ───────────────────────────────────────────────────────────
async function buildContext(q: string, orgId: string | null): Promise<{ label: string; count: number; data: unknown[] }[]> {
    const topics = detectTopics(q);
    const ctx: { label: string; count: number; data: unknown[] }[] = [];
    const where = orgId ? { orgId } : {};

    if (topics.findings || topics.cap) {
        const findings = await prisma.finding.findMany({
            where,
            select: { id: true, status: true, justification: true, dueDate: true, corrective_action_plan: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 30,
        }).catch(() => []);
        ctx.push({ label: "Findings / CAPA", count: findings.length, data: findings });
    }

    if (topics.defects) {
        const defects = await prisma.defect.findMany({
            where,
            select: { id: true, ataChapter: true, description: true, status: true, date: true, category: true, defectType: true },
            orderBy: { date: "desc" },
            take: 30,
        }).catch(() => []);
        ctx.push({ label: "Defects", count: defects.length, data: defects });
    }

    if (topics.flights) {
        const flights = await prisma.flight.findMany({
            where: orgId ? { leg: { some: { orgId } } } : {},
            select: { id: true, flightNumber: true, status: true, scheduledDep: true, scheduledArr: true, pax: true },
            orderBy: { scheduledDep: "desc" },
            take: 30,
        }).catch(() => []);
        ctx.push({ label: "Flights", count: flights.length, data: flights });
    }

    if (topics.tenants || (!Object.values(topics).some(Boolean))) {
        const orgs = await prisma.organisation.findMany({
            select: { id: true, name: true, slug: true, country: true, createdAt: true, _count: { select: { users: true } } },
            orderBy: { createdAt: "desc" },
            take: 50,
        }).catch(() => []);
        ctx.push({ label: "Organisations", count: orgs.length, data: orgs });
    }

    if (topics.users) {
        const users = await prisma.user.findMany({
            where,
            select: { id: true, name: true, email: true, role: true, opsRole: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 30,
        }).catch(() => []);
        ctx.push({ label: "Users", count: users.length, data: users });
    }

    if (topics.aircraft) {
        const aircraft = await prisma.aircraft.findMany({
            where,
            select: { id: true, registration: true, type: true, status: true, manufacturerSerial: true },
            take: 20,
        }).catch(() => []);
        ctx.push({ label: "Aircraft", count: aircraft.length, data: aircraft });
    }

    if (topics.safety) {
        const reports = await prisma.safetyReport.findMany({
            where,
            select: { id: true, title: true, status: true, severity: true, reportDate: true, description: true },
            orderBy: { reportDate: "desc" },
            take: 20,
        }).catch(() => []);
        ctx.push({ label: "Safety Reports", count: reports.length, data: reports });
    }

    if (topics.manuals) {
        const manuals = await prisma.manual.findMany({
            where,
            select: { id: true, title: true, type: true, revision: true, status: true, effectiveDate: true },
            take: 20,
        }).catch(() => []);
        ctx.push({ label: "Manuals", count: manuals.length, data: manuals });
    }

    return ctx;
}

// ─── POST /api/query ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { question } = await req.json();
    if (!question?.trim()) return NextResponse.json({ error: "No question provided" }, { status: 400 });

    const startTime = Date.now();

    try {
        const ctx = await buildContext(question, session.user.orgId ?? null);
        const totalRecords = ctx.reduce((a, c) => a + c.count, 0);

        const systemPrompt = `Du bist Jetmind Brain — ein hochspezialisiertes KI-System für Aviation Safety, CAMO und Compliance.

Du hast Zugriff auf eine Live-Datenbank mit folgenden Daten:
${ctx.map(c => `- ${c.label}: ${c.count} Einträge`).join("\n")}

KONTEXT-DATEN (JSON):
${ctx.map(c => `### ${c.label}\n${JSON.stringify(c.data, null, 2)}`).join("\n\n")}

REGELN:
- Antworte präzise, strukturiert und faktenbasiert
- Nutze die echten Daten oben für deine Antwort
- Wenn du Zahlen nennst, beziehe dich auf echte Werte aus den Daten
- Antworte auf Deutsch wenn die Frage auf Deutsch ist
- Formatiere Antworten mit Markdown (Listen, Tabellen, Fettschrift)
- Wenn Daten fehlen oder leer sind: sag das klar
- Sei präzise wie ein Aviation Safety Manager, nicht wie ein Chatbot`;

        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
            systemInstruction: systemPrompt,
        });

        const result = await model.generateContent(question);
        const answer = result.response.text();

        return NextResponse.json({
            answer,
            context: ctx.map(c => ({ label: c.label, count: c.count })),
            totalRecords,
            latency: Date.now() - startTime,
        });
    } catch (err) {
        console.error("Query error:", err);
        return NextResponse.json({ error: "Query failed", detail: String(err) }, { status: 500 });
    }
}
