interface SectionProps {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

/** Section — Classification: WRITE NEW. */
export function Section({ id, title, description, children }: SectionProps): React.JSX.Element {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="mt-14 first:mt-8 scroll-mt-6">
      <h2 id={headingId} className="font-display text-[clamp(24px,3vw,28px)] font-medium leading-tight text-ink">
        {title}
      </h2>
      <p className="mb-6 mt-2 text-sm font-light text-ink-soft">{description}</p>
      {children}
    </section>
  );
}
