import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";

export default function NotFound() {
  return (
    <PageShell>
      <div className="paper center">
        <p className="kicker">404</p>
        <h1 className="h1">This room is not on the floor plan.</h1>
        <p className="lead">The address leads to no page, or the page moved.</p>
        <Link href="/" className="btn btn-orange">
          Back to the office
        </Link>
      </div>
    </PageShell>
  );
}
