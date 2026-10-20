// Paleta e geometria compartilhadas pelos scripts do logo MEDIA Rate.

export const C = {
  ink: "#0F172A",
  night: "#05050A",
  surface: "#12121C",
  line: "#2A2A3D",
  indigo: "#818CF8",
  rose: "#E11D48",
  sky: "#38BDF8",
  white: "#FFFFFF",
  muted: "#A0A0B8",
};

const rad = (d) => (d * Math.PI) / 180;
export const pt = (cx, cy, r, deg) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];
const n = (v) => Number(v.toFixed(3));

/** Isosceles triangle pointing along `angleDeg`, apex at apexDist, base at baseDist. */
export function triangleD(cx, cy, angleDeg, apexDist, baseDist, halfBase) {
  const [ax, ay] = pt(cx, cy, apexDist, angleDeg);
  const bc = pt(cx, cy, baseDist, angleDeg);
  const perp = [Math.cos(rad(angleDeg + 90)), Math.sin(rad(angleDeg + 90))];
  const p0 = [bc[0] + perp[0] * halfBase, bc[1] + perp[1] * halfBase];
  const p1 = [bc[0] - perp[0] * halfBase, bc[1] - perp[1] * halfBase];
  return `M${n(ax)} ${n(ay)}L${n(p0[0])} ${n(p0[1])}L${n(p1[0])} ${n(p1[1])}Z`;
}
