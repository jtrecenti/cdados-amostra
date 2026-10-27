/* Os três utilitários de interface que o app usa, copiados de apps/_shared/ui.js do CDAD II. */

export function el(seletor, atributos = {}, filhos = []) {
  const [tag, ...classes] = String(seletor).split(".");
  const nó = document.createElement(tag || "div");
  if (classes.length) nó.className = classes.join(" ");
  for (const [k, v] of Object.entries(atributos || {})) {
    if (v == null || v === false) continue;
    if (k === "class") nó.className = [nó.className, v].filter(Boolean).join(" ");
    else if (k === "texto") nó.textContent = v;
    else if (k === "html") nó.innerHTML = v;
    else if (k === "dataset") Object.assign(nó.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") {
      nó.addEventListener(k.slice(2).toLowerCase(), v);
    } else nó.setAttribute(k, v === true ? "" : v);
  }
  for (const filho of [].concat(filhos)) {
    if (filho == null || filho === false) continue;
    nó.append(filho instanceof Node ? filho : document.createTextNode(String(filho)));
  }
  return nó;
}
export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export function limpar(nó) {
  while (nó.firstChild) nó.removeChild(nó.firstChild);
  // `append(null)` escreve a string "null" na tela. Como a maior parte do código
  // monta listas com condicionais (`condicao ? nó : null`), o append passa a
  // ignorar nulos: é onde o "null" aparecia depois do feedback.
  const originalAppend = nó.append.bind(nó);
  nó.append = (...filhos) => originalAppend(...filhos.filter((f) => f != null && f !== false));
  return nó;
}
