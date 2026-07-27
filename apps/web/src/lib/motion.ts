"use client";

import { gsap, ScrollTrigger } from "@/lib/gsap-config";
import { animate } from "animejs";
import { useReducedMotion } from "motion/react";
import type { Variants } from "motion/react";

export const scrollRevealDefaults = {
	from: { opacity: 0, y: 40, scale: 0.97 },
	to: { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "power2.out" },
	scrollTrigger: { start: "top 85%", toggleActions: "play none none none" },
} as const;

export function initScrollReveal(
	element: Element | Element[],
	options?: Record<string, unknown>,
): void {
	const prefersReduced =
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	if (prefersReduced) return;

	const mergedFrom = {
		...scrollRevealDefaults.from,
		...(options?.from as Record<string, unknown>),
	};
	const mergedTo = {
		...scrollRevealDefaults.to,
		...(options?.to as Record<string, unknown>),
	};
	const mergedST = {
		...scrollRevealDefaults.scrollTrigger,
		...(options?.scrollTrigger as Record<string, unknown>),
	};

	gsap.fromTo(element, mergedFrom, {
		...mergedTo,
		scrollTrigger: mergedST,
	});
}

export function scoreDialAnimation(
	element: SVGElement,
	targetPercent: number,
): void {
	const prefersReduced =
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	if (prefersReduced) return;

	const circle = element.querySelector("circle") ?? element;
	const r = Number.parseFloat(circle.getAttribute("r") ?? "0");
	const circumference = 2 * Math.PI * r;

	circle.setAttribute("stroke-dasharray", `${circumference}`);

	const targetOffset = circumference * (1 - targetPercent / 100);

	animate(circle, {
		"stroke-dashoffset": [circumference, targetOffset],
		duration: 1000,
		ease: "easeOutExpo",
	});

	const glowTarget = element.closest("[data-score-glow]") ?? element;
	animate(glowTarget as HTMLElement, {
		filter: [
			"drop-shadow(0 0 4px rgba(129,140,248,0.3))",
			"drop-shadow(0 0 18px rgba(129,140,248,0.7))",
			"drop-shadow(0 0 4px rgba(129,140,248,0.3))",
		],
		duration: 1000,
		ease: "easeOutExpo",
	});
}

export function parallaxScroll(element: Element, speed = 0.5): void {
	gsap.to(element, {
		y: () => window.innerHeight * speed,
		ease: "none",
		scrollTrigger: {
			trigger: element,
			start: "top bottom",
			end: "bottom top",
			scrub: true,
		},
	});
}

export const cinematicEntry: Variants = {
	hidden: {
		opacity: 0,
		y: 30,
		filter: "blur(8px)",
	},
	visible: {
		opacity: 1,
		y: 0,
		filter: "blur(0px)",
		transition: {
			duration: 0.8,
			ease: [0.25, 0.1, 0.25, 1],
		},
	},
};

export function neonGlow(color = "#818CF8"): {
	textShadow: string;
	boxShadow: string;
} {
	return {
		textShadow: `0 0 7px ${color}, 0 0 10px ${color}, 0 0 21px ${color}, 0 0 42px ${color}`,
		boxShadow: `0 0 7px ${color}, 0 0 10px ${color}, inset 0 0 7px ${color}`,
	};
}

export function staggerChildren(staggerSeconds = 0.08): Variants {
	return {
		hidden: {},
		visible: {
			transition: {
				staggerChildren: staggerSeconds,
			},
		},
	};
}

export { useReducedMotion };
