/**
 * T191 (CodeQL js/request-forgery) — classificação de IPs perigosos para
 * HTTP outbound (anti-SSRF). 100% puro (sem I/O), usado pelo url-guard antes
 * (IP literal na URL) e depois da resolução DNS (proteção anti-rebinding).
 *
 * Fail-closed: formatos desconhecidos/inválidos contam como perigosos.
 */

function octetosV4(ip: string): [number, number, number, number] | null {
  const partes = ip.split(".");
  const [p0, p1, p2, p3] = partes;
  if (
    partes.length !== 4 ||
    p0 === undefined ||
    p1 === undefined ||
    p2 === undefined ||
    p3 === undefined
  ) {
    return null;
  }
  const conv = (p: string): number => (/^\d{1,3}$/.test(p) ? Number(p) : -1);
  const a = conv(p0);
  const b = conv(p1);
  const c = conv(p2);
  const d = conv(p3);
  if ([a, b, c, d].some((n) => n < 0 || n > 255)) return null;
  return [a, b, c, d];
}

function v4Perigoso(o: [number, number, number, number]): boolean {
  const [a, b, c] = o;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local / metadata (169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24
  if (a === 192 && b === 0 && c === 2) return true; // TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmark 198.18.0.0/15
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  if (a >= 224) return true; // multicast (224/4), reserved (240/4), broadcast
  return false;
}

type OitoGrupos = [number, number, number, number, number, number, number, number];

/** Converte lista em tupla de 8 grupos (sem cast); null se o tamanho não fechar. */
function paraOito(valores: number[]): OitoGrupos | null {
  const [g0, g1, g2, g3, g4, g5, g6, g7] = valores;
  if (
    g0 === undefined ||
    g1 === undefined ||
    g2 === undefined ||
    g3 === undefined ||
    g4 === undefined ||
    g5 === undefined ||
    g6 === undefined ||
    g7 === undefined
  ) {
    return null;
  }
  return [g0, g1, g2, g3, g4, g5, g6, g7];
}

/** Expande IPv6 (inclui cauda IPv4 mapeada) para 8 grupos; null se inválido. */
function expandirV6(ipBruto: string): OitoGrupos | null {
  let ip = ipBruto;
  if (ip.includes(".")) {
    const idx = ip.lastIndexOf(":");
    if (idx < 0) return null;
    const v4 = octetosV4(ip.slice(idx + 1));
    if (!v4) return null;
    const g1 = ((v4[0] << 8) | v4[1]).toString(16);
    const g2 = ((v4[2] << 8) | v4[3]).toString(16);
    ip = `${ip.slice(0, idx + 1)}${g1}:${g2}`;
  }
  const partes = ip.split("::");
  if (partes.length > 2) return null;
  const paraNums = (s: string): number[] | null => {
    if (!s) return [];
    const nums: number[] = [];
    for (const g of s.split(":")) {
      if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
      nums.push(parseInt(g, 16));
    }
    return nums;
  };
  const esq = paraNums(partes[0] ?? "");
  if (!esq) return null;
  if (partes.length === 1) return paraOito(esq);
  const dir = paraNums(partes[1] ?? "");
  if (!dir) return null;
  const faltam = 8 - esq.length - dir.length;
  if (faltam < 0) return null;
  return paraOito([...esq, ...Array<number>(faltam).fill(0), ...dir]);
}

function v6Perigoso(ip: string): boolean {
  const h = expandirV6(ip);
  if (!h) return true; // inválido → fail-closed
  const [h0, h1] = h;
  if (h.every((x) => x === 0)) return true; // ::
  if (h.slice(0, 7).every((x) => x === 0) && h[7] === 1) return true; // ::1
  if ((h0 & 0xfe00) === 0xfc00) return true; // ULA fc00::/7
  if ((h0 & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
  if ((h0 & 0xff00) === 0xff00) return true; // multicast ff00::/8
  if (h0 === 0x2002) return true; // 6to4 2002::/16
  if (h0 === 0x2001 && h1 === 0x0db8) return true; // documentação
  if (h0 === 0x2001 && h1 === 0) return true; // teredo 2001::/32
  const v4Embutido = (): boolean => {
    const octetos: [number, number, number, number] = [
      h[6] >> 8,
      h[6] & 0xff,
      h[7] >> 8,
      h[7] & 0xff,
    ];
    return v4Perigoso(octetos);
  };
  const prefixoZero = (ate: number) => h.slice(0, ate).every((x) => x === 0);
  if (h[5] === 0xffff && prefixoZero(5)) return v4Embutido(); // ::ffff:a.b.c.d
  if (h[0] === 0x0064 && h[1] === 0xff9b && h.slice(2, 6).every((x) => x === 0)) {
    return v4Embutido(); // NAT64 64:ff9b::/96
  }
  return false;
}

/** true para loopback/privado/link-local/metadata/reservado/inválido. */
export function ipPerigoso(ip: string): boolean {
  const bruto = ip
    .trim()
    .replace(/^\[|\]$/g, "")
    .toLowerCase();
  if (!bruto) return true;
  if (bruto.includes(":")) return v6Perigoso(bruto);
  const o = octetosV4(bruto);
  if (!o) return true;
  return v4Perigoso(o);
}
