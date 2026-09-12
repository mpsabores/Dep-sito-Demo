// Depósito Demo — script principal
"use strict";
const API_URL =
  "https://script.google.com/macros/s/AKfycbyW1OPWEEcBDK2aVbCSmGLFzSw-1zs6SV4HVUHFmWcQXNuyqVmp7-Ys-1thF3Gj68b3-A/exec";

const CHAVE_TOKEN_ADMIN = "depositoDemoTokenAdmin";
const INTERVALO_ADMIN = 3000;
const CHAVE_REQUISICAO_PEDIDO = "depositoDemoRequisicaoPedido";

const CHAVE_PEDIDO_ATUAL = "depositoDemoPedidoAtual";
const CHAVE_CARRINHO = "depositoDemoCarrinho";
const CHAVE_CLIENTE = "depositoDemoCliente";
const PEDIDO_MINIMO = 12;
const TAXA_CARTAO = 0.0499;

const TAXAS_ENTREGA = {
  centro: 4,
  genaro: 6,
  garcia: 5,
  "jardim-alvorada": 6,
  nova: 7,
  urbis: 6,
  "parque-capuame": 7,
  "parque-petropolis": 8,
};

const NOMES_BAIRROS = {
  centro: "Centro",
  genaro: "Genaro",
  garcia: "Garcia",
  "jardim-alvorada": "Jardim Alvorada",
  nova: "Nova Dias D'Ávila",
  urbis: "Urbis",
  "parque-capuame": "Parque Capuame",
  "parque-petropolis": "Parque Petrópolis",
};

function moeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizarTexto(texto = "") {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function lerCarrinho() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_CARRINHO));
    return Array.isArray(salvo) ? salvo : [];
  } catch {
    return [];
  }
}

function salvarCarrinho(carrinho) {
  localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(carrinho));
}

function lerCliente() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_CLIENTE)) || {};
  } catch {
    return {};
  }
}

function salvarCliente(cliente) {
  localStorage.setItem(CHAVE_CLIENTE, JSON.stringify(cliente));
}

function subtotalCarrinho(carrinho = lerCarrinho()) {
  return carrinho.reduce(
    (total, item) => total + Number(item.preco) * Number(item.quantidade),
    0,
  );
}

function obterStatusLoja(agora = new Date()) {
  const dia = agora.getDay();
  const minutos = agora.getHours() * 60 + agora.getMinutes();
  const fimDeSemana = dia === 0 || dia === 6;
  const abertura = fimDeSemana ? 0 * 60 : 8 * 60;
  const fechamento = fimDeSemana ? 22 * 60 : 19 * 60;
  const aberta = minutos >= abertura && minutos < fechamento;

  let proximaAbertura = "";

  if (!aberta) {
    if (minutos < abertura) {
      proximaAbertura = `Abrimos hoje às ${fimDeSemana ? "09:00" : "08:00"}`;
    } else {
      const amanha = new Date(agora);
      amanha.setDate(agora.getDate() + 1);
      const amanhaFimDeSemana = amanha.getDay() === 0 || amanha.getDay() === 6;
      proximaAbertura = `Abrimos amanhã às ${amanhaFimDeSemana ? "09:00" : "08:00"}`;
    }
  }

  return { aberta, proximaAbertura };
}

function atualizarStatusVisualLoja() {
  const abertaImg = document.querySelector(".aberto-img");
  const fechadaImg = document.querySelector(".fechado-img");
  const textoStatus = document.querySelector(".status-func");

  if (!abertaImg && !fechadaImg && !textoStatus) return;

  const status = obterStatusLoja();

  if (abertaImg) {
    abertaImg.style.display = status.aberta ? "block" : "none";
  }

  if (fechadaImg) {
    fechadaImg.style.display = status.aberta ? "none" : "block";
  }

  if (textoStatus) {
    textoStatus.textContent = status.aberta
      ? "Estamos em Funcionamento Agora"
      : `Loja fechada — ${status.proximaAbertura}`;
  }
}

function obterCardsProdutos() {
  return [...document.querySelectorAll(".produto-card")];
}

function dadosDoCard(card) {
  const nome = card.querySelector(".produto-info h3")?.textContent.trim() || "";
  const descricao =
    card.querySelector(".produto-info p")?.textContent.trim() || "";
  const precoTexto =
    card.querySelector(".preco")?.textContent.trim() || "R$ 0,00";
  const imagem =
    card.querySelector(".produto-img img")?.getAttribute("src") || "";

  const preco = Number(
    precoTexto
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", "."),
  );

  return { nome, descricao, preco, imagem };
}

function adicionarProdutoAoCarrinho(card, botao) {
  const produto = dadosDoCard(card);
  const carrinho = lerCarrinho();

  const existente = carrinho.find(
    (item) => normalizarTexto(item.nome) === normalizarTexto(produto.nome),
  );

  if (existente) {
    existente.quantidade += 1;
  } else {
    carrinho.push({
      nome: produto.nome,
      preco: produto.preco,
      imagem: produto.imagem,
      quantidade: 1,
    });
  }

  salvarCarrinho(carrinho);

  if (botao) {
    const original = botao.textContent;
    botao.textContent = "Adicionado! ✓";
    botao.disabled = true;

    setTimeout(() => {
      botao.textContent = original;
      botao.disabled = false;
    }, 900);
  }
}

function iniciarBotoesProdutos() {
  document.querySelectorAll(".produto-card").forEach((card) => {
    const botao = card.querySelector(".btn-adicionar");
    if (!botao) return;

    botao.addEventListener("click", () =>
      adicionarProdutoAoCarrinho(card, botao),
    );
  });
}

function filtrarProdutos(termo) {
  const cards = obterCardsProdutos();
  if (!cards.length) return false;

  const busca = normalizarTexto(termo);
  let encontrados = 0;

  cards.forEach((card) => {
    const dados = dadosDoCard(card);
    const texto = normalizarTexto(`${dados.nome} ${dados.descricao}`);
    const mostrar = !busca || texto.includes(busca);

    card.style.display = mostrar ? "" : "none";
    if (mostrar) encontrados += 1;
  });

  return encontrados > 0;
}

