import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { manualId, regulationChange } = await req.json();

    try {
        // Load the manual with its chapters/blocks
        const manual = await prisma.doc_manuals.findUnique({
            where: { id: manualId },
            select: {
                id: true, manual_code: true, title: true,
                current_revision: true, regulatory_framework: true,
                chapters: {
                    select: {
                        id: true, chapter_number: true, title: true,
                        nodes: {
                            select: { id: true, title: true, content: true },
                            take: 5,
                        },
                    },
                    take: 10,
                },
            },
        }).catch(() => null);

        if (!manual) return NextResponse.json({ error: "Manual not found" }, { status: 404 });

        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.0-flash" });

        const prompt = `Du bist ein EASA Compliance-Experte und Aviation Manual Editor.

AUFGABE: Analysiere folgende EASA Regulierungsänderung und erstelle einen präzisen Diff-Vorschlag für das betroffene Manual.

REGULIERUNGSÄNDERUNG:
${regulationChange}

MANUAL: ${manual.manual_code} — ${manual.title}
Aktuelle Revision: ${manual.current_revision}
Framework: ${manual.regulatory_framework || "EASA Air Ops"}

MANUALSTRUKTUR (Auszug):
${manual.chapters.map(c =>
    `Kapitel ${c.chapter_number}: ${c.title}\n${c.nodes.slice(0, 3).map(n => `  - ${n.title}`).join("\n")}`
).join("\n")}

ERSTELLE:
1. **Betroffene Kapitel** — welche Abschnitte müssen geändert werden?
2. **Änderungsklassifikation** — Minor (Mod 9) oder Major (Mod 10 / Prior Approval)?
3. **Konkrete Textänderungen** — zeige "ALT:" und "NEU:" für jeden betroffenen Abschnitt
4. **Begründung** — warum ist diese Änderung regulatorisch erforderlich?
5. **Deadline** — wann muss die Änderung wirksam sein?
6. **Nächste Schritte** — was muss der Compliance Manager tun?

Sei präzise wie ein erfahrener CAMO/Quality Manager. Nutze Markdown-Formatierung.`;

        const result = await model.generateContent(prompt);
        const diff = result.response.text();

        return NextResponse.json({
            manualCode: manual.manual_code,
            manualTitle: manual.title,
            currentRevision: manual.current_revision,
            diff,
            generatedAt: new Date().toISOString(),
        });
    } catch (e) {
        console.error("AI diff error:", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
