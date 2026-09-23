const modules = [
  ["clients", "Clientes", "♟"], ["products", "Produtos", "▤"], ["entries", "Reg. de Entradas", "▾"],
  ["nfe", "NF. Eletrônica", "◉"], ["nfce", "NF. Consumidor", "▧"], ["employees", "Funcionários", "♙"],
  ["manager", "Gerenciador", "⚙"], ["quotes", "Orçamentos", "▧"], ["service", "Ordem de Serviço", "✎"], ["cash", "Contas a Receber", "$"]
];
const shortcuts = [["cash", "Movimento de Caixa", "▥"], ["service", "Ordem de Serviço", "▤"], ["orders", "Pedidos", "▧"], ["presales", "Pré-venda", "▥"]];
const state = { module: null, rows: [], search: "", order: { client: "", items: [], discount: 0 }, enterCount: 0, pixTimer: null };
const $ = (selector) => document.querySelector(selector);
const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));

function boot() {
  $("#shortcut-row").innerHTML = shortcuts.map(([id, label, glyph]) => `<button class="shortcut" data-module="${id}"><span class="shortcut-icon">${glyph}</span><span class="shortcut-label">${label}</span></button>`).join("");
  $("#module-bar").innerHTML = modules.map(([id, label, glyph]) => `<button class="module-button" data-module="${id}"><span class="module-glyph">${glyph}</span><small>${label}</small></button>`).join("");
  document.querySelectorAll("[data-module]").forEach((button) => button.addEventListener("click", () => openModule(button.dataset.module)));
  $("#global-search").addEventListener("input", (event) => { if (state.module) renderModule(state.module, event.target.value); });
  document.addEventListener("keydown", keyboardShortcuts);
  updateClock();
  setInterval(updateClock, 1000);
  loadDashboard();
}

async function loadDashboard() {
  const summary = await window.netside.dashboard();
  $("#quick-stats").innerHTML = [["products", "Produtos cadastrados"], ["clients", "Clientes"], ["orders", "Pedidos"], ["cash", "Saldo em caixa"]].map(([key, label]) => `<div class="quick-stat"><b>${key === "cash" ? money(summary[key]) : summary[key]}</b><span>${label}</span></div>`).join("");
}

function updateClock() { $("#clock").textContent = new Date().toLocaleString("pt-BR"); }
function setStatus(message) { $("#status-message").textContent = message; }
function keyboardShortcuts(event) {
  if (event.key === "Escape") { closeModal(); if (state.module) openModule(state.module); else showWelcome(); }
  if (event.key === "F12") { event.preventDefault(); if (state.module === "orders") openPayment(); }
  if (event.key === "Enter" && document.activeElement?.dataset?.skipClient) {
    state.enterCount += 1;
    if (state.enterCount >= 5) { state.order.client = "Consumidor final"; document.activeElement.value = state.order.client; setStatus("Cliente pulado após 5x ENTER"); }
  }
}

function showWelcome() {
  state.module = null;
  $("#welcome").classList.remove("hidden");
  $("#content").classList.add("hidden");
  document.querySelectorAll(".module-button").forEach((button) => button.classList.remove("active"));
}

async function openModule(module) {
  state.module = module;
  document.querySelectorAll(".module-button").forEach((button) => button.classList.toggle("active", button.dataset.module === module));
  $("#welcome").classList.add("hidden");
  $("#content").classList.remove("hidden");
  if (["orders", "service", "presales", "quotes"].includes(module)) return openDocument(module);
  await renderModule(module, $("#global-search").value);
}

