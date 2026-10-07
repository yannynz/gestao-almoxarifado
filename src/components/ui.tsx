export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description: string; children?: React.ReactNode }) {
  return <header className="page-header">
    <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1><p>{description}</p></div>
    {children && <div className="header-action">{children}</div>}
  </header>;
}

export function Notice({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="notice" role="status">✓ {message}</div>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}