function iniciarBusca() {
  const form = document.getElementById("form-busca");
  const input = document.getElementById("busca");
  const sugestoes = document.getElementById("sugestoes");

  if (!form || !input) return;

  const cards = obterCardsProdutos();
  const catalogo = cards.map(dadosDoCard);

  function esconderSugestoes() {
    if (sugestoes) {
      sugestoes.innerHTML = "";
      sugestoes.style.display = "none";
    }
  }

  function mostrarSugestoes(valor) {
    if (!sugestoes || !cards.length) return;

    const termo = normalizarTexto(valor);

    if (!termo) {
      esconderSugestoes();
      return;
    }

    const resultados = catalogo
      .filter((produto) =>
        normalizarTexto(`${produto.nome} ${produto.descricao}`).includes(termo),
      )
      .slice(0, 7);

    if (!resultados.length) {
      sugestoes.innerHTML =
        '<span class="item-sugestao">Produto não encontrado</span>';
      sugestoes.style.display = "block";
      return;
    }

    sugestoes.innerHTML = "";

    resultados.forEach((produto) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "item-sugestao";
      item.textContent = produto.nome;

      item.addEventListener("click", () => {
        input.value = produto.nome;
        filtrarProdutos(produto.nome);
        esconderSugestoes();

        const card = cards.find(
          (c) =>
            normalizarTexto(dadosDoCard(c).nome) ===
            normalizarTexto(produto.nome),
        );

        card?.scrollIntoView({ behavior: "smooth", block: "center" });
      });

      sugestoes.appendChild(item);
    });

    sugestoes.style.display = "block";
  }

  input.addEventListener("input", () => {
    if (cards.length) {
      filtrarProdutos(input.value);
      mostrarSugestoes(input.value);
    }
  });

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const termo = input.value.trim();

    if (!termo) return;

    if (!cards.length) {
      window.location.href = `produtos.html?q=${encodeURIComponent(termo)}`;
      return;
    }

    const achou = filtrarProdutos(termo);
    esconderSugestoes();

    if (!achou) alert("Produto não encontrado.");
  });

  document.addEventListener("click", (evento) => {
    if (!form.contains(evento.target)) esconderSugestoes();
  });

  if (cards.length) {
    const params = new URLSearchParams(window.location.search);
    const termoInicial = params.get("q");

    if (termoInicial) {
      input.value = termoInicial;
      filtrarProdutos(termoInicial);
    }
  }
}

function taxaDoBairro(bairro) {
  return TAXAS_ENTREGA[bairro] ?? 0;
}

function coletarDadosCliente() {
  const bairroSelect = document.getElementById("cliente-bairro");

  return {
    nome: document.getElementById("cliente-nome")?.value.trim() || "",
    whatsapp: document.getElementById("cliente-whats")?.value.trim() || "",
    bairro: bairroSelect?.value || "",
    bairroNome:
      bairroSelect?.selectedOptions?.[0]?.textContent.trim() ||
      NOMES_BAIRROS[bairroSelect?.value] ||
      "",
    endereco: document.getElementById("cliente-endereco")?.value.trim() || "",
    referencia:
      document.getElementById("cliente-referencia")?.value.trim() || "",
    observacao:
      document.getElementById("cliente-observacao")?.value.trim() || "",
  };
}

function preencherDadosClienteSalvos() {
  const cliente = lerCliente();

  const campos = {
    "cliente-nome": cliente.nome,
    "cliente-whats": cliente.whatsapp,
    "cliente-bairro": cliente.bairro,
    "cliente-endereco": cliente.endereco,
    "cliente-referencia": cliente.referencia,
    "cliente-observacao": cliente.observacao,
  };

  Object.entries(campos).forEach(([id, valor]) => {
    const campo = document.getElementById(id);
    if (campo && valor) campo.value = valor;
  });
}

function carrinhoValido() {
  const carrinho = lerCarrinho();
  const cliente = coletarDadosCliente();
  const subtotal = subtotalCarrinho(carrinho);
  const status = obterStatusLoja();

  return (
    carrinho.length > 0 &&
    subtotal >= PEDIDO_MINIMO &&
    Boolean(cliente.nome) &&
    Boolean(cliente.whatsapp) &&
    Boolean(cliente.bairro) &&
    cliente.bairro !== "fora-da-area" &&
    Boolean(cliente.endereco) &&
    status.aberta
  );
}

function atualizarBloqueiosCarrinho() {
  const carrinho = lerCarrinho();
  const cliente = coletarDadosCliente();
  const subtotal = subtotalCarrinho(carrinho);

  const alertaMinimo = document.getElementById("alerta-valor-minimo");
  const alertaRegiao = document.getElementById("alerta-regiao");
  const botao = document.getElementById("btn-ir-pagamento");

  if (alertaMinimo) {
    alertaMinimo.style.display =
      carrinho.length > 0 && subtotal < PEDIDO_MINIMO ? "block" : "none";
  }

  if (alertaRegiao) {
    alertaRegiao.style.display =
      cliente.bairro === "fora-da-area" ? "block" : "none";
  }

  if (botao) {
    botao.disabled = !carrinhoValido();

    const status = obterStatusLoja();

    if (carrinho.length === 0) {
      botao.title = "Adicione produtos ao carrinho.";
    } else if (subtotal < PEDIDO_MINIMO) {
      botao.title = `Pedido mínimo: ${moeda(PEDIDO_MINIMO)}.`;
    } else if (
      !cliente.nome ||
      !cliente.whatsapp ||
      !cliente.bairro ||
      !cliente.endereco
    ) {
      botao.title = "Preencha os dados obrigatórios de entrega.";
    } else if (cliente.bairro === "fora-da-area") {
      botao.title = "Esta localidade ainda não é atendida.";
    } else if (!status.aberta) {
      botao.title = `Loja fechada. ${status.proximaAbertura}.`;
    } else {
      botao.title = "";
    }
  }
}

function atualizarTotaisCarrinho() {
  const carrinho = lerCarrinho();
  const cliente = coletarDadosCliente();

  const subtotal = subtotalCarrinho(carrinho);
  const taxa =
    cliente.bairro === "fora-da-area" ? 0 : taxaDoBairro(cliente.bairro);
  const total = subtotal + taxa;

  const subtotalEl = document.getElementById("subtotal-valor");
  const taxaEl = document.getElementById("taxa-valor");
  const totalEl = document.getElementById("total-valor");

  if (subtotalEl) subtotalEl.textContent = moeda(subtotal);
  if (taxaEl) taxaEl.textContent = moeda(taxa);
  if (totalEl) totalEl.textContent = moeda(total);

  atualizarBloqueiosCarrinho();
}

