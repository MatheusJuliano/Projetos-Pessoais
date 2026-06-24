// ═══════════════════════════════════════════════════════════════
//  APP.JS — Lógica principal (comunica com API REST)
// ═══════════════════════════════════════════════════════════════

let estoque = [];
let mov     = [];
let usuarioAtual = null;

// ── Toggle noturno ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('modoNoturno') === '1') {
    document.body.classList.add('noturno');
    document.getElementById('toggleIcon').textContent = '☀️';
  }
  document.getElementById('toggleNoturno').addEventListener('click', () => {
    const ativo = document.body.classList.toggle('noturno');
    document.getElementById('toggleIcon').textContent = ativo ? '☀️' : '🌙';
    localStorage.setItem('modoNoturno', ativo ? '1' : '0');
  });

  init();
});

// ── Inicialização ──────────────────────────────────────────────
async function init() {
  try {
    // Verifica sessão
    const me = await fetch('/api/auth/me').then(r => r.json());
    if (!me.logado) { window.location.href = '/login'; return; }

    usuarioAtual = { nome: me.nome, admin: me.admin };
    document.getElementById('nomeUsuario').textContent = me.nome;
    document.getElementById('avatarLetra').textContent = me.nome.charAt(0).toUpperCase();

    await carregarDados();
  } catch (e) {
    window.location.href = '/login';
  }
}

async function carregarDados() {
  const [estoqueData, movData, acessosData] = await Promise.all([
    fetch('/api/estoque').then(r => r.json()),
    fetch('/api/movimentacoes').then(r => r.json()),
    fetch('/api/acessos').then(r => r.json()),
  ]);
  estoque = estoqueData;
  mov     = movData;
  renderizar(acessosData);
}

// ── Renderização ───────────────────────────────────────────────
function renderizar(acessosData) {
  // Estoque
  const tabela = document.getElementById('tabelaEstoque');
  tabela.innerHTML = '';
  let total = 0;
  estoque.forEach(b => {
    total += b.qtd;
    tabela.innerHTML += `<tr>
      <td>${b.marca}</td><td>${b.modelo}</td><td>${b.qtd}</td>
      <td class="destaque">${b.obs || ''}</td>
    </tr>`;
  });
  document.getElementById('total').innerText = total;

  // Movimentações
  const movTable = document.getElementById('mov');
  movTable.innerHTML = '';
  mov.forEach((m, i) => {
    const podeEstornar = i === 0 && (m.tipo === 'Entrada' || m.tipo === 'Venda');
    movTable.innerHTML += `<tr>
      <td>${m.tipo}</td><td>${m.marca || ''}</td><td>${m.modelo}</td>
      <td>${m.qtd}</td><td>${formatarData(m.data)}</td>
      <td>${podeEstornar ? `<button class="btn-estorno" onclick="estornar()">↩ Estornar</button>` : ''}</td>
    </tr>`;
  });

  // Acessos
  const lista = document.getElementById('acessos');
  lista.innerHTML = '';
  if (acessosData && acessosData.length) {
    acessosData.forEach(a => {
      const ent = formatarData(a.entrada);
      const sai = a.saida ? formatarData(a.saida) : 'ainda logado';
      lista.innerHTML += `<li><b>${a.nome}</b> — entrada: ${ent} | saída: ${sai}</li>`;
    });
  } else {
    lista.innerHTML = '<li style="color:#aaa">Nenhum acesso registrado.</li>';
  }

  // Relatório do dia
  const hoje = new Date().toISOString().split('T')[0];
  filtrarRelatorio(hoje);
}

function formatarData(str) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleString('pt-BR');
}

// ── Adicionar bateria ──────────────────────────────────────────
async function adicionar() {
  const marca = document.getElementById('marca').value.trim();
  const modelo= document.getElementById('modelo').value.trim();
  const qtd   = document.getElementById('quantidade').value;
  const obs   = document.getElementById('obs').value.trim();

  const r = await fetch('/api/estoque/entrada', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ marca, modelo, qtd: Number(qtd), obs })
  }).then(r => r.json());

  if (!r.ok) { alert('❌ ' + r.erro); return; }

  document.getElementById('marca').value      = '';
  document.getElementById('modelo').value     = '';
  document.getElementById('quantidade').value = '';
  document.getElementById('obs').value        = '';

  mostrarToast(`✅ ${qtd}x ${marca} ${modelo} adicionado ao estoque!`);
  await carregarDados();
}

// ── Venda — modal ──────────────────────────────────────────────
let _vendaPendente = null;

