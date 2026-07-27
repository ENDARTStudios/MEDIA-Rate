"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
};

const linkHover = "relative text-sm text-[#9CA3AF] transition-colors duration-200 hover:text-[#818CF8] after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-[#818CF8] after:transition-all after:duration-200 hover:after:w-full";

export function MotionFooter() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");

  const year = new Date().getFullYear();

  return (
    <footer
      className="relative bg-[#09090F] pt-20 pb-8 border-t border-[rgba(129,140,248,0.08)]"
      role="contentinfo"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(129,140,248,0.03)_0%,transparent_60%)] pointer-events-none" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="col-span-2 md:col-span-1"
          >
            <motion.div
              className="text-lg font-heading font-bold text-[#EDE7DC] mb-2"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
            >
              MEDIA Rate
            </motion.div>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              {t("tagline")}
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <h4 className="text-xs font-heading font-semibold text-[#EDE7DC] uppercase tracking-widest mb-4">
              {tNav("catalog")}
            </h4>
            <ul className="space-y-3">
              <li><Link href="/catalog" className={linkHover}>{tNav("catalog")}</Link></li>
              <li><Link href="/pricing" className={linkHover}>{tNav("pricing")}</Link></li>
              <li><Link href="#sobre" className={linkHover}>Sobre</Link></li>
            </ul>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <h4 className="text-xs font-heading font-semibold text-[#EDE7DC] uppercase tracking-widest mb-4">
              Legal
            </h4>
            <ul className="space-y-3">
              <li><Link href="/privacy" className={linkHover}>{t("privacy")}</Link></li>
              <li><a href="#" className={linkHover}>{t("terms")}</a></li>
              <li><Link href="/user/data" className={linkHover}>LGPD</Link></li>
            </ul>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <h4 className="text-xs font-heading font-semibold text-[#EDE7DC] uppercase tracking-widest mb-4">
              Social
            </h4>
            <div className="flex gap-4">
              {[
                { label: "Twitter / X", href: "#" },
                { label: "GitHub", href: "#" },
                { label: "Discord", href: "#" },
              ].map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  className="text-sm text-[#9CA3AF] hover:text-[#818CF8] transition-colors duration-200"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={social.label}
                >
                  {social.label}
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          className="pt-8 border-t border-[rgba(129,140,248,0.08)] flex flex-col sm:flex-row justify-between items-center gap-4"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          <p className="text-xs text-[#6B7280]">&copy; {year} MEDIA Rate. {t("rights")}</p>
          <p className="text-xs text-[#6B7280]">MEDIA Score&trade; &middot; END ART Studios</p>
        </motion.div>
      </div>
    </footer>
  );
}
