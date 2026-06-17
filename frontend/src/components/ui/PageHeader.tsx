interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
}

export function PageHeader({ title, subtitle, actions, eyebrow }: Props) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-6 animate-fade-in">
      <div>
        {eyebrow && (
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-electric-cobalt">
            {eyebrow}
          </div>
        )}
        <h1 className="text-heading-sm tracking-[-0.02em] text-ice-white">{title}</h1>
        {subtitle && (
          <p className="mt-3 max-w-2xl text-body-sm text-fog-text">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
