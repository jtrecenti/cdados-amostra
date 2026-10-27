/* ==========================================================================
   Amostra da sala · tela do aluno

   Duas etapas, no mesmo endereço:

     /                    a média: sorteia 100 apartamentos e calcula o VM2 médio
     /?etapa=ic          o intervalo: a mesma amostra, e o intervalo de 95%

   O sorteio acontece aqui, no celular, com o login como semente. A "célula"
   imita o notebook e mostra exatamente o código que corresponde à conta; a
   conta em si é feita em JavaScript, porque carregar um python inteiro no
   celular de sessenta pessoas, na rede da sala, seria pedir para a atividade
   travar.
   ========================================================================== */

import { CONFIG } from "./config.js";
import { el, $, limpar } from "./ui.js";
import {
  AMOSTRA, carregarPopulacao, normalizarLogin, sementeDoLogin, sortear,
  valores, media, intervalo, fmt,
} from "./amostra.js";

const ETAPA = new URLSearchParams(location.search).get("etapa") === "ic" ? "ic" : "media";
const CHAVE_LOGIN = "cdad2-amostra-login";

const estado = {
  pop: null,
  login: null,
  amostra: null,
  calculo: null, // o que vai para o painel
  rodouA: false, // na etapa do intervalo, a primeira célula
};

function lembrado() {
  try { return localStorage.getItem(CHAVE_LOGIN) || ""; } catch { return ""; }
}

function lembrar(login) {
  try { localStorage.setItem(CHAVE_LOGIN, login); } catch { /* navegação privada */ }
}

