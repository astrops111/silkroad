import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export type EditorialItem = {
  title: string;
  description: string;
  image: string;
  href: string;
  tag: string;
};

type Props = {
  eyebrow?: string;
  title: string;
  items: EditorialItem[];
};

export function EditorialBand({ eyebrow, title, items }: Props) {
  return (
    <section className="py-16 lg:py-20 bg-[var(--surface-secondary)]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="mb-10 max-w-2xl">
          {eyebrow && (
            <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
              {eyebrow}
            </span>
          )}
          <h2
            className="mt-2 text-2xl lg:text-3xl font-bold tracking-tight text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group bg-white rounded-2xl overflow-hidden border border-[var(--border-subtle)] hover:shadow-md transition-shadow"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="p-6">
                <span className="text-[11px] font-semibold text-[var(--amber-dark)] tracking-[0.12em] uppercase">
                  {item.tag}
                </span>
                <h3
                  className="mt-2 text-lg font-bold text-[var(--obsidian)] leading-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--text-primary)] group-hover:gap-2 transition-all">
                  Read guide
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
