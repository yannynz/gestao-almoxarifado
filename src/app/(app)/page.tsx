import Link from "next/link";
import { ArrowRight, Boxes, PackageCheck, PackageOpen, TriangleAlert } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";
import { dashboardData, recentMovements } from "@/lib/queries";

export default async function DashboardPage() {
  const [stats, recent] = await Promise.all([dashboardData(), recentMovements(5)]);
  return <>
    <PageHeader eyebrow="Visão geral" title="Tudo no lugar." description="Acompanhe o que está disponível e o que precisa de atenção." />
    <section className="stats-grid" aria-label="Resumo">
      <Link href="/ferramentas" className="stat-card"><span className="stat-icon"><PackageCheck/></span><span className="stat-value">{stats.available}</span><span className="stat-label">Disponíveis</span><ArrowRight size={18}/></Link>
      <Link href="/ferramentas" className="stat-card"><span className="stat-icon"><PackageOpen/></span><span className="stat-value">{stats.loaned}</span><span className="stat-label">Emprestadas</span><ArrowRight size={18}/></Link>
      <Link href="/insumos" className={`stat-card ${stats.lowStock ? "attention" : ""}`}><span className="stat-icon">{stats.lowStock ? <TriangleAlert/> : <Boxes/>}</span><span className="stat-value">{stats.lowStock}</span><span className="stat-label">Estoque baixo</span><ArrowRight size={18}/></Link>
    </section>
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">Atividade</p><h2>Últimas movimentações</h2></div><Link href="/movimentacoes">Ver histórico</Link></div>
      {recent.length ? <div className="activity-list">{recent.map((item) => <div className="activity-row" key={`${item.kind}-${item.id}`}><div className="activity-icon">{item.kind === "Ferramenta" ? <PackageOpen size={19}/> : <Boxes size={19}/>}</div><div><strong>{item.item}</strong><p>{item.type}{item.employee ? ` · ${item.employee}` : ""}</p></div><time>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(item.createdAt)}</time></div>)}</div> : <EmptyState>Nenhuma movimentação ainda.</EmptyState>}
    </section>
  </>;
}
