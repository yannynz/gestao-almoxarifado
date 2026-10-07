import { Boxes, PackageOpen } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";
import { recentMovements } from "@/lib/queries";

export default async function MovementsPage() {
  const movements = await recentMovements(100);
  return <>
    <PageHeader eyebrow="Rastreabilidade" title="Histórico" description="Quem movimentou, o que foi entregue e quando aconteceu." />
    {movements.length ? <div className="timeline">{movements.map((item) => <article className="timeline-row" key={`${item.kind}-${item.id}`}>
      <div className="timeline-icon">{item.kind === "Ferramenta" ? <PackageOpen size={20}/> : <Boxes size={20}/>}</div>
      <div className="timeline-main"><span className="code">{item.code}</span><h2>{item.item}</h2><p>{item.type}{item.employee ? ` para ${item.employee}` : ""}{item.quantity ? ` · ${item.quantity} un.` : ""}</p></div>
      <div className="timeline-meta"><time>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(item.createdAt)}</time><small>por {item.actor}</small></div>
    </article>)}</div> : <EmptyState>O histórico aparecerá aqui após a primeira operação.</EmptyState>}
  </>;
}
