// ═══════════════════════════════════════════════════════════════
//  script.js — Frontend conectado à API REST
// ═══════════════════════════════════════════════════════════════

let usuarioAtual = null;

// ── API helper ────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, credentials: 'include', headers: {} };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const r = await fetch('/api' + path, opts);
  if (r.status === 401) { window.location.href = '/login.html'; return null; }
  return r.json();
}

// ── Inicialização ─────────────────────────────────────────────
async function init() {
  const me = await api('GET', '/auth/me');
  if (!me || me.erro) { window.location.href = '/login.html'; return; }
  usuarioAtual = me;
  document.getElementById('nomeUsuario').textContent = me.nome;
  document.getElementById('avatarLetra').textContent = me.nome.charAt(0).toUpperCase();
  await atualizar();
}

// ── Renderização ──────────────────────────────────────────────
async function atualizar() {
  const [estoque, movs, acessos] = await Promise.all([
    api('GET', '/estoque'),
    api('GET', '/estoque/movimentacoes'),
    api('GET', '/estoque/acessos'),
  ]);

  // Tabela de estoque
  let tabela = document.getElementById('tabelaEstoque');
  tabela.innerHTML = '';
  let total = 0;
  (estoque || []).forEach(b => {
    total += b.qtd;
    tabela.innerHTML += `<tr>
      <td>${b.marca}</td><td>${b.modelo}</td><td>${b.qtd}</td>
      <td class="destaque">${b.obs || ''}</td>
    </tr>`;
  });
  document.getElementById('total').innerText = total;

  // Movimentações
  let movTable = document.getElementById('mov');
  movTable.innerHTML = '';
  const lista = movs || [];
  lista.forEach((m, i) => {
    const podeEstornar = i === 0;
    movTable.innerHTML += `<tr>
      <td>${m.tipo}</td><td>${m.marca||''}</td><td>${m.modelo}</td>
      <td>${m.qtd}</td><td>${m.data}</td>
      <td>${podeEstornar ? '<button class="btn-estorno" onclick="estornar()">↩ Estornar</button>' : ''}</td>
    </tr>`;
  });

  // Acessos
  let listaAcessos = document.getElementById('acessos');
  listaAcessos.innerHTML = '';
  (acessos || []).forEach(a => {
    const ent = new Date(a.entrada).toLocaleString('pt-BR');
    const sai = a.saida ? new Date(a.saida).toLocaleString('pt-BR') : 'ainda logado';
    listaAcessos.innerHTML += `<li><b>${a.usuario}</b> — entrada: ${ent} | saída: ${sai}</li>`;
  });

  // Relatório do dia atual
  const hoje = new Date().toISOString().split('T')[0];
  await filtrarRelatorio(hoje);
}

// ── Adicionar bateria ─────────────────────────────────────────
async function adicionar() {
  const marca = document.getElementById('marca').value.trim();
  const modelo = document.getElementById('modelo').value.trim();
  const qtd   = Number(document.getElementById('quantidade').value);
  const obs   = document.getElementById('obs').value.trim();

  if (!marca || !modelo || qtd <= 0) { alert('Preencha Marca, Modelo e Quantidade corretamente.'); return; }

  const r = await api('POST', '/estoque/adicionar', { marca, modelo, qtd, obs });
  if (!r || r.erro) { alert(r?.erro || 'Erro ao adicionar.'); return; }

  document.getElementById('marca').value = '';
  document.getElementById('modelo').value = '';
  document.getElementById('quantidade').value = '';
  document.getElementById('obs').value = '';
  mostrarToast('✅ ' + qtd + 'x ' + marca + ' ' + modelo + ' adicionada ao estoque!');
  await atualizar();
}

// ── Modal de confirmação de venda ────────────────────────────
let _vendaPendente = null;

function vender() {
  const marca  = document.getElementById('marcaVenda').value.trim();
  const modelo = document.getElementById('modeloVenda').value.trim();
  const qtd    = Number(document.getElementById('qtdVenda').value);

  if (!marca || !modelo || qtd <= 0) { alert('Preencha Marca, Modelo e Quantidade corretamente.'); return; }

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

  const r = await api('POST', '/estoque/vender', { marca, modelo, qtd });
  if (!r || r.erro) { alert(r?.erro || 'Erro ao registrar venda.'); return; }

  document.getElementById('marcaVenda').value  = '';
  document.getElementById('modeloVenda').value = '';
  document.getElementById('qtdVenda').value    = '';
  mostrarToast('✅ Venda de ' + qtd + 'x ' + marca + ' ' + modelo + ' realizada!');
  await atualizar();
}

// ── Estornar ─────────────────────────────────────────────────
async function estornar() {
  if (!confirm('Estornar a última movimentação? Esta ação é irreversível.')) return;
  const r = await api('POST', '/estoque/estornar');
  if (!r || r.erro) { alert(r?.erro || 'Erro ao estornar.'); return; }
  mostrarToast('↩ Estorno realizado com sucesso.');
  await atualizar();
}

// ── Relatório por data ────────────────────────────────────────
async function filtrarRelatorio(dataISO) {
  const tabela = document.getElementById('relatorio');
  const movs   = await api('GET', '/estoque/movimentacoes?data=' + dataISO);
  tabela.innerHTML = '';
  if (!movs || movs.length === 0) {
    tabela.innerHTML = "<tr><td colspan='4'>Nenhuma movimentação encontrada.</td></tr>";
    return;
  }
  movs.forEach(m => {
    const hora = m.data ? m.data.split(' ')[1] || '' : '';
    tabela.innerHTML += `<tr><td>${m.tipo}</td><td>${m.modelo}</td><td>${m.qtd}</td><td>${hora}</td></tr>`;
  });
}

function relatorio() {
  const data = document.getElementById('dataBusca').value;
  if (!data) { alert('Selecione uma data.'); return; }
  filtrarRelatorio(data);
}

// ── Exportar Excel ────────────────────────────────────────────
async function exportarExcel() {
  const movs = await api('GET', '/estoque/movimentacoes');
  let csv = 'Tipo,Marca,Modelo,Quantidade,Operador,Data\n';
  (movs || []).forEach(m => {
    csv += `${m.tipo},${m.marca||''},${m.modelo},${m.qtd},${m.operador||''},${m.data}\n`;
  });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'relatorio_baterias.csv';
  link.click();
}

// ── Sair ──────────────────────────────────────────────────────
async function sair() {
  await api('POST', '/auth/logout');
  window.location.href = '/login.html';
}

// ── Toast ─────────────────────────────────────────────────────
function mostrarToast(msg) {
  const toast = document.getElementById('toastSucesso');
  toast.textContent = msg;
  toast.className = 'show';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.className = 'hide';
    setTimeout(() => { toast.className = ''; }, 350);
  }, 3000);
}

// Inicializa ao carregar
document.addEventListener('DOMContentLoaded', init);
