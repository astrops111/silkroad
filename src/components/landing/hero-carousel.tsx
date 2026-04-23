"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";

type Slide = {
  image: string;
  alt: string;
  badge: string;
  headline: string;
  tagline: string;
  ctaLabel: string;
  ctaHref: string;
  steps?: { num: string; label: string }[];
};

const AUTOPLAY_MS = 6000;

export function HeroCarousel() {
  const t = useTranslations("marketing.products.hero");

  const slides: Slide[] = [
    {
      image:
        "https://images.pexels.com/photos/33626641/pexels-photo-33626641.jpeg?auto=compress&cs=tinysrgb&w=1800",
      alt: "Manufacturing factory floor with assembly line",
      badge: t("badge"),
      headline: t("headline"),
      tagline: t("tagline"),
      ctaLabel: t("browseCta"),
      ctaHref: "/marketplace",
    },
    {
      image:
        "https://images.pexels.com/photos/18609057/pexels-photo-18609057.jpeg?auto=compress&cs=tinysrgb&w=1800",
      alt: "Cargo ship loaded with shipping containers at port",
      badge: t("slide2.badge"),
      headline: t("slide2.headline"),
      tagline: t("slide2.tagline"),
      ctaLabel: t("slide2.cta"),
      ctaHref: "/how-to-buy",
      steps: [
        { num: "1", label: t("slide2.step1") },
        { num: "2", label: t("slide2.step2") },
        { num: "3", label: t("slide2.step3") },
      ],
    },
    {
      image:
        "https://images.pexels.com/photos/34191411/pexels-photo-34191411.jpeg?auto=compress&cs=tinysrgb&w=1800",
      alt: "Warehouse with stacked goods ready for export",
      badge: t("slide3.badge"),
      headline: t("slide3.headline"),
      tagline: t("slide3.tagline"),
      ctaLabel: t("slide3.cta"),
      ctaHref: "/how-it-works#logistics",
    },
  ];

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, count]);

  const go = (n: number) => setIndex(((n % count) + count) % count);

  return (
    <div
      className="relative isolate overflow-hidden rounded-2xl min-h-[480px] lg:min-h-[600px] border border-[var(--border-subtle)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {slides.map((slide, i) => {
        const active = i === index;
        return (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${
              active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
            aria-hidden={!active}
            aria-roledescription="slide"
          >
            <Image
              src={slide.image}
              alt={slide.alt}
              fill
              priority={i === 0}
              sizes="(max-width: 1024px) 100vw, 65vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />

            <div className="relative h-full flex flex-col justify-end p-8 lg:p-14">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 mb-5 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--amber)]" />
                <span className="text-[11px] font-semibold text-white tracking-wide uppercase">
                  {slide.badge}
                </span>
              </span>
              <h1
                className="text-[clamp(2.5rem,5.5vw,4.5rem)] font-bold leading-[1.05] tracking-tight text-white max-w-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {slide.headline}
              </h1>
              <p className="mt-5 text-base lg:text-lg text-white/85 max-w-xl leading-relaxed">
                {slide.tagline}
              </p>
              {slide.steps && (
                <div className="mt-6 flex flex-wrap items-center gap-2 max-w-2xl">
                  {slide.steps.map((step, si) => (
                    <div key={step.num} className="flex items-center gap-2">
                      <div className="flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-full bg-white/12 backdrop-blur-md border border-white/20">
                        <span className="w-6 h-6 rounded-full bg-[var(--amber)] text-[var(--obsidian)] text-xs font-black flex items-center justify-center">
                          {step.num}
                        </span>
                        <span className="text-sm font-semibold text-white">
                          {step.label}
                        </span>
                      </div>
                      {si < slide.steps!.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-white/50" />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href={slide.ctaHref}
                  className="btn-primary !py-3.5 !px-7 !text-sm"
                >
                  {slide.ctaLabel}
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => go(index - 1)}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-colors"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={() => go(index + 1)}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-colors"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {slides.map((_, i) => {
          const active = i === index;
          return (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={active}
              className={`h-1.5 rounded-full transition-all ${
                active ? "w-8 bg-white" : "w-4 bg-white/40 hover:bg-white/60"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