async function renderModule(module, search = "") {
  const config = {
    clients: ["clients", "Clientes", ["code", "Código"], ["name", "Nome"], ["document", "CPF/CNPJ"], ["phone", "Telefone"], ["address", "Endereço"]],
    products: ["products", "Produtos", ["code", "Código"], ["barcode", "Cód. barras"], ["name", "Nome"], ["price", "Preço"], ["cost", "Custo"], ["stock", "Estoque"], ["category", "Categoria"]],
    employees: ["employees", "Funcionários", ["code", "Código"], ["name", "Nome"], ["document", "CPF"], ["phone", "Telefone"], ["role", "Cargo"], ["username", "Usuário"]],
    entries: ["entries", "Registro de Entradas", ["supplier", "Fornecedor"], ["document", "Documento"], ["product", "Produto"], ["quantity", "Qtd."], ["cost", "Custo"], ["created_at", "Data"]],
    quotes: ["quotes", "Orçamentos", ["number", "Número"], ["client", "Cliente"], ["total", "Total"], ["discount", "Desconto"], ["notes", "Observações"]],
    presales: ["presales", "Pré-vendas", ["number", "Número"], ["client", "Cliente"], ["total", "Total"], ["status", "Status"], ["created_at", "Data"]],
    service: ["service_orders", "Ordens de Serviço", ["number", "Número"], ["client", "Cliente"], ["technician", "Técnico"], ["status", "Status"], ["total", "Total"]],
    orders: ["orders", "Pedidos", ["number", "Número"], ["client", "Cliente"], ["total", "Total"], ["status", "Status"], ["payment_method", "Pagamento"], ["created_at", "Data"]],
    cash: ["cash_movements", "Movimento de Caixa", ["type", "Tipo"], ["description", "Descrição"], ["amount", "Valor"], ["created_at", "Data"]],
    nfe: [null, "NF-e · Simulação local", []], nfce: [null, "NFC-e · Simulação local", []], manager: [null, "Gerenciador do sistema", []]
  }[module];
  if (!config) return;
  const [table, title, columns] = config;
  const rows = table ? await window.netside.list(table, search) : [];
  state.rows = rows;
  $("#content").innerHTML = `<div class="panel-header"><h2>${title}</h2><div class="panel-actions">${table ? `<button class="btn primary" id="new-record">＋ Novo</button>` : ""}<button class="btn dark" id="back-home">⌂ Início</button></div></div>
    ${module === "nfe" || module === "nfce" ? simulationPanel(title) : module === "manager" ? managerPanel() : `<div class="toolbar"><div class="search-box">⌕ <input id="module-search" value="${esc(search)}" placeholder="Pesquisar por nome, código ou documento" /></div><span>${rows.length} registro(s)</span></div>${renderTable(table, columns, rows)}`}`;
  $("#back-home").addEventListener("click", showWelcome);
  if (table) {
    $("#new-record").addEventListener("click", () => openCrudModal(module, null));
    $("#module-search").addEventListener("input", (event) => renderModule(module, event.target.value));
    document.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => openCrudModal(module, rows.find((row) => String(row.id) === button.dataset.edit))));
    document.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteRow(module, button.dataset.delete)));
  }
}

function renderTable(table, columns, rows) {
  if (!rows.length) return `<div class="empty-state"><strong>Nenhum registro encontrado</strong>${table === "products" ? "A tela de Produtos inicia limpa. Use ＋ Novo para cadastrar ou leia um código de barras." : "Use ＋ Novo para inserir o primeiro registro."}</div>`;
  return `<div class="table-wrap"><table><thead><tr>${columns.map(([, label]) => `<th>${label}</th>`).join("")}<th>Ações</th></tr></thead><tbody>${rows.map((row) => `<tr>${columns.map(([key]) => `<td>${key.includes("price") || key.includes("cost") || key === "total" || key === "amount" ? money(row[key]) : esc(row[key])}</td>`).join("")}<td><button class="btn" data-edit="${row.id}">Editar</button> <button class="btn danger" data-delete="${row.id}">Excluir</button></td></tr>`).join("")}</tbody></table></div>`;
}

function simulationPanel(title) {
  return `<div class="dashboard-grid"><div class="dashboard-card"><b>SIM</b><span>Ambiente local</span></div><div class="dashboard-card"><b>0</b><span>Documentos emitidos</span></div><div class="dashboard-card"><b>---</b><span>Última transmissão</span></div><div class="dashboard-card"><b>OFF</b><span>SEFAZ desativada</span></div></div><div class="empty-state"><strong>${title}</strong>Este módulo é somente para simulação local. Nenhum documento fiscal real será transmitido.<br /><br /><button class="btn primary" id="simulate-doc">＋ Simular documento</button></div>`;
}
function managerPanel() {
  return `<div class="dashboard-grid"><div class="dashboard-card"><b>Banco</b><span>SQLite local ativo</span></div><div class="dashboard-card"><b>USB</b><span>Leitor como teclado</span></div><div class="dashboard-card"><b>F12</b><span>Faturamento ativo</span></div><div class="dashboard-card"><b>20s</b><span>PIX simulado</span></div></div><div class="empty-state"><strong>Gerenciador do sistema</strong>Use os módulos inferiores para manutenção e operação do retaguarda.</div>`;
}

