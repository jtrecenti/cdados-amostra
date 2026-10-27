/* ==========================================================================
   Amostra da sala (aulas 21 e 22) · o que o celular e o painel compartilham

   Adaptado da amostra da sala do CDAD II (Direito). O celular sorteia a
   amostra do aluno a partir do login, e o painel sorteia as amostras
   simuladas do botão "+30". As duas coisas precisam da mesma base, do mesmo
   tamanho de amostra e das mesmas contas, e é por isso que moram aqui.

   Sobre a base: os 61.550 apartamentos vendidos em São Paulo em 2025, das
   guias de ITBI do Projeto 2, com os filtros de perfil do enunciado e o VM2
   entre o p1 e o p99 (ver ../preparar.py). Na aula ela é a população. O
   arquivo é público, então um aluno curioso consegue calcular o parâmetro:
   "em teoria" ninguém tem acesso, e a atividade não vale nota.

   Por que 100: o VM2 é assimétrico (assimetria 1,1), e com 100 o intervalo de
   95% com z = 1,96 acerta perto de 95%. E a raiz de 100 é 10, o que deixa a
   conta do erro-padrão de cabeça.
   ========================================================================== */

export const AMOSTRA = {
  n: 100,
  // Muda a semente de todo mundo de uma vez. Trocar entre semestres, para a
  // amostra de um login não se repetir de uma turma para outra.
  sal: "cdadeng-2026-2-aula21",
  // Quantas amostras cada login pode mandar por etapa (o Worker confere).
  maxAmostras: 100,
};

let cache = null;

export async function carregarPopulacao() {
  if (!cache) {
    const r = await fetch("populacao.json");
    if (!r.ok) throw new Error(`não consegui carregar a base (${r.status})`);
    cache = await r.json();
  }
  return cache;
}

/** Minúsculas, sem espaço e sem o domínio, se a pessoa colou o e-mail inteiro. */
export function normalizarLogin(texto) {
  const v = String(texto || "").trim().toLowerCase().replace(/@.*$/, "");
  return /^[a-z0-9._-]{2,40}$/.test(v) ? v : null;
}

/* ---------- sorteio determinístico --------------------------------------- */

/*
 * cyrb53 transforma o login num número, e mulberry32 transforma o número numa
 * sequência de sorteios. Os dois cabem em dez linhas e não dependem de
 * biblioteca: o mesmo login dá a mesma amostra em qualquer celular, na etapa
 * da média e na do intervalo.
 */
function cyrb53(texto, semente = 0) {
  let h1 = 0xdeadbeef ^ semente;
  let h2 = 0x41c6ce57 ^ semente;
  for (let i = 0; i < texto.length; i += 1) {
    const c = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A amostra 1 é a do login (a mesma nas duas etapas); as seguintes, do botão
 * "sortear outra", acrescentam o número à semente.
 */
export function sementeDoLogin(login, k = 1) {
  const texto = k === 1 ? `${AMOSTRA.sal}|${login}` : `${AMOSTRA.sal}|${login}|${k}`;
  return cyrb53(texto) % 4294967296;
}

/**
 * Sorteia `n` linhas sem reposição (Fisher-Yates parcial). Sem semente, usa
 * Math.random: é o caso das amostras simuladas do painel.
 */
export function sortear(linhas, n, semente = null) {
  const aleatorio = semente == null ? Math.random : mulberry32(semente);
  const idx = Array.from(linhas.keys());
  for (let i = 0; i < n; i += 1) {
    const j = i + Math.floor(aleatorio() * (idx.length - i));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, n).map((i) => linhas[i]);
}

/* ---------- contas -------------------------------------------------------- */

export const valores = (linhas) => linhas.map((l) => l[2]);

export function media(v) {
  return v.reduce((a, b) => a + b, 0) / v.length;
}

/** Desvio-padrão da amostra, com n - 1, como o `.std()` do pandas. */
export function desvio(v) {
  const m = media(v);
  return Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1));
}

/** Desvio-padrão da população, com n: é o sigma que o painel usa. */
export function desvioPopulacional(v) {
  const m = media(v);
  return Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / v.length);
}

export function intervalo(v, z = 1.96) {
  const m = media(v);
  const s = desvio(v);
  const ep = s / Math.sqrt(v.length);
  return { media: m, dp: s, ep, lo: m - z * ep, hi: m + z * ep, z };
}

export function fmt(x, casas = 2) {
  return Number(x).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}
