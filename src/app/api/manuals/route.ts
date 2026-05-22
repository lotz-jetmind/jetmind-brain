import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        // ── Manuals ───────────────────────────────────────────────────────────
        const manuals = await prisma.doc_manuals.findMany({
            select: {
                id: true, orgId: true, manual_code: true, title: true,
                current_revision: true, status: true, compliance_status: true,
                regulatory_framework: true, current_effective_date_utc: true,
                _count: { select: { chapters: true, amendments: true } },
            },
            orderBy: { manual_code: "asc" },
            take: 100,
        }).catch(() => []);

        // ── Amendments ────────────────────────────────────────────────────────
        const amendments = await prisma.mod9_10_amendments.findMany({
            select: {
                id: true, proposed_revision: true, status: true,
                change_classification: true, requires_prior_approval: true,
                ai_summary_of_changes: true, created_at: true, approved_at: true,
            },
            orderBy: { created_at: "desc" },
            take: 50,
        }).catch(() => []);

        // ── Amendment Proposals (EASA changes) ────────────────────────────────
        const proposals = await prisma.sqms_AmendmentProposal.findMany({
            select: {
                id: true, regulationRef: true, authority: true, status: true,
                sourceUrl: true, articleChanges: true, proposedAt: true,
            },
            orderBy: { proposedAt: "desc" },
            take: 20,
        }).catch(() => []);

        // ── Analytics ─────────────────────────────────────────────────────────
        const manualByStatus = manuals.reduce((acc: Record<string, number>, m) => {
            acc[m.status] = (acc[m.status] || 0) + 1; return acc;
        }, {});

        const manualByCompliance = manuals.reduce((acc: Record<string, number>, m) => {
            acc[m.compliance_status] = (acc[m.compliance_status] || 0) + 1; return acc;
        }, {});

        const amendmentByStatus = amendments.reduce((acc: Record<string, number>, a) => {
            acc[a.status] = (acc[a.status] || 0) + 1; return acc;
        }, {});

        const pendingAmendments  = amendments.filter(a => a.status === "Draft_Editing" || a.status === "Quarantine_Awaiting_LBA").length;
        const approvedAmendments = amendments.filter(a => a.status === "Approved_Live").length;
        const pendingProposals   = proposals.filter(p => p.status === "PENDING").length;
        const outdatedManuals    = manuals.filter(m => m.compliance_status !== "UP_TO_DATE").length;

        // Manuals needing revision (outdated compliance status)
        const needsRevision = manuals.filter(m =>
            m.compliance_status !== "UP_TO_DATE"
        ).map(m => ({
            id: m.id,
            code: m.manual_code,
            title: m.title,
            status: m.compliance_status,
            revision: m.current_revision,
            orgId: m.orgId,
        }));

        return NextResponse.json({
            summary: {
                totalManuals: manuals.length,
                outdatedManuals,
                pendingAmendments,
                approvedAmendments,
                pendingProposals,
                totalAmendments: amendments.length,
                totalProposals: proposals.length,
            },
            charts: {
                manualByStatus: Object.entries(manualByStatus).sort((a, b) => b[1] - a[1]),
                manualByCompliance: Object.entries(manualByCompliance).sort((a, b) => b[1] - a[1]),
                amendmentByStatus: Object.entries(amendmentByStatus).sort((a, b) => b[1] - a[1]),
            },
            manuals: manuals.slice(0, 20).map(m => ({
                id: m.id, code: m.manual_code, title: m.title,
                revision: m.current_revision, status: m.status,
                compliance: m.compliance_status,
                chapters: m._count.chapters, amendments: m._count.amendments,
                effectiveDate: m.current_effective_date_utc,
            })),
            recentAmendments: amendments.slice(0, 10),
            proposals: proposals.slice(0, 10),
            needsRevision: needsRevision.slice(0, 10),
        });
    } catch (e) {
        console.error("Manuals API error:", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
