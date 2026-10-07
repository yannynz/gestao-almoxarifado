import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Almox", template: "%s · Almox" },
  description: "Gestão simples de ferramentas e insumos",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#181a17" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
