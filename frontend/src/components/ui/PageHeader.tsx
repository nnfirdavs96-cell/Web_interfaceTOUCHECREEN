interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-fade-in">
      <div>
        <h1 className="text-heading-sm tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 text-body-sm text-slate2 dark:text-slate-400">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