function openCrudModal(module, row) {
  const fields = {
    clients: [["code", "Código"], ["name", "Nome", "wide"], ["document", "CPF/CNPJ"], ["phone", "Telefone"], ["address", "Endereço", "full"]],
    products: [["code", "Código"], ["barcode", "Código de barras"], ["name", "Nome", "wide"], ["description", "Descrição", "full"], ["price", "Preço"], ["cost", "Custo"], ["unit", "Unidade"], ["stock", "Estoque"], ["category", "Categoria"]],
    employees: [["code", "Código"], ["name", "Nome", "wide"], ["document", "CPF"], ["phone", "Telefone"], ["role", "Cargo"], ["username", "Usuário"], ["password", "Senha"]],
    entries: [["supplier", "Fornecedor", "wide"], ["document", "Documento"], ["product", "Produto", "wide"], ["quantity", "Quantidade"], ["cost", "Custo"]],
    quotes: [["number", "Número"], ["client", "Cliente", "wide"], ["discount", "Desconto"], ["notes", "Observações", "full"]],
    presales: [["number", "Número"], ["client", "Cliente", "wide"], ["total", "Total"], ["status", "Status"]],
    service: [["number", "Número"], ["client", "Cliente", "wide"], ["technician", "Técnico"], ["status", "Status"], ["total", "Total"], ["description", "Descrição", "full"], ["notes", "Observações", "full"]],
    cash: [["type", "Tipo"], ["description", "Descrição", "wide"], ["amount", "Valor"]]
  }[module];
  if (!fields) return;
  const html = fields.map(([key, label, size]) => `<div class="field ${size || ""}"><label>${label}</label>${key === "status" ? `<select name="${key}"><option>ABERTO</option><option>FINALIZADO</option><option>CANCELADO</option></select>` : key === "notes" || key === "description" || key === "address" ? `<textarea name="${key}">${esc(row?.[key] || "")}</textarea>` : `<input name="${key}" type="${key === "password" ? "password" : ["price", "cost", "stock", "quantity", "amount", "total", "discount"].includes(key) ? "number" : "text"}" value="${esc(row?.[key] || "")}" ${module === "products" && key === "name" ? "autofocus" : ""} />`}</div>`).join("");
  showModal(row ? `Editar ${moduleLabel(module)}` : `Novo ${moduleLabel(module)}`, `<form id="crud-form" class="form-grid">${html}</form>`, async () => {
    const data = Object.fromEntries(new FormData($("#crud-form")).entries());
    if (!data.code && ["clients", "products", "employees"].includes(module)) data.code = `${Date.now()}`.slice(-6);
    if (!data.name && ["clients", "products", "employees"].includes(module)) { setStatus("Preencha o nome."); return; }
    await window.netside.save(module === "service" ? "service_orders" : module, { ...(row || {}), ...data });
    closeModal(); await renderModule(module, $("#global-search").value); loadDashboard(); setStatus("Registro salvo no SQLite.");
  });
}
function moduleLabel(module) { return ({ clients: "Cliente", products: "Produto", employees: "Funcionário", entries: "Entrada", quotes: "Orçamento", presales: "Pré-venda", service: "Ordem de Serviço", cash: "Movimento de caixa" }[module] || module); }
async function deleteRow(module, id) { if (!confirm("Excluir este registro?")) return; await window.netside.remove(module === "service" ? "service_orders" : module, id); await renderModule(module, $("#global-search").value); loadDashboard(); setStatus("Registro excluído."); }

