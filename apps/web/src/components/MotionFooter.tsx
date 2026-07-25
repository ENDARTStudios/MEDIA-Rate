"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { gsap, ScrollTrigger } from "@/lib/gsap-config";

export function MotionFooter() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const tLanding = useTranslations("landing");
  const sectionRef = useRef<HTMLElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || !sectionRef.current || !revealRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          end: "top top",
          scrub: 1,
        },
      });

      tl.from(revealRef.current, {
        y: 100,
        opacity: 0,
        duration: 1.5,
        ease: "power3.out",
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const year = new Date().getFullYear();

  return (
    <footer ref={sectionRef} className="relative bg-black pt-20 pb-8 border-t border-surface-border/30" role="contentinfo">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(225,29,72,0.04)_0%,transparent_60%)] pointer-events-none" aria-hidden="true" />

      <div ref={revealRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h4 className="text-sm font-semibold text-accent-500 mb-4">MEDIA Rate</h4>
            <ul className="space-y-2.5 text-sm text-gray-400">
              <li><Link href="/catalog" className="hover:text-gray-200 transition-colors">{tNav("catalog")}</Link></li>
              <li><Link href="/pricing" className="hover:text-gray-200 transition-colors">{tNav("pricing")}</Link></li>
              <li><span className="text-gray-600">{tLanding("feature1")}</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-accent-500 mb-4">{tLanding("features")}</h4>
            <ul className="space-y-2.5 text-sm text-gray-400">
              <li><span className="text-gray-600">{t("rights")}</span></li>
              <li><span className="text-gray-600">{tNav("profile")}</span></li>
              <li><span className="text-gray-600">{tNav("admin")}</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-accent-500 mb-4">Legal</h4>
            <ul className="space-y-2.5 text-sm text-gray-400">
              <li><Link href="/privacy" className="hover:text-gray-200 transition-colors">{t("privacy")}</Link></li>
              <li><a href="#" className="hover:text-gray-200 transition-colors">{t("terms")}</a></li>
              <li><Link href="/user/data" className="hover:text-gray-200 transition-colors">LGPD</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-accent-500 mb-4">{t("contact")}</h4>
            <ul className="space-y-2.5 text-sm text-gray-400">
              <li><a href="#" className="hover:text-gray-200 transition-colors">X / Twitter</a></li>
              <li><a href="#" className="hover:text-gray-200 transition-colors">GitHub</a></li>
              <li><a href="#" className="hover:text-gray-200 transition-colors">Discord</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-surface-border/30 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-600">&copy; {year} MEDIA Rate. {t("rights")}</p>
          <p className="text-xs text-gray-700">MEDIA Score&trade; &middot; END ART Studios</p>
        </div>
      </div>
    </footer>
  );
}
