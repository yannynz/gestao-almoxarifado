import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { Navigation } from "@/components/navigation";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return <div className="app-shell">
    <Navigation />
    <div className="app-column">
      <div className="topbar"><span>Olá, <strong>{session.displayName}</strong></span><form action={logout}><button className="icon-button" aria-label="Sair"><LogOut size={18}/></button></form></div>
      <main className="content">{children}</main>
    </div>
  </div>;
}
