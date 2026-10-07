import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { demoLogin } from "./actions";
import { demoLoginAllowed } from "@/lib/domain";

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  return <main className="login-page">
    <section className="login-card">
      <div className="brand login-brand"><span className="brand-mark">A</span><span>Almox</span></div>
      <div><p className="eyebrow">Bem-vindo</p><h1>O almoxarifado, sem papelada.</h1><p className="login-copy">Consulte, entregue e registre em poucos toques.</p></div>
      <LoginForm />
      {demoLoginAllowed(process.env.NODE_ENV, process.env.ALLOW_DEMO_LOGIN) && <form action={demoLogin} className="demo-login"><button className="button subtle full">Entrar com dados de demonstração</button></form>}
    </section>
  </main>;
}
