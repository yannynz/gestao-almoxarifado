"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ClipboardClock, Home, PackageOpen, Settings2 } from "lucide-react";

const links = [
  { href: "/", label: "Início", icon: Home },
  { href: "/ferramentas", label: "Ferramentas", icon: PackageOpen },
  { href: "/insumos", label: "Insumos", icon: Boxes },
  { href: "/movimentacoes", label: "Histórico", icon: ClipboardClock },
  { href: "/cadastros", label: "Cadastros", icon: Settings2 },
];

export function Navigation() {
  const pathname = usePathname();
  return <>
    <aside className="sidebar" aria-label="Navegação principal">
      <Link href="/" className="brand"><span className="brand-mark">A</span><span>Almox</span></Link>
      <nav>{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={pathname === href ? "active" : ""}><Icon size={19}/><span>{label}</span></Link>)}</nav>
      <p className="sidebar-note">Gestão simples, estoque em ordem.</p>
    </aside>
    <nav className="bottom-nav" aria-label="Navegação principal">{links.slice(0, 4).map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={pathname === href ? "active" : ""}><Icon size={21}/><span>{label}</span></Link>)}</nav>
  </>;
}