function alterarQuantidade(indice, delta) {
  const carrinho = lerCarrinho();
  if (!carrinho[indice]) return;

  carrinho[indice].quantidade += delta;

  if (carrinho[indice].quantidade <= 0) {
    carrinho.splice(indice, 1);
  }

  salvarCarrinho(carrinho);
  renderizarCarrinho();
}

function removerItem(indice) {
  const carrinho = lerCarrinho();
  carrinho.splice(indice, 1);
  salvarCarrinho(carrinho);
  renderizarCarrinho();
}

function renderizarCarrinho() {
  const container = document.getElementById("itens-carrinho");
  if (!container) return;

  const carrinho = lerCarrinho();

  if (!carrinho.length) {
    container.innerHTML = `
      <div class="carrinho-vazio">
        <img src="img/carrinho-de-compras.png" alt="Carrinho Vazio">
        <p>Seu carrinho está vazio. Que tal adicionar algum item?</p>
      </div>
    `;

    atualizarTotaisCarrinho();
    return;
  }

  container.innerHTML = "";

  carrinho.forEach((item, indice) => {
    const linha = document.createElement("div");
    linha.className = "linha-produto-carrinho";

    linha.innerHTML = `
      <div class="info-item">
        <p class="nome-item-car"></p>
        <div class="controles-qtd">
          <button type="button" class="btn-qtd btn-menos" aria-label="Diminuir quantidade">−</button>
          <span class="qtd-item-car"></span>
          <button type="button" class="btn-qtd btn-mais" aria-label="Aumentar quantidade">+</button>
        </div>
      </div>

      <div class="item-carrinho-preco">
        <span class="preco-item-car"></span>
        <button type="button" class="btn-remover-item" aria-label="Remover item" title="Remover item">🗑️</button>
      </div>
    `;

    linha.querySelector(".nome-item-car").textContent = item.nome;
    linha.querySelector(".qtd-item-car").textContent = item.quantidade;
    linha.querySelector(".preco-item-car").textContent = moeda(
      item.preco * item.quantidade,
    );

    linha
      .querySelector(".btn-menos")
      .addEventListener("click", () => alterarQuantidade(indice, -1));
    linha
      .querySelector(".btn-mais")
      .addEventListener("click", () => alterarQuantidade(indice, 1));
    linha
      .querySelector(".btn-remover-item")
      .addEventListener("click", () => removerItem(indice));

    container.appendChild(linha);
  });

  atualizarTotaisCarrinho();
}

function iniciarCarrinho() {
  const container = document.getElementById("itens-carrinho");
  if (!container) return;

  preencherDadosClienteSalvos();
  renderizarCarrinho();

  const form = document.getElementById("form-dados-cliente");

  if (form) {
    form.addEventListener("input", () => {
      salvarCliente(coletarDadosCliente());
      atualizarTotaisCarrinho();
    });

    form.addEventListener("change", () => {
      salvarCliente(coletarDadosCliente());
      atualizarTotaisCarrinho();
    });
  }

  const botao = document.getElementById("btn-ir-pagamento");

  if (botao) {
    botao.addEventListener("click", () => {
      salvarCliente(coletarDadosCliente());

      if (!carrinhoValido()) {
        atualizarBloqueiosCarrinho();
        return;
      }

      window.location.href = "checkout.html";
    });
  }
}

function preencherTexto(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto;
}

function obterTrocoCheckout() {
  const forma = formaPagamentoSelecionada();

  if (forma !== "dinheiro") {
    return null;
  }

  const campo = document.getElementById("troco");

  if (!campo || !campo.value) {
    return null;
  }

  const valor = Number(campo.value);

  if (!Number.isFinite(valor) || valor <= 0) {
    return null;
  }

  return valor;
}

function preencherCheckoutCliente() {
  const cliente = lerCliente();

  preencherTexto("checkout-nome", cliente.nome || "Não informado");
  preencherTexto("checkout-whatsapp", cliente.whatsapp || "Não informado");
  preencherTexto("checkout-endereco", cliente.endereco || "Não informado");
  preencherTexto(
    "checkout-bairro",
    cliente.bairroNome || NOMES_BAIRROS[cliente.bairro] || "Não informado",
  );
  preencherTexto("checkout-referencia", cliente.referencia || "Não informado");
  preencherTexto(
    "checkout-observacao",
    cliente.observacao || "Nenhuma observação adicionada.",
  );
}

function formaPagamentoSelecionada() {
  return (
    document.querySelector('input[name="forma-pagamento"]:checked')?.value || ""
  );
}

function nomeFormaPagamento(valor) {
  const nomes = {
    pix: "Pix",
    debito: "Cartão de Débito",
    credito: "Cartão de Crédito",
    dinheiro: "Dinheiro",
  };

  return nomes[valor] || "Não informado";
}

function calcularCheckout() {
  const carrinho = lerCarrinho();
  const cliente = lerCliente();

  const subtotal = subtotalCarrinho(carrinho);
  const taxaEntrega = taxaDoBairro(cliente.bairro);
  const forma = formaPagamentoSelecionada();
  const taxaCartao = forma === "credito" ? subtotal * TAXA_CARTAO : 0;
  const total = subtotal + taxaEntrega + taxaCartao;

  return { subtotal, taxaEntrega, taxaCartao, total };
}

