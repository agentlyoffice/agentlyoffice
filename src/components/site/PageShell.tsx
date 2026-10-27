import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";

/** Navbar, a cream reading column and the footer, for every page that is not the office itself. */
export function PageShell({ children, current }: { children: React.ReactNode; current?: "docs" | "token" }) {
  return (
    <div className="page">
      <SiteNav current={current} />
      <main id="main-content" className="page-main">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
