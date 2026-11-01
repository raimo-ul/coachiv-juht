/**
 * The newsletter, as a block with a real button.
 *
 * It started as a checkbox on the email screen that subscribed nobody, then
 * became a text link tucked under the contact box where nobody would find it.
 * This is the third shape and the first one that admits what it is: an offer,
 * in the two places a person is deciding what happens next.
 *
 * On the report it sits under the paid CTA, for the many who take a free test
 * and will not spend fifteen euros. The copy keeps Raimo's conditional, "kui
 * sprint praegu ei sobi", on purpose: an escape hatch presented as an equal
 * choice would pull people away from the thing that would actually help them.
 * So the button is quieter than the one above it.
 *
 * On the final report it sits last, after the caveat and the contact line,
 * because the reflection's question is meant to be the page's own last word
 * and a signup button should not compete with it.
 *
 * Hidden in print. A saved PDF carrying a signup button is a dead rectangle.
 */
export function NewsletterBlock({
  text,
  button,
  url,
  tone = "plain",
}: {
  text: string;
  button: string;
  url: string;
  /** "bone" on a white page, "plain" on a tinted one. */
  tone?: "plain" | "bone";
}) {
  return (
    <section className="border-b-2 border-rule print:hidden">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <div
          className={`flex flex-col gap-5 border-2 border-rule p-6 sm:flex-row sm:items-center sm:justify-between ${
            tone === "bone" ? "bg-bone" : "bg-background"
          }`}
        >
          <p className="max-w-md text-lg leading-snug">{text}</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 border-2 border-rule bg-background px-6 py-3 text-center font-semibold transition-colors hover:bg-signal-soft"
          >
            {button}
          </a>
        </div>
      </div>
    </section>
  );
}