function renderizarItensCheckout() {
  const container = document.getElementById("checkout-itens");
  if (!container) return;

  const carrinho = lerCarrinho();

  if (!carrinho.length) {
    container.innerHTML = `
      <div class="checkout-item exemplo-item">
        <div>
          <strong>Carrinho vazio</strong>
          <span>Volte ao catálogo para adicionar produtos.</span>
        </div>
        <strong>${moeda(0)}</strong>
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  carrinho.forEach((item) => {
    const linha = document.createElement("div");
    linha.className = "checkout-item";

    const info = document.createElement("div");
    const nome = document.createElement("strong");
    const qtd = document.createElement("span");
    const preco = document.createElement("strong");

    nome.textContent = item.nome;
    qtd.textContent = `${item.quantidade} ${item.quantidade === 1 ? "unidade" : "unidades"}`;
    preco.textContent = moeda(item.preco * item.quantidade);

    info.append(nome, qtd);
    linha.append(info, preco);
    container.appendChild(linha);
  });
}

function atualizarCheckout() {
  if (!document.getElementById("main-checkout")) return;

  const carrinho = lerCarrinho();
  const cliente = lerCliente();
  const forma = formaPagamentoSelecionada();
  const valores = calcularCheckout();

  preencherTexto("checkout-subtotal", moeda(valores.subtotal));
  preencherTexto("checkout-taxa-entrega", moeda(valores.taxaEntrega));
  preencherTexto("checkout-taxa-cartao", moeda(valores.taxaCartao));
  preencherTexto("checkout-total", moeda(valores.total));

  document
    .getElementById("linha-taxa-cartao")
    ?.classList.toggle("ativo", forma === "credito");
  document
    .getElementById("area-troco")
    ?.classList.toggle("ativo", forma === "dinheiro");

  const botao = document.getElementById("btn-confirmar-pedido");
  if (!botao) return;

  const status = obterStatusLoja();

  const dadosValidos =
    carrinho.length > 0 &&
    Boolean(cliente.nome) &&
    Boolean(cliente.whatsapp) &&
    Boolean(cliente.endereco) &&
    Boolean(cliente.bairro) &&
    cliente.bairro !== "fora-da-area";

  botao.disabled = !(dadosValidos && forma && status.aberta);

  if (!status.aberta) {
    botao.title = `Loja fechada. ${status.proximaAbertura}.`;
  } else if (!dadosValidos) {
    botao.title = "Volte ao carrinho e confira os dados do pedido.";
  } else if (!forma) {
    botao.title = "Escolha uma forma de pagamento.";
  } else {
    botao.title = "";
  }
}

function gerarNumeroPedido() {
  return `#${Math.floor(1000 + Math.random() * 9000)}`;
}

async function confirmarPedidoDemo() {
  const botao = document.getElementById("btn-confirmar-pedido");

  if (!botao || botao.disabled) return;

  const carrinho = lerCarrinho();
  const cliente = lerCliente();
  const forma = formaPagamentoSelecionada();
  const valores = calcularCheckout();
  const trocoPara = obterTrocoCheckout();

  if (forma === "dinheiro" && trocoPara !== null && trocoPara < valores.total) {
    alert(
      `O valor informado para o troco deve ser igual ou maior que ${moeda(valores.total)}.`,
    );

    return;
  }

  const pedido = {
    cliente: {
      nome: cliente.nome || "",
      whatsapp: cliente.whatsapp || "",
      bairro: cliente.bairro || "",
      bairroNome:
        cliente.bairroNome || NOMES_BAIRROS[cliente.bairro] || "Não informado",
      endereco: cliente.endereco || "",
      referencia: cliente.referencia || "",
      observacao: cliente.observacao || "",
    },

    itens: carrinho,

    pagamento: {
      forma,
      formaNome: nomeFormaPagamento(forma),
      trocoPara: trocoPara,
    },

    valores: {
      subtotal: valores.subtotal,
      taxaEntrega: valores.taxaEntrega,
      taxaCartao: valores.taxaCartao,
      total: valores.total,
    },
  };

  let idRequisicao = sessionStorage.getItem(CHAVE_REQUISICAO_PEDIDO);

  if (!idRequisicao) {
    idRequisicao =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    sessionStorage.setItem(CHAVE_REQUISICAO_PEDIDO, idRequisicao);
  }

  const textoOriginal = botao.textContent;

  botao.disabled = true;
  botao.textContent = "Enviando pedido...";

  try {
    const resposta = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        acao: "criarPedido",
        idRequisicao,
        pedido,
      }),
    });

    const resultado = await resposta.json();

    if (!resultado.sucesso) {
      throw new Error(resultado.erro || "Não foi possível enviar o pedido.");
    }

    pedido.numero = `#${resultado.numeroPedido}`;
    pedido.criadoEm = new Date().toISOString();
    pedido.status = resultado.status || "aguardando-confirmacao";
    pedido.motivoRecusa = "";
    pedido.previsaoEntrega = null;

    localStorage.setItem(CHAVE_PEDIDO_ATUAL, JSON.stringify(pedido));
    localStorage.removeItem(CHAVE_CARRINHO);
    sessionStorage.removeItem(CHAVE_REQUISICAO_PEDIDO);

    window.location.href = "pedido.html";
  } catch (erro) {
    console.error("Erro ao enviar pedido:", erro);

    alert(
      "Não foi possível confirmar a resposta da loja. Aguarde alguns segundos antes de tentar novamente.",
    );

    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
}

async function consultarPedidoNaAPI(numeroPedido) {
  if (!numeroPedido) return null;

  const numeroLimpo = String(numeroPedido).replace("#", "").trim();

  try {
    const resposta = await fetch(
      `${API_URL}?acao=consultarPedido&numeroPedido=${encodeURIComponent(numeroLimpo)}`,
    );

    const resultado = await resposta.json();

    if (!resultado.sucesso || !resultado.encontrado) {
      return null;
    }

    return resultado.pedido;
  } catch (erro) {
    console.error("Erro ao consultar pedido na API:", erro);
    return null;
  }
}

function converterPedidoAPIParaCliente(pedidoAPI, pedidoLocal) {
  if (!pedidoAPI) return pedidoLocal;

  return {
    ...pedidoLocal,

    numero: pedidoLocal?.numero || `#${pedidoAPI.numeroPedido}`,

    status:
      pedidoAPI.statusPedido || pedidoLocal?.status || "aguardando-confirmacao",

    motivoRecusa: pedidoAPI.motivoRecusa || "",

    previsaoEntrega: pedidoAPI.previsaoEntrega || null,

    criadoEm: pedidoAPI.criadoEm || pedidoLocal?.criadoEm || "",

    confirmadoEm: pedidoAPI.confirmadoEm || "",

    recusadoEm: pedidoAPI.recusadoEm || "",

    saiuEntregaEm: pedidoAPI.saiuEntregaEm || "",
  };
}

function iniciarCheckout() {
  if (!document.getElementById("main-checkout")) return;

  preencherCheckoutCliente();
  renderizarItensCheckout();

  document
    .querySelectorAll('input[name="forma-pagamento"]')
    .forEach((radio) => {
      radio.addEventListener("change", atualizarCheckout);
    });

  document
    .getElementById("btn-confirmar-pedido")
    ?.addEventListener("click", confirmarPedidoDemo);

  atualizarCheckout();
}

function lerPedidoAtual() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_PEDIDO_ATUAL));
  } catch (erro) {
    console.error("Erro ao ler pedido atual:", erro);
    return null;
  }
}

