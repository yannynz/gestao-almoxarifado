import { randomUUID } from "node:crypto";
import { createEmployee, createSupply, createTool } from "../actions";
import { Notice, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export default async function RegistersPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requireAdmin();
  const { ok } = await searchParams;
  return <>
    <PageHeader eyebrow="Administração" title="Cadastros" description="Adicione o essencial. Sem formulários longos ou campos desnecessários." />
    <Notice message={ok}/>
    <div className="forms-grid">
      <section className="form-card"><p className="eyebrow">Pessoas</p><h2>Novo funcionário</h2><p>Quem recebe ferramentas ou insumos.</p><form action={createEmployee}><label>Nome<input name="name" maxLength={150} required/></label><label>Matrícula <span>opcional</span><input name="registrationCode" maxLength={50}/></label><button className="button primary full">Cadastrar funcionário</button></form></section>
      <section className="form-card"><p className="eyebrow">Patrimônio</p><h2>Nova ferramenta</h2><p>Um item individual, identificado por código.</p><form action={createTool}><label>Código<input name="code" maxLength={30} placeholder="Ex.: A1" required/></label><label>Nome<input name="name" maxLength={150} placeholder="Ex.: Furadeira Bosch" required/></label><button className="button primary full">Cadastrar ferramenta</button></form></section>
      <section className="form-card"><p className="eyebrow">Estoque</p><h2>Novo insumo</h2><p>Material consumível controlado em unidades.</p><form action={createSupply}><input type="hidden" name="operationId" value={randomUUID()}/><label>Código<input name="code" maxLength={30} placeholder="Ex.: DC45" required/></label><label>Nome<input name="name" maxLength={150} placeholder="Ex.: Disco de corte 4½" required/></label><div className="field-row"><label>Quantidade<input name="quantity" type="number" min="0" defaultValue="0" required/></label><label>Estoque mínimo<input name="minimumQuantity" type="number" min="0" defaultValue="0" required/></label></div><button className="button primary full">Cadastrar insumo</button></form></section>
    </div>
  </>;
}
