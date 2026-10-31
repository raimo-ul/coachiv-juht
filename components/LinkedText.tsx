import Link from "next/link";

/**
 * Render a sentence from et.json with one word inside it turned into a link.
 *
 * The alternative was reshaping the sentence in code (splitting it on a colon,
 * dropping the tail, appending a link). That writes user-visible text in code,
 * which CLAUDE.md forbids, and it breaks the moment Raimo rewords the line.
 *
 * This only locates a label that is already in the sentence. If the label is
 * not there, the sentence renders exactly as written and nothing is lost.
 *
 * mailto: and https: get a plain anchor; next/link is for routes within the
 * app and would prefetch an address that is not a page.
 */
export function LinkedText({
  text, label, href, className,
}: {
  text: string;
  label: string;
  href: string;
  className?: string;
}) {
  const at = text.lastIndexOf(label);
  if (at === -1) return <>{text}</>;

  const before = text.slice(0, at);
  const after = text.slice(at + label.length);
  const external = !href.startsWith("/");

  return (
    <>
      {before}
      {external ? (
        <a href={href} className={className}>{label}</a>
      ) : (
        <Link href={href} className={className}>{label}</Link>
      )}
      {after}
    </>
  );
}