function iniciarPaginaPedido() {
  if (!document.getElementById("main-pedido")) return;

  let pedidoLocal = lerPedidoAtual();

  if (!pedidoLocal) {
    preencherTexto("pedido-numero", "Pedido não encontrado");

    preencherTexto("pedido-status-titulo", "Nenhum pedido em acompanhamento");

    preencherTexto(
      "pedido-status-descricao",
      "Não encontramos um pedido ativo neste navegador.",
    );

    return;
  }

  preencherTexto("pedido-numero", `Pedido ${pedidoLocal.numero}`);

  preencherTexto(
    "pedido-cliente",
    pedidoLocal.cliente?.nome || "Não informado",
  );

  preencherTexto(
    "pedido-pagamento",
    pedidoLocal.pagamento?.formaNome || "Não informado",
  );

  preencherTexto("pedido-total", moeda(pedidoLocal.valores?.total || 0));

  preencherTexto(
    "pedido-bairro",
    pedidoLocal.cliente?.bairroNome || "Não informado",
  );

  preencherTexto(
    "pedido-endereco",
    pedidoLocal.cliente?.endereco || "Não informado",
  );

  atualizarVisualPedido(pedidoLocal);

  async function atualizarPedidoPelaAPI() {
    const pedidoAPI = await consultarPedidoNaAPI(pedidoLocal.numero);

    if (!pedidoAPI) return;

    pedidoLocal = converterPedidoAPIParaCliente(pedidoAPI, pedidoLocal);

    localStorage.setItem(CHAVE_PEDIDO_ATUAL, JSON.stringify(pedidoLocal));

    atualizarVisualPedido(pedidoLocal);
  }

  atualizarPedidoPelaAPI();

  setInterval(atualizarPedidoPelaAPI, 3000);
}

function atualizarVisualPedido(pedido) {
  const status = pedido.status || "aguardando-confirmacao";

  const titulo = document.getElementById("pedido-status-titulo");

  const descricao = document.getElementById("pedido-status-descricao");

  const icone = document.getElementById("pedido-status-icone");

  const recusado = document.getElementById("pedido-recusado");

  const entregaInfo = document.getElementById("pedido-entrega-info");

  if (!titulo || !descricao || !icone) return;

  if (recusado) recusado.hidden = true;
  if (entregaInfo) entregaInfo.hidden = true;

  if (status === "aguardando-confirmacao") {
    icone.className = "pedido-spinner";
    icone.textContent = "";

    titulo.textContent = "Aguardando confirmação da loja";

    descricao.textContent =
      "Seu pedido foi recebido. Aguarde alguns minutos enquanto a loja verifica a disponibilidade dos produtos e da entrega.";

    atualizarTimelinePedido("confirmacao");
  } else if (status === "em-preparo") {
    icone.className = "pedido-status-sucesso";
    icone.textContent = "✓";

    titulo.textContent = "Pedido confirmado!";

    descricao.textContent =
      "A loja confirmou seu pedido e os produtos estão sendo preparados para entrega.";

    atualizarTimelinePedido("preparo");
  } else if (status === "saiu-entrega") {
    icone.className = "pedido-status-entrega";
    icone.textContent = "🛵";

    titulo.textContent = "Seu pedido saiu para entrega!";

    descricao.textContent =
      "O entregador já está a caminho do endereço informado.";

    atualizarTimelinePedido("entrega");

    if (entregaInfo) {
      entregaInfo.hidden = false;
    }

    preencherTexto(
      "pedido-previsao-entrega",
      pedido.previsaoEntrega
        ? `${pedido.previsaoEntrega} minutos`
        : "Não informada",
    );
  } else if (status === "recusado") {
    icone.className = "pedido-status-recusado";
    icone.textContent = "!";

    titulo.textContent = "Pedido não confirmado";

    descricao.textContent =
      "Infelizmente, a loja não conseguiu aceitar este pedido.";

    if (recusado) {
      recusado.hidden = false;
    }

    preencherTexto(
      "pedido-motivo-rejeicao",
      pedido.motivoRecusa || "Motivo não informado.",
    );
  }
}

function atualizarTimelinePedido(etapaAtual) {
  const ordem = ["recebido", "confirmacao", "preparo", "entrega"];

  const indiceAtual = ordem.indexOf(etapaAtual);

  ordem.forEach((etapa, indice) => {
    const elemento = document.querySelector(`[data-etapa="${etapa}"]`);

    if (!elemento) return;

    elemento.classList.remove("ativa", "concluida");

    const icone = elemento.querySelector(".timeline-icone");

    if (indice < indiceAtual) {
      elemento.classList.add("concluida");

      if (icone) {
        icone.textContent = "✓";
      }
    } else if (indice === indiceAtual) {
      elemento.classList.add("ativa");

      if (icone) {
        icone.textContent = etapa === "recebido" ? "✓" : String(indice + 1);
      }
    } else {
      if (icone) {
        icone.textContent = String(indice + 1);
      }
    }
  });
}

// =========================================================
// ADMIN - GERENCIAMENTO LOCAL DO PEDIDO
// =========================================================

// =========================================================
// API - ADMIN
// =========================================================

async function lerRespostaAPI(resposta) {
  const texto = await resposta.text();

  try {
    return JSON.parse(texto);
  } catch (erro) {
    console.warn(
      "A API retornou uma resposta temporariamente inválida:",
      texto.slice(0, 120),
    );

    return {
      sucesso: false,
      erroTemporario: true,
      erro: "Resposta temporária inválida da API.",
    };
  }
}

async function enviarAPI(dados) {
  try {
    const resposta = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(dados),
    });

    return await lerRespostaAPI(resposta);
  } catch (erro) {
    console.warn("Falha temporária ao acessar a API:", erro);

    return {
      sucesso: false,
      erroTemporario: true,
      erro: "Falha temporária de conexão.",
    };
  }
}

async function loginAdminAPI(senha) {
  return enviarAPI({
    acao: "loginAdmin",
    senha: senha,
  });
}

async function verificarSessaoAdminAPI(token) {
  try {
    const resposta = await fetch(
      `${API_URL}?acao=verificarSessao&token=${encodeURIComponent(token)}`,
    );

    return await lerRespostaAPI(resposta);
  } catch (erro) {
    console.warn("Falha temporária ao verificar sessão:", erro);

    return {
      sucesso: false,
      erroTemporario: true,
      autenticado: null,
    };
  }
}

