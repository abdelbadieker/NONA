import { ChevronDown } from "lucide-react";

export function Faq({
  title,
  items,
}: {
  title: string;
  items: { q: string; a: string }[];
}) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h2 className="text-xl font-bold text-ink sm:text-2xl">{title}</h2>
      <div className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
        {items.map((f, i) => (
          <details key={i} className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-ink">
              {f.q}
              <ChevronDown
                className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
