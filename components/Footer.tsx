import Link from "next/link";
import { getContent } from "@/lib/content";

/** SPEC 14: every page carries a link to the basis and the privacy pages. */
export function Footer() {
  const t = getContent();
  return (
    <footer className="wrap tiny dim" style={{ padding: "3rem 1.25rem 2.5rem" }}>
      <hr className="rule" style={{ marginTop: 0 }} />
      <p>
        <Link href="/alus">{t.footer.about}</Link>
        {" · "}
        <Link href="/privaatsus">{t.footer.privacy}</Link>
      </p>
      <p>{t.footer.brand}</p>
    </footer>
  );
}