async function listarPedidosAdminAPI(token) {
  try {
    const resposta = await fetch(
      `${API_URL}?acao=listarPedidos&token=${encodeURIComponent(token)}`,
    );

    return await lerRespostaAPI(resposta);
  } catch (erro) {
    console.warn("Falha temporária ao listar pedidos:", erro);

    return {
      sucesso: false,
      erroTemporario: true,
      pedidos: [],
    };
  }
}

async function atualizarStatusAdminAPI(dados) {
  const token = sessionStorage.getItem(CHAVE_TOKEN_ADMIN);

  if (!token) {
    return {
      sucesso: false,
      naoAutorizado: true,
      erro: "Sessão administrativa não encontrada.",
    };
  }

  return enviarAPI({
    acao: "atualizarStatus",
    token: token,
    ...dados,
  });
}

// =========================================================
// LOGIN DO ADMIN
// =========================================================

function mostrarLoginAdmin() {
  document.querySelector(".header-admin")?.setAttribute("hidden", "");
  document.getElementById("main-admin")?.setAttribute("hidden", "");
  document.querySelector(".footer-admin")?.setAttribute("hidden", "");

  let login = document.getElementById("admin-login");

  if (!login) {
    login = document.createElement("main");

    login.id = "admin-login";

    login.innerHTML = `
      <section class="admin-login-card">

        <span class="admin-label">
          PAINEL ADMINISTRATIVO
        </span>

        <h1>DEPÓSITO DEMO</h1>

        <p>
          Digite a senha administrativa para acessar os pedidos.
        </p>

        <form id="form-login-admin">

          <label for="senha-admin">
            Senha
          </label>

          <input
            type="password"
            id="senha-admin"
            autocomplete="current-password"
            required
            placeholder="Digite sua senha"
          >

          <p
            id="erro-login-admin"
            class="erro-login-admin"
            hidden
          >
            Senha incorreta.
          </p>

          <button
            type="submit"
            id="btn-login-admin"
          >
            Entrar no Painel
          </button>

        </form>

      </section>
    `;

    document.body.prepend(login);
  }

  login.hidden = false;
}

function mostrarPainelAdmin() {
  document.getElementById("admin-login")?.setAttribute("hidden", "");

  document.querySelector(".header-admin")?.removeAttribute("hidden");
  document.getElementById("main-admin")?.removeAttribute("hidden");
  document.querySelector(".footer-admin")?.removeAttribute("hidden");
}

function salvarPedidoAtual(pedido) {
  localStorage.setItem(CHAVE_PEDIDO_ATUAL, JSON.stringify(pedido));
}

function criarListaProdutosAdmin(itens = []) {
  return itens
    .map((item) => {
      const quantidade = Number(item.quantidade) || 1;
      const preco = Number(item.preco) || 0;
      const totalItem = preco * quantidade;

      return `
        <li>
          <div>
            <strong>
              ${quantidade}× ${item.nome}
            </strong>

            <span>
              ${moeda(preco)}
              ${quantidade > 1 ? "cada" : ""}
            </span>
          </div>

          <strong>
            ${moeda(totalItem)}
          </strong>
        </li>
      `;
    })
    .join("");
}

function textoStatusAdmin(status) {
  const nomes = {
    "aguardando-confirmacao": "Aguardando confirmação",
    "em-preparo": "Em preparo",
    "saiu-entrega": "Em entrega",
    recusado: "Recusado",
    entregue: "Entregue",
  };

  return nomes[status] || "Aguardando confirmação";
}

function atualizarContadoresAdmin(pedidos = []) {
  const novos = pedidos.filter(
    (pedido) => pedido.statusPedido === "aguardando-confirmacao",
  ).length;

  const preparo = pedidos.filter(
    (pedido) => pedido.statusPedido === "em-preparo",
  ).length;

  const entrega = pedidos.filter(
    (pedido) => pedido.statusPedido === "saiu-entrega",
  ).length;

  const ativos = novos + preparo + entrega;

  preencherTexto("qtd-pedidos-novos", novos);

  preencherTexto("qtd-pedidos-preparo", preparo);

  preencherTexto("qtd-pedidos-entrega", entrega);

  preencherTexto("qtd-pedidos-ativos", ativos);
}

function criarProdutosAdminDaAPI(produtos) {
  if (!produtos) {
    return `
      <li>
        <div>
          <strong>Produtos não informados</strong>
        </div>
      </li>
    `;
  }

  return String(produtos)
    .split(" | ")
    .map((produto) => {
      const partes = produto.split(" - ");

      const nome = partes[0] || produto;

      const preco = Number(partes[1]) || 0;

      return `
        <li>
          <div>
            <strong>${nome}</strong>
          </div>

          <strong>
            ${moeda(preco)}
          </strong>
        </li>
      `;
    })
    .join("");
}

