import { randomUUID } from "node:crypto";
import { Minus, Plus, Search, TriangleAlert } from "lucide-react";
import { addSupplyStock, consumeSupply } from "../actions";
import { EmptyState, Notice, PageHeader } from "@/components/ui";
import { listEmployees, listSupplies } from "@/lib/queries";
import { requireSession } from "@/lib/auth";

export default async function SuppliesPage({ searchParams }: { searchParams: Promise<{ q?: string; ok?: string }> }) {
  const { q = "", ok } = await searchParams;
  const [allSupplies, employees, session] = await Promise.all([listSupplies(), listEmployees(), requireSession()]);
  const term = q.trim().toLocaleLowerCase("pt-BR");
  const rows = allSupplies.filter((item) => !term || `${item.code} ${item.name}`.toLocaleLowerCase("pt-BR").includes(term));
  return <>
    <PageHeader eyebrow="Estoque" title="Insumos" description="Saiba quanto há e registre cada saída no momento em que acontece." />
    <Notice message={ok}/>
    <form className="search-bar"><Search size={20}/><input name="q" defaultValue={q} placeholder="Código ou nome do insumo" aria-label="Buscar insumos"/><button className="button subtle">Buscar</button></form>
    <div className="item-list">{rows.length ? rows.map((item) => {
      const low = item.quantity <= item.minimumQuantity;
      return <article className="item-card supply-card" key={item.id}>
        <div className="item-main"><span className="code">{item.code}</span><div><h2>{item.name}</h2><p className="stock"><strong>{item.quantity}</strong> {item.unit} disponíveis</p></div></div>
        <div className="item-meta">{low ? <span className="status low"><TriangleAlert size={14}/> Estoque baixo</span> : <span className="status available">Em dia</span>}<small>Mínimo: {item.minimumQuantity} {item.unit}</small></div>
        <div className="button-row"><details className="action-panel"><summary className="button primary"><Minus size={17}/> Registrar consumo</summary><form action={consumeSupply}><input type="hidden" name="operationId" value={randomUUID()}/><input type="hidden" name="supplyId" value={item.id}/><label>Funcionário<select name="employeeId" required defaultValue=""><option value="" disabled>Selecione</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label><label>Quantidade<input type="number" name="quantity" min="1" max={item.quantity} inputMode="numeric" required/></label><button className="button primary full">Confirmar consumo</button></form></details>{session.role === "ADMIN" && <details className="action-panel"><summary className="button secondary"><Plus size={17}/> Entrada</summary><form action={addSupplyStock}><input type="hidden" name="operationId" value={randomUUID()}/><input type="hidden" name="supplyId" value={item.id}/><label>Quantidade<input type="number" name="quantity" min="1" inputMode="numeric" required/></label><button className="button primary full">Confirmar entrada</button></form></details>}</div>
      </article>;
    }) : <EmptyState>Nenhum insumo encontrado.</EmptyState>}</div>
  </>;
}
