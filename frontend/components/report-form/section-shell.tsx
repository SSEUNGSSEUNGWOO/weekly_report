type Props = {
  index: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function SectionShell({ index, title, subtitle, children }: Props) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-baseline gap-3 border-b border-border px-6 pb-3.5 pt-5">
        <span className="font-mono text-[10.5px] font-semibold tracking-[0.16em] text-primary">
          {index}
        </span>
        <h2 className="font-serif text-[18px] font-semibold tracking-[-0.01em] text-foreground">
          {title}
        </h2>
        {subtitle && (
          <span className="ml-1 text-[12px] text-muted-foreground">
            {subtitle}
          </span>
        )}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}