function renderizarPedidosAdmin(pedidos = []) {
  const fila = document.getElementById("fila-pedidos");

  if (!fila) return;

  atualizarContadoresAdmin(pedidos);

  const semPedidos = document.getElementById("admin-sem-pedidos");

  if (!pedidos.length) {
    fila.innerHTML = "";

    if (semPedidos) {
      semPedidos.hidden = false;
    }

    return;
  }

  if (semPedidos) {
    semPedidos.hidden = true;
  }

  fila.innerHTML = pedidos
    .map((pedido) => {
      const status = pedido.statusPedido || "aguardando-confirmacao";

      let botoes = "";

      if (status === "aguardando-confirmacao") {
        botoes = `
          <button
            type="button"
            class="btn-admin btn-admin-aceitar"
            data-acao="aceitar"
          >
            ✓ Aceitar Pedido
          </button>

          <button
            type="button"
            class="btn-admin btn-admin-recusar"
            data-acao="recusar"
          >
            ✕ Recusar Pedido
          </button>
        `;
      }

      if (status === "em-preparo") {
        botoes = `
          <button
            type="button"
            class="btn-admin btn-admin-entrega"
            data-acao="saiu-entrega"
          >
            🛵 Saiu para Entrega
          </button>
        `;
      }

      if (status === "saiu-entrega") {
        botoes = `
    <button
      type="button"
      class="btn-admin btn-admin-entregue"
      data-acao="entregue"
    >
      ✓ Marcar como Entregue
    </button>
  `;
      }

      const label =
        status === "aguardando-confirmacao"
          ? "NOVO PEDIDO"
          : status === "em-preparo"
            ? "PEDIDO CONFIRMADO"
            : "PEDIDO EM ENTREGA";

      return `
        <article
          class="card-pedido-admin ${
            status === "aguardando-confirmacao"
              ? "status-aguardando"
              : "status-preparo"
          }"
          data-numero-pedido="${pedido.numeroPedido}"
        >

          <div class="pedido-admin-topo">

            <div>
              <span class="pedido-admin-label">
                ${label}
              </span>

              <h3>
                Pedido #${pedido.numeroPedido}
              </h3>
            </div>

            <span
              class="badge-status-admin ${
                status === "aguardando-confirmacao" ? "aguardando" : "preparo"
              }"
            >
              ${textoStatusAdmin(status)}
            </span>

          </div>

          <div class="pedido-admin-corpo">

            <section class="pedido-admin-bloco">

              <h4>Cliente</h4>

              <div class="pedido-admin-dados">

                <div>
                  <span>Nome</span>
                  <strong>
                    ${pedido.nome || "Não informado"}
                  </strong>
                </div>

                <div>
                  <span>WhatsApp</span>
                  <strong>
                    ${pedido.whatsapp || "Não informado"}
                  </strong>
                </div>

                <div>
                  <span>Bairro</span>
                  <strong>
                    ${pedido.bairro || "Não informado"}
                  </strong>
                </div>

                <div>
                  <span>Endereço</span>
                  <strong>
                    ${pedido.endereco || "Não informado"}
                  </strong>
                </div>

                <div class="pedido-admin-dado-largo">
                  <span>Ponto de referência</span>

                  <strong>
                    ${pedido.referencia || "Não informado"}
                  </strong>
                </div>

                <div class="pedido-admin-dado-largo">
                  <span>Observação</span>

                  <strong>
                    ${pedido.observacao || "Nenhuma observação"}
                  </strong>
                </div>

              </div>

            </section>

            <section class="pedido-admin-bloco">

              <h4>Itens do Pedido</h4>

              <ul class="pedido-admin-produtos">
                ${criarProdutosAdminDaAPI(pedido.produtos)}
              </ul>

            </section>

          </div>

          <div class="pedido-admin-resumo-valores">

            <div>
              <span>Subtotal</span>
              <strong>
                ${moeda(pedido.subtotal || 0)}
              </strong>
            </div>

            <div>
              <span>Taxa de entrega</span>
              <strong>
                ${moeda(pedido.taxaEntrega || 0)}
              </strong>
            </div>

            <div>
  <span>Forma de pagamento</span>
  <strong>
    ${pedido.formaPagamento || "Não informado"}
  </strong>
</div>

${
  pedido.formaPagamento === "Dinheiro"
    ? `
      <div>
        <span>Troco</span>
        <strong>
          ${
            pedido.trocoPara
              ? `Levar troco para ${moeda(pedido.trocoPara)}`
              : "Não precisa de troco"
          }
        </strong>
      </div>
    `
    : ""
}

            <div class="pedido-admin-total">
              <span>Total</span>
              <strong>
                ${moeda(pedido.total || 0)}
              </strong>
            </div>

          </div>

          <div class="pedido-admin-acoes">
            ${botoes}
          </div>

        </article>
      `;
    })
    .join("");
}

// =========================================================
// ADMIN - MODAIS
// =========================================================

let pedidoAdminSelecionado = null;

function abrirModalRecusa() {
  const modal = document.getElementById("modal-recusar-pedido");
  if (!modal) return;

  document.querySelectorAll('input[name="motivo-recusa"]').forEach((radio) => {
    radio.checked = false;
  });

  const campoTexto = document.getElementById("motivo-recusa-texto");
  if (campoTexto) campoTexto.value = "";

  modal.hidden = false;
}

function fecharModalRecusa() {
  const modal = document.getElementById("modal-recusar-pedido");
  if (modal) modal.hidden = true;
}

function abrirModalEntrega() {
  const modal = document.getElementById("modal-saida-entrega");
  if (!modal) return;

  const campo = document.getElementById("previsao-entrega");
  if (campo) campo.value = 30;

  modal.hidden = false;
}

function fecharModalEntrega() {
  const modal = document.getElementById("modal-saida-entrega");
  if (modal) modal.hidden = true;
}

function atualizarStatusAdminLoja() {
  const texto = document.getElementById("admin-status-loja");
  const indicador = document.querySelector(".admin-status-indicador");

  if (!texto) return;

  const status = obterStatusLoja();

  texto.textContent = status.aberta ? "Loja aberta" : "Loja fechada";

  if (indicador) {
    indicador.classList.toggle("loja-fechada", !status.aberta);
  }
}

let intervaloAdminAPI = null;

async function atualizarPedidosAdminDaAPI() {
  const token = sessionStorage.getItem(CHAVE_TOKEN_ADMIN);

  if (!token) return;

  try {
    const resultado = await listarPedidosAdminAPI(token);
    if (resultado.erroTemporario) {
      console.warn(
        "Atualização do Admin ignorada por falha temporária da API.",
      );
      return;
    }

    if (resultado.naoAutorizado) {
      sessionStorage.removeItem(CHAVE_TOKEN_ADMIN);

      if (intervaloAdminAPI) {
        clearInterval(intervaloAdminAPI);
        intervaloAdminAPI = null;
      }

      mostrarLoginAdmin();
      return;
    }

    if (!resultado.sucesso) {
      console.error("Erro ao carregar pedidos:", resultado.erro);

      return;
    }

    renderizarPedidosAdmin(resultado.pedidos || []);
  } catch (erro) {
    console.error("Erro ao atualizar painel:", erro);
  }
}

function iniciarVigiaAdmin() {
  atualizarPedidosAdminDaAPI();

  if (intervaloAdminAPI) {
    clearInterval(intervaloAdminAPI);
  }

  intervaloAdminAPI = setInterval(atualizarPedidosAdminDaAPI, INTERVALO_ADMIN);
}

// =========================================================
// ADMIN - ALTERAÇÃO DE STATUS
// =========================================================

async function aceitarPedidoAdmin() {
  if (!pedidoAdminSelecionado) return;

  try {
    const resultado = await atualizarStatusAdminAPI({
      numeroPedido: pedidoAdminSelecionado,

      novoStatus: "em-preparo",
    });

    if (!resultado.sucesso) {
      throw new Error(resultado.erro);
    }

    await atualizarPedidosAdminDaAPI();
  } catch (erro) {
    alert(erro.message || "Não foi possível aceitar o pedido.");
  }
}