async function enviar(corpo) {
  const r = await fetch(`${CONFIG.proxy}/amostra/enviar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.erro || `erro ${r.status}`);
  return dados;
}

/* ---------- login ---------------------------------------------------------- */

function telaLogin(erro = "") {
  const tela = limpar($("#tela"));
  const campo = el("input", {
    id: "login", type: "text", inputmode: "email", autocomplete: "username",
    autocapitalize: "none", spellcheck: "false", placeholder: "seu login",
    value: lembrado(),
  });
  const botao = el("button.acao", { type: "button", texto: "sortear a minha amostra" });
  const entrar = () => {
    const login = normalizarLogin(campo.value);
    if (!login) return telaLogin("Confira o login: só letras, números, ponto, hífen ou sublinhado.");
    estado.login = login;
    lembrar(login);
    estado.amostra = sortear(estado.pop.linhas, AMOSTRA.n, sementeDoLogin(login));
    estado.calculo = null;
    estado.rodouA = false;
    telaAmostra();
  };
  botao.addEventListener("click", entrar);
  campo.addEventListener("keydown", (ev) => { if (ev.key === "Enter") entrar(); });

  tela.append(
    el("h1", {
      texto: ETAPA === "media"
        ? "Quanto vale o metro quadrado de um apartamento em São Paulo?"
        : "O intervalo de confiança da sua amostra",
    }),
    el("p", {
      texto: ETAPA === "media"
        ? `A população de hoje são os ${estado.pop.linhas.length.toLocaleString("pt-BR")} apartamentos ` +
          `vendidos em São Paulo em 2025 (ITBI, a base do Projeto 2). O site vai sortear ${AMOSTRA.n} deles para você: é a sua amostra.`
        : "Digite o mesmo login da primeira etapa: a amostra sorteada é a mesma.",
    }),
    el("div.login", {}, [campo, el("span", { texto: CONFIG.dominioEmail })]),
    erro ? el("div.painel.aviso", { texto: erro }) : null,
    botao,
  );
}

/* ---------- a amostra -------------------------------------------------------- */

function tabelaAmostra() {
  const corpo = el("tbody", {}, estado.amostra.map((l, i) => el("tr", {}, [
    el("td.num", { texto: String(i + 1) }),
    el("td", { texto: estado.pop.distritos[l[0]] }),
    el("td.num", { texto: String(l[1]) }),
    el("td.num", { texto: fmt(l[2], 0) }),
  ])));
  return el("div.tabela", {}, [el("table", {}, [
    el("thead", {}, [el("tr", {}, [
      el("th.num", { texto: "#" }),
      el("th", { texto: "distrito" }),
      el("th.num", { texto: "área (m²)" }),
      el("th.num", { texto: "vm2 (R$/m²)" }),
    ])]),
    corpo,
  ])]);
}

/**
 * Uma célula de notebook de mentira. `linhas` é o código, que pode ter um
 * campo de digitar no meio; `rodar` devolve o texto da saída ou lança erro,
 * que aparece em vermelho como no notebook.
 */
function celula(linhas, rodar, explica = "") {
  const saida = el("div.saida", { hidden: true });
  const nota = el("div.explica", { hidden: true, texto: explica });
  const botao = el("button.rodar", { type: "button", texto: "▶ rodar" });
  botao.addEventListener("click", () => {
    saida.hidden = false;
    try {
      saida.textContent = rodar();
      saida.classList.remove("erro");
      nota.hidden = !explica;
    } catch (erro) {
      saida.textContent = String(erro.message || erro);
      saida.classList.add("erro");
      nota.hidden = true;
    }
  });
  return el("div.celula", {}, [
    el("div.cabeca", {}, [el("span", { texto: "python" }), botao]),
    el("pre", {}, linhas),
    saida,
    nota,
  ]);
}

function telaAmostra() {
  const tela = limpar($("#tela"));
  const v = valores(estado.amostra);
  const status = el("div");
  const botaoEnviar = el("button.acao", { type: "button", texto: "enviar para o painel", disabled: true });

  const liberarEnvio = () => { botaoEnviar.disabled = false; };

  tela.append(
    el("div.painel.ok", {}, [
      el("b", { texto: `Sua amostra: ${AMOSTRA.n} apartamentos` }),
      `Sorteados entre os ${estado.pop.linhas.length.toLocaleString("pt-BR")} da base, ` +
        `com ${estado.login}${CONFIG.dominioEmail} como semente.`,
    ]),
    el("p", { texto: "A coluna que interessa é o vm2: o valor da venda dividido pela área construída, em reais por metro quadrado." }),
    tabelaAmostra(),
  );

  if (ETAPA === "media") {
    tela.append(
      el("p", { texto: "Rode a célula para calcular o vm2 médio na sua amostra." }),
      celula(
        ['round(amostra["vm2"].mean(), 1)'],
        () => {
          const m = media(v);
          estado.calculo = { media: m };
          liberarEnvio();
          return m.toFixed(1);
        },
        `É a sua estimativa do vm2 médio dos ${estado.pop.linhas.length.toLocaleString("pt-BR")} apartamentos.`,
      ),
    );
  } else {
    const campoZ = el("input", { type: "text", inputmode: "decimal", placeholder: "?", "aria-label": "valor de z" });
    tela.append(
      el("p", { texto: "Rode a primeira célula: ela calcula a média, o desvio-padrão e o erro-padrão." }),
      celula(
        [
          'media = amostra["vm2"].mean()\n',
          'dp = amostra["vm2"].std()\n',
          "n = len(amostra)\n",
          "ep = dp / n ** 0.5\n",
          "round(media, 1), round(dp, 1), round(ep, 1)",
        ],
        () => {
          const r = intervalo(v);
          estado.rodouA = true;
          return `(${r.media.toFixed(1)}, ${r.dp.toFixed(1)}, ${r.ep.toFixed(1)})`;
        },
      ),
      el("p", { texto: "Agora complete o z com o número da normal para 95% de confiança, e rode." }),
      celula(
        ["z = ", campoZ, "\n", "round(media - z * ep, 1), round(media + z * ep, 1)"],
        () => {
          if (!estado.rodouA) throw new Error("NameError: name 'ep' is not defined (rode a célula de cima primeiro)");
          const z = Number(String(campoZ.value).replace(",", "."));
          if (!campoZ.value.trim() || !Number.isFinite(z)) {
            throw new Error("SyntaxError: falta o valor de z (o número do slide)");
          }
          if (z < 0.5 || z > 4) throw new Error("Esse z não parece o da normal para 95%: confira o slide.");
          const r = intervalo(v, z);
          estado.calculo = { media: r.media, lo: r.lo, hi: r.hi, z };
          liberarEnvio();
          return `(${r.lo.toFixed(1)}, ${r.hi.toFixed(1)})`;
        },
        `É o seu intervalo de 95% para o vm2 médio dos ${estado.pop.linhas.length.toLocaleString("pt-BR")} apartamentos.`,
      ),
    );
  }

  botaoEnviar.addEventListener("click", async () => {
    if (!estado.calculo) return;
    botaoEnviar.disabled = true;
    limpar(status);
    try {
      if (CONFIG.registrar) {
        await enviar({ etapa: ETAPA, login: estado.login, ...estado.calculo });
      }
      const c = estado.calculo;
      status.append(el("div.painel.ok", {}, [
        el("b", { texto: "Enviado. Olhe para o telão." }),
        ETAPA === "media"
          ? `VM2 médio na sua amostra: R$ ${fmt(c.media, 0)} por m².`
          : `Seu intervalo: de R$ ${fmt(c.lo, 0)} a R$ ${fmt(c.hi, 0)} por m².`,
      ]));
    } catch (erro) {
      status.append(el("div.painel.aviso", {}, [
        el("b", { texto: "Não consegui enviar." }),
        `${erro.message || erro}. Tente de novo em alguns segundos.`,
      ]));
    } finally {
      botaoEnviar.disabled = false;
    }
  });

  tela.append(
    botaoEnviar,
    status,
    el("button.acao.secundaria", {
      type: "button", texto: "trocar de login", style: "margin-top:.8rem",
      onclick: () => telaLogin(),
    }),
  );
}

/* ---------- início --------------------------------------------------------- */

async function iniciar() {
  $("#etapa").textContent = ETAPA === "media" ? "etapa 1 · a média" : "etapa 2 · o intervalo";
  try {
    estado.pop = await carregarPopulacao();
  } catch (erro) {
    limpar($("#tela")).append(el("div.painel.aviso", { texto: String(erro.message || erro) }));
    return;
  }
  telaLogin();
}

iniciar();