function vender() {
  const marca  = document.getElementById('marcaVenda').value.trim();
  const modelo = document.getElementById('modeloVenda').value.trim();
  const qtd    = Number(document.getElementById('qtdVenda').value);

  if (!marca || !modelo || qtd <= 0) { alert('Preencha Marca, Modelo e Quantidade.'); return; }

  const bat = estoque.find(b => b.modelo === modelo && b.marca === marca);
  if (!bat || bat.qtd < qtd) { alert('Estoque insuficiente. Disponível: ' + (bat ? bat.qtd : 0)); return; }

  _vendaPendente = { marca, modelo, qtd };
  document.getElementById('modalMarca').textContent  = marca;
  document.getElementById('modalModelo').textContent = modelo;
  document.getElementById('modalQtd').textContent    = qtd;
  document.getElementById('overlayVenda').classList.add('ativo');
}

function fecharModalVenda(event) {
  if (event && event.target !== document.getElementById('overlayVenda')) return;
  document.getElementById('overlayVenda').classList.remove('ativo');
  _vendaPendente = null;
}

async function confirmarVenda() {
  if (!_vendaPendente) return;
  const { marca, modelo, qtd } = _vendaPendente;
  _vendaPendente = null;
  document.getElementById('overlayVenda').classList.remove('ativo');

  const r = await fetch('/api/estoque/venda', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ marca, modelo, qtd })
  }).then(r => r.json());

  if (!r.ok) { alert('❌ ' + r.erro); return; }

  document.getElementById('marcaVenda').value  = '';
  document.getElementById('modeloVenda').value = '';
  document.getElementById('qtdVenda').value    = '';

  mostrarToast(`✅ Venda de ${qtd}x ${marca} ${modelo} realizada!`);
  await carregarDados();
}

// ── Estornar ───────────────────────────────────────────────────
async function estornar() {
  const ultima = mov[0];
  if (!ultima) return;
  if (!confirm(`Estornar última movimentação?\n\nTipo: ${ultima.tipo}\nModelo: ${ultima.marca} ${ultima.modelo}\nQuantidade: ${ultima.qtd}\n\nEsta ação é irreversível.`)) return;

  const r = await fetch('/api/estoque/estorno', { method: 'POST' }).then(r => r.json());
  if (!r.ok) { alert('❌ ' + r.erro); return; }
  mostrarToast('↩ Estorno realizado com sucesso.');
  await carregarDados();
}

// ── Relatório por data ─────────────────────────────────────────
function filtrarRelatorio(data) {
  const tabela = document.getElementById('relatorio');
  tabela.innerHTML = '';
  const filtrados = mov.filter(m => {
    const d = new Date(m.data);
    return d.toISOString().split('T')[0] === data;
  });
  if (!filtrados.length) {
    tabela.innerHTML = "<tr><td colspan='4'>Nenhuma movimentação encontrada.</td></tr>";
    return;
  }
  filtrados.forEach(m => {
    const hora = formatarData(m.data).split(', ')[1] || '';
    tabela.innerHTML += `<tr><td>${m.tipo}</td><td>${m.modelo}</td><td>${m.qtd}</td><td>${hora}</td></tr>`;
  });
}

async function relatorio() {
  const data = document.getElementById('dataBusca').value;
  if (!data) { alert('Selecione uma data.'); return; }
  const rows = await fetch(`/api/movimentacoes?data=${data}`).then(r => r.json());
  const tabela = document.getElementById('relatorio');
  tabela.innerHTML = '';
  if (!rows.length) { tabela.innerHTML = "<tr><td colspan='4'>Nenhuma movimentação encontrada.</td></tr>"; return; }
  rows.forEach(m => {
    const hora = formatarData(m.data).split(', ')[1] || '';
    tabela.innerHTML += `<tr><td>${m.tipo}</td><td>${m.modelo}</td><td>${m.qtd}</td><td>${hora}</td></tr>`;
  });
}

// ── Exportar Excel ─────────────────────────────────────────────
function exportarExcel() {
  let csv = 'Tipo,Marca,Modelo,Quantidade,Operador,Data\n';
  mov.forEach(m => { csv += `${m.tipo},${m.marca||''},${m.modelo},${m.qtd},${m.operador||''},${formatarData(m.data)}\n`; });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'relatorio_baterias.csv';
  link.click();
}

// ── Logout ─────────────────────────────────────────────────────
async function fazerLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login';
}

// ── Toast ──────────────────────────────────────────────────────
function mostrarToast(msg) {
  const t = document.getElementById('toastSucesso');
  t.textContent = msg;
  t.className = 'show';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.className = 'hide';
    setTimeout(() => { t.className = ''; }, 350);
  }, 3000);
}
