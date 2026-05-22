import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function TenantsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const orgs = await prisma.organisation.findMany({
        select: {
            id: true,
            name: true,
            slug: true,
            country: true,
            createdAt: true,
            _count: {
                select: {
                    users: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
    }).catch(() => []);

    return (
        <div className="min-h-screen" style={{ background: "var(--brain-bg)" }}>
            <header style={{ borderBottom: "1px solid var(--brain-border)" }}>
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
                    <a href="/" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 13 }}>← Brain</a>
                    <span style={{ color: "rgba(255,255,255,0.1)" }}>/</span>
                    <span style={{ fontSize: 13, color: "#64748B" }}>Tenants</span>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-6 py-12">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>
                            All Organisations
                        </h1>
                        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}>
                            {orgs.length} tenants in Jetmind
                        </p>
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {orgs.map(org => (
                        <div key={org.id} style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.05)",
                            borderRadius: 12, padding: "16px 20px",
                            display: "flex", alignItems: "center", gap: 16,
                        }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 8,
                                background: "rgba(100,116,139,0.1)",
                                border: "1px solid rgba(100,116,139,0.2)",
                                display: "flex", alignItems: "center",
                                justifyContent: "center", fontSize: 14,
                                color: "#64748B", fontWeight: 800, flexShrink: 0,
                            }}>
                                {(org.name ?? "?")[0]?.toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>
                                    {org.name ?? "—"}
                                </div>
                                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                                    {org.slug} · {org.country ?? "—"}
                                </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 20, fontWeight: 800, color: "#64748B" }}>
                                    {org._count.users}
                                </div>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>users</div>
                            </div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
                                {new Date(org.createdAt).toLocaleDateString("de-DE")}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
