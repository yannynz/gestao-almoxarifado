import { Search, Undo2, UserRound } from "lucide-react";
import { checkoutTool, returnTool } from "../actions";
import { EmptyState, Notice, PageHeader } from "@/components/ui";
import { labels, toolViewState } from "@/lib/domain";
import { listEmployees, listTools } from "@/lib/queries";

export default async function ToolsPage({ searchParams }: { searchParams: Promise<{ q?: string; ok?: string }> }) {
  const { q = "", ok } = await searchParams;
  const [allTools, employees] = await Promise.all([listTools(), listEmployees()]);
  const term = q.trim().toLocaleLowerCase("pt-BR");
  const rows = allTools.filter((tool) => !term || `${tool.code} ${tool.name} ${tool.employeeName ?? ""}`.toLocaleLowerCase("pt-BR").includes(term));
  return <>
    <PageHeader eyebrow="Operação" title="Ferramentas" description="Consulte, entregue e receba sem perder o histórico." />
    <Notice message={ok}/>
    <form className="search-bar"><Search size={20}/><input name="q" defaultValue={q} placeholder="Código, ferramenta ou funcionário" aria-label="Buscar ferramentas"/><button className="button subtle">Buscar</button></form>
    <div className="item-list">{rows.length ? rows.map((tool) => {
      const state = toolViewState(tool.status, Boolean(tool.loanId));
      return <article className="item-card" key={tool.id}>
        <div className="item-main"><span className="code">{tool.code}</span><div><h2>{tool.name}</h2>{tool.employeeName && <p className="holder"><UserRound size={15}/> Com {tool.employeeName}</p>}</div></div>
        <div className="item-meta"><span className={`status ${state.toLowerCase()}`}>{labels[state]}</span>{tool.checkedOutAt && <small>desde {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(tool.checkedOutAt)}</small>}</div>
        {state === "AVAILABLE" ? <details className="action-panel"><summary className="button primary">Registrar retirada</summary><form action={checkoutTool}><input type="hidden" name="toolId" value={tool.id}/><label>Quem vai levar?<select name="employeeId" required defaultValue=""><option value="" disabled>Selecione o funcionário</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}{employee.registrationCode ? ` · ${employee.registrationCode}` : ""}</option>)}</select></label><button className="button primary full">Confirmar retirada</button></form></details> : tool.loanId ? <form action={returnTool}><input type="hidden" name="loanId" value={tool.loanId}/><button className="button secondary"><Undo2 size={17}/> Registrar devolução</button></form> : null}
      </article>;
    }) : <EmptyState>Nenhuma ferramenta encontrada.</EmptyState>}</div>
  </>;
}
