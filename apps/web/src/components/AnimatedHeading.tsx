"use client";

import { useEffect, useRef } from "react";
import { gsap, SplitText } from "@/lib/gsap-config";

export function AnimatedHeading({
  children,
  className,
  id,
  as: Tag = "h2",
}: {
  children: string;
  className?: string;
  id?: string;
  as?: "h1" | "h2" | "h3";
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || !ref.current) return;

    const ctx = gsap.context(() => {
      const split = new SplitText(ref.current, { type: "words" });
      gsap.from(split.words, {
        opacity: 0,
        y: 20,
        stagger: 0.04,
        duration: 0.5,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
        },
      });
      return () => split.revert();
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <Tag ref={ref} id={id} className={className}>
      {children}
    </Tag>
  );
}
