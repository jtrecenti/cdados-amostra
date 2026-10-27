/* Configuração do app da amostra da sala (Ciência dos Dados, engenharia).
   Em desenvolvimento: abra o app com ?proxy=http://localhost:8787 */

const PADROES = {
  proxy: "https://cdadeng-amostra.julio-trecenti.workers.dev",
  dominioEmail: "@al.insper.edu.br",
};

const params = new URLSearchParams(location.search);

export const CONFIG = {
  ...PADROES,
  proxy: (params.get("proxy") || PADROES.proxy).replace(/\/+$/, ""),
  /* ?semregistro=1 não envia nada ao Worker (para testar sem poluir o painel). */
  registrar: params.get("semregistro") !== "1",
};