function openDocument(module) {
  const labels = { orders: "Novo Pedido", service: "Nova Ordem de Serviço", presales: "Nova Pré-venda", quotes: "Novo Orçamento" };
  state.order = { client: "", items: [], discount: 0, module };
  showModal(labels[module], `<div class="wizard-steps"><div class="wizard-step current">1 · Cliente</div><div class="wizard-step">2 · Produtos</div><div class="wizard-step">3 · Finalização</div></div><div id="document-body">${clientStep()}</div>`, () => saveDocument(module));
  const form = $("#document-client-form");
  form.addEventListener("submit", (event) => { event.preventDefault(); state.order.client = new FormData(form).get("client"); showProductStep(module); });
  $("#skip-client").addEventListener("click", () => { state.order.client = "Consumidor final"; showProductStep(module); });
}
function clientStep() {
  return `<form id="document-client-form"><div class="field"><label>Cliente por código ou nome</label><input name="client" data-skip-client autofocus placeholder="Digite o cliente ou pressione ENTER 5 vezes para consumidor final" /></div><p class="hint">ENTER avança · 5x ENTER pula o cliente · ESC cancela</p><div class="modal-footer"><button type="button" class="btn" id="skip-client">Pular cliente</button><button class="btn primary">Avançar →</button></div></form>`;
}
async function showProductStep(module) {
  $("#document-body").innerHTML = `<div class="order-layout"><aside class="order-sidebar"><h4>Cliente</h4><b>${esc(state.order.client || "Consumidor final")}</b><p>Pesquise os produtos pelo código, código de barras ou nome. O leitor USB funciona como teclado.</p><div class="field"><label>Produto</label><input id="product-search" autofocus placeholder="Código / barras / nome" /></div><div id="product-results"></div></aside><section><div id="item-list" class="order-items">${renderItems()}</div><div class="order-total">Total: <span id="document-total">${money(orderTotal())}</span></div></section></div>`;
  $("#product-search").addEventListener("input", async (event) => {
    const products = await window.netside.list("products", event.target.value);
    $("#product-results").innerHTML = products.slice(0, 6).map((product) => `<button class="rail-item product-result" data-product="${product.id}"><span>${esc(product.code)}</span> ${esc(product.name)} · ${money(product.price)}</button>`).join("") || `<small>Nenhum produto encontrado.</small>`;
    document.querySelectorAll(".product-result").forEach((button) => button.addEventListener("click", () => addProduct(products.find((product) => String(product.id) === button.dataset.product))));
  });
  $("#modal .modal-footer").innerHTML = `<button type="button" class="btn" id="cancel-document">Cancelar</button><button type="button" class="btn primary" id="finish-document">Salvar ${moduleLabel(module)}</button>`;
  $("#cancel-document").addEventListener("click", closeModal);
  $("#finish-document").addEventListener("click", () => saveDocument(module));
}
function addProduct(product) {
  if (!product) return;
  const existing = state.order.items.find((item) => item.code === product.code);
  if (existing) existing.quantity += 1;
  else state.order.items.push({ code: product.code, name: product.name, price: Number(product.price || 0), quantity: 1 });
  $("#item-list").innerHTML = renderItems(); $("#document-total").textContent = money(orderTotal()); setStatus(`Produto ${product.name} adicionado.`);
}
function renderItems() {
  if (!state.order.items.length) return `<div class="empty-state"><strong>Pedido vazio</strong>Pesquise e adicione produtos.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Código</th><th>Produto</th><th>Qtd.</th><th>Preço</th><th>Subtotal</th><th></th></tr></thead><tbody>${state.order.items.map((item, index) => `<tr><td>${esc(item.code)}</td><td>${esc(item.name)}</td><td><input data-quantity="${index}" type="number" value="${item.quantity}" min="1" style="width:50px" /></td><td>${money(item.price)}</td><td>${money(item.quantity * item.price)}</td><td><button class="btn danger" data-remove-item="${index}">×</button></td></tr>`).join("")}</tbody></table></div>`;
}
function orderTotal() { return Math.max(0, state.order.items.reduce((sum, item) => sum + item.quantity * item.price, 0) - Number(state.order.discount || 0)); }
async function saveDocument(module) {
  if (!state.order.items.length && module !== "service") { setStatus("Adicione ao menos um produto."); return; }
  const table = module === "orders" ? "orders" : module === "service" ? "service_orders" : module === "quotes" ? "quotes" : "presales";
  const number = `${module === "orders" ? "PED" : module === "service" ? "OS" : module === "quotes" ? "ORC" : "PRE"}-${Date.now().toString().slice(-6)}`;
  if (module === "orders") { closeModal(); state.order.number = number; openPayment(); return; }
  await window.netside.save(table, { number, client: state.order.client || "Consumidor final", total: orderTotal(), discount: state.order.discount, status: "ABERTA", notes: "", technician: "", description: "", created_at: new Date().toISOString() });
  closeModal(); await openModule(module); setStatus(`${moduleLabel(module)} salva no SQLite.`);
}
function openPayment() {
  showModal("Faturar Pedido · F12", `<div class="payment-options"><button class="payment-option" data-pay="PIX"><b>PIX</b>QR Code fictício</button><button class="payment-option" data-pay="DINHEIRO"><b>Dinheiro</b>Calcular troco</button><button class="payment-option" data-pay="CRÉDITO"><b>Crédito</b>Maquininha</button><button class="payment-option" data-pay="DÉBITO"><b>Débito</b>Maquininha</button></div><div class="payment-message">Pedido: ${esc(state.order.number || "novo")} · Total: <b>${money(orderTotal())}</b></div>`, null);
  document.querySelectorAll("[data-pay]").forEach((button) => button.addEventListener("click", () => choosePayment(button.dataset.pay)));
}
function choosePayment(method) {
  if (method === "PIX") {
    $("#modal-body").innerHTML = `<div class="pix-box"><h3>PIX · Simulação</h3><div class="fake-qr"></div><p>Valor: <b>${money(orderTotal())}</b></p><div id="pix-message">Aguardando confirmação do pagamento...</div></div>`;
    clearTimeout(state.pixTimer);
    state.pixTimer = setTimeout(() => { $("#pix-message").innerHTML = "<b>Pagamento aprovado</b><br />Imprimindo NFe"; finalizeSale("PIX"); }, 20000);
  } else if (method === "DINHEIRO") {
    $("#modal-body").innerHTML = `<div class="field"><label>Valor recebido</label><input id="cash-received" type="number" step="0.01" autofocus /></div><div class="payment-message">Troco: <b id="change">${money(0)}</b></div>`;
    $("#cash-received").addEventListener("input", (event) => $("#change").textContent = money(Number(event.target.value) - orderTotal()));
    showPaymentFooter(() => finalizeSale("DINHEIRO"));
  } else {
    $("#modal-body").innerHTML = `<div class="payment-message"><b>Insira ou aproxime o cartão</b><br /><br />Processando aprovação da transação...</div>`;
    setTimeout(() => { if ($("#modal-body")) { $("#modal-body").innerHTML = `<div class="payment-message"><b>Pagamento aprovado</b><br />Transação simulada com sucesso.</div>`; showPaymentFooter(() => finalizeSale(method)); } }, 1500);
  }
}
function showPaymentFooter(action) { $("#modal-footer").innerHTML = `<button class="btn" id="cancel-payment">Cancelar</button><button class="btn primary" id="confirm-payment">Confirmar pagamento</button>`; $("#cancel-payment").addEventListener("click", closeModal); $("#confirm-payment").addEventListener("click", action); }
async function finalizeSale(method) { clearTimeout(state.pixTimer); await window.netside.finalizeOrder({ ...state.order, total: orderTotal(), paymentMethod: method }); closeModal(); await openModule("orders"); loadDashboard(); setStatus(`Pedido finalizado · ${method}`); }
function showModal(title, body, submit) {
  $("#modal-root").innerHTML = `<div class="modal-backdrop"><div id="modal" class="modal"><div class="modal-header"><h3>${title}</h3><button id="modal-close">×</button></div><div id="modal-body" class="modal-body">${body}</div><div id="modal-footer" class="modal-footer">${submit ? `<button class="btn" id="modal-cancel">Cancelar</button><button class="btn primary" id="modal-submit">Salvar</button>` : ""}</div></div></div>`;
  $("#modal-close").addEventListener("click", closeModal);
  $("#modal-cancel")?.addEventListener("click", closeModal);
  $("#modal-submit")?.addEventListener("click", submit);
}
function closeModal() { clearTimeout(state.pixTimer); $("#modal-root").innerHTML = ""; }

boot();