async function confirmarRecusaAdmin() {
  if (!pedidoAdminSelecionado) return;

  const selecionado = document.querySelector(
    'input[name="motivo-recusa"]:checked',
  );

  const campoTexto = document.getElementById("motivo-recusa-texto");

  const textoPersonalizado = campoTexto?.value.trim() || "";

  if (!selecionado && !textoPersonalizado) {
    alert("Informe o motivo da recusa antes de continuar.");

    return;
  }

  let motivo = "";

  if (selecionado && selecionado.value !== "outro") {
    motivo = selecionado.value;

    if (textoPersonalizado) {
      motivo += ` — ${textoPersonalizado}`;
    }
  } else {
    motivo = textoPersonalizado;
  }

  try {
    const resultado = await atualizarStatusAdminAPI({
      numeroPedido: pedidoAdminSelecionado,

      novoStatus: "recusado",

      motivoRecusa: motivo,
    });

    if (!resultado.sucesso) {
      throw new Error(resultado.erro);
    }

    fecharModalRecusa();

    await atualizarPedidosAdminDaAPI();
  } catch (erro) {
    alert(erro.message || "Não foi possível recusar o pedido.");
  }
}

async function confirmarSaidaEntregaAdmin() {
  if (!pedidoAdminSelecionado) return;

  const campo = document.getElementById("previsao-entrega");

  const minutos = Number(campo?.value);

  if (!minutos || minutos < 5 || minutos > 180) {
    alert("Informe uma previsão entre 5 e 180 minutos.");

    return;
  }

  try {
    const resultado = await atualizarStatusAdminAPI({
      numeroPedido: pedidoAdminSelecionado,

      novoStatus: "saiu-entrega",

      previsaoEntrega: minutos,
    });

    if (!resultado.sucesso) {
      throw new Error(resultado.erro);
    }

    fecharModalEntrega();

    await atualizarPedidosAdminDaAPI();
  } catch (erro) {
    alert(erro.message || "Não foi possível atualizar a entrega.");
  }
}

async function marcarPedidoEntregueAdmin() {
  if (!pedidoAdminSelecionado) return;

  const confirmar = window.confirm(
    `Confirmar que o Pedido #${pedidoAdminSelecionado} foi entregue ao cliente?`,
  );

  if (!confirmar) return;

  try {
    const resultado = await atualizarStatusAdminAPI({
      numeroPedido: pedidoAdminSelecionado,
      novoStatus: "entregue",
    });

    if (!resultado.sucesso) {
      throw new Error(resultado.erro || "Não foi possível finalizar o pedido.");
    }

    await atualizarPedidosAdminDaAPI();
  } catch (erro) {
    alert(erro.message || "Não foi possível marcar o pedido como entregue.");
  }
}

// =========================================================
// ADMIN - EVENTOS
// =========================================================

async function iniciarAdmin() {
  if (!document.getElementById("main-admin")) {
    return;
  }

  atualizarStatusAdminLoja();
  setInterval(atualizarStatusAdminLoja, 30000);

  const token = sessionStorage.getItem(CHAVE_TOKEN_ADMIN);

  let autenticado = false;

  if (token) {
    const sessao = await verificarSessaoAdminAPI(token);

    if (sessao.erroTemporario) {
      autenticado = true;
    } else {
      autenticado = Boolean(sessao.autenticado);
    }
  }

  if (!autenticado) {
    sessionStorage.removeItem(CHAVE_TOKEN_ADMIN);

    mostrarLoginAdmin();
  } else {
    mostrarPainelAdmin();
    iniciarVigiaAdmin();
  }

  document.body.addEventListener("submit", async (evento) => {
    if (evento.target.id !== "form-login-admin") {
      return;
    }

    evento.preventDefault();

    const senha = document.getElementById("senha-admin")?.value || "";

    const botao = document.getElementById("btn-login-admin");

    const erro = document.getElementById("erro-login-admin");

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Entrando...";
    }

    if (erro) {
      erro.hidden = true;
    }

    try {
      const resultado = await loginAdminAPI(senha);

      if (!resultado.sucesso || !resultado.token) {
        if (erro) {
          erro.textContent = resultado.erro || "Senha incorreta.";

          erro.hidden = false;
        }

        return;
      }

      sessionStorage.setItem(CHAVE_TOKEN_ADMIN, resultado.token);

      mostrarPainelAdmin();
      iniciarVigiaAdmin();
    } catch (erroAPI) {
      if (erro) {
        erro.textContent = "Não foi possível acessar o painel.";

        erro.hidden = false;
      }
    } finally {
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Entrar no Painel";
      }
    }
  });

  const fila = document.getElementById("fila-pedidos");

  fila?.addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-acao]");

    if (!botao) return;

    const card = botao.closest("[data-numero-pedido]");

    if (!card) return;

    pedidoAdminSelecionado = card.dataset.numeroPedido;

    const acao = botao.dataset.acao;

    if (acao === "aceitar") {
      aceitarPedidoAdmin();
    }

    if (acao === "recusar") {
      abrirModalRecusa();
    }

    if (acao === "saiu-entrega") {
      abrirModalEntrega();
    }

    if (acao === "entregue") {
      marcarPedidoEntregueAdmin();
    }
  });

  document
    .getElementById("fechar-modal-recusa")
    ?.addEventListener("click", fecharModalRecusa);

  document
    .getElementById("cancelar-recusa")
    ?.addEventListener("click", fecharModalRecusa);

  document
    .getElementById("confirmar-recusa")
    ?.addEventListener("click", confirmarRecusaAdmin);

  document
    .getElementById("fechar-modal-entrega")
    ?.addEventListener("click", fecharModalEntrega);

  document
    .getElementById("cancelar-saida-entrega")
    ?.addEventListener("click", fecharModalEntrega);

  document
    .getElementById("confirmar-saida-entrega")
    ?.addEventListener("click", confirmarSaidaEntregaAdmin);

  document.querySelectorAll(".previsoes-rapidas button").forEach((botao) => {
    botao.addEventListener("click", () => {
      const campo = document.getElementById("previsao-entrega");

      if (campo) {
        campo.value = botao.dataset.minutos;
      }
    });
  });

  document.querySelectorAll(".admin-modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", () => {
      fecharModalRecusa();
      fecharModalEntrega();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  atualizarStatusVisualLoja();
  iniciarBusca();
  iniciarBotoesProdutos();
  iniciarCarrinho();
  iniciarCheckout();
  iniciarPaginaPedido();
  iniciarAdmin();
});
