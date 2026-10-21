/**
 * The bar that ties the demo back to caitlynfeletar.com, which proxies this app at /dashboard.
 * Links are absolute: with basePath set, a relative "/" would land back on the dashboard, and the
 * bare netlify.app domain has nothing at its root. Spans the full viewport with the main site's
 * nav padding, rather than the dashboard's column, so the two headers line up.
 */
export const SITE_HOME = "https://caitlynfeletar.com";
export const BOOK_CALL = "https://calendly.com/cgfeletar/30min";

export function SiteBar(): React.JSX.Element {
  return (
    <div className="border-b border-site-cedar/15 bg-site-morning">
      <nav
        aria-label="Caitlyn Feletar"
        className="flex w-full items-center justify-between gap-4 px-[clamp(20px,4.4vw,40px)] py-4"
      >
        <a href={SITE_HOME} className="flex items-baseline gap-2.5 text-site-fir">
          <span className="font-site-display text-xl font-bold tracking-tight">Caitlyn Feletar</span>
          <span aria-hidden="true" className="size-[7px] -translate-y-0.5 rounded-full bg-site-moss" />
          <span className="font-site-mono text-xs text-site-cedar max-xs:hidden">Portland, OR</span>
        </a>
        <a
          href={BOOK_CALL}
          className="whitespace-nowrap rounded-full bg-site-moss px-4 py-2.5 text-sm font-semibold leading-[1.2] text-site-fir transition-colors hover:bg-site-cream"
        >
          Book a call
        </a>
      </nav>
    </div>
  );
}
