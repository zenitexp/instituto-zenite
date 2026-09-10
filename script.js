/* ============================================
   INSTITUTO ZÊNITE — PORTAL ACADÉMICO
   Frontend ligado a API REST + PostgreSQL
   ============================================ */

/* ⚠️ TROCA ISTO pela URL do teu backend no Render */
const API = 'https://seu-app.onrender.com';

/* ============ API HELPER ============ */
async function api(path, opts = {}) {
  const token = sessionStorage.getItem('zenite_token');
  const r = await fetch(API + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(opts.headers || {})
    }
  });
  let data = null;
  try { data = await r.json(); } catch {}
  if (!r.ok) throw new Error(data?.erro || 'Erro de rede');
  return data;
}

/* ============ HELPERS ============ */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => (
  { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[m]
));

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const p = $('#' + id); if (p) p.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$('#year').textContent = new Date().getFullYear();

/* ============================================
   SISTEMA DE UI — Toasts e Modais
   ============================================ */

(function criarToastContainer() {
  if (document.querySelector('.toast-container')) return;
  const c = document.createElement('div');
  c.className = 'toast-container';
  document.body.appendChild(c);
})();

function toast(msg, type = 'success', titulo = null, duracao = 4000) {
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const titulos = { success: 'Sucesso', error: 'Erro', warning: 'Atenção', info: 'Informação' };

  const container = document.querySelector('.toast-container');
  const el = document.createElement('div');
  el.className = `toast-item ${type}`;
  el.innerHTML = `
    <div class="toast-icon">${icons[type] || '•'}</div>
    <div class="toast-content">
      <div class="toast-title">${esc(titulo || titulos[type] || '')}</div>
      <div class="toast-msg">${esc(msg)}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    <div class="toast-progress" style="animation-duration:${duracao}ms"></div>
  `;
  container.appendChild(el);

  const timer = setTimeout(() => {
    el.classList.add('removing');
    setTimeout(() => el.remove(), 300);
  }, duracao);

  el.querySelector('.toast-close').addEventListener('click', () => {
    clearTimeout(timer);
    el.classList.add('removing');
    setTimeout(() => el.remove(), 300);
  });
}

function modal({ titulo, mensagem, tipo = 'default', icone = null, campos = null, botoes = null }) {
  return new Promise(resolve => {
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ', default: '•' };
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const camposHtml = campos ? campos.map((c, i) => {
      if (c.tipo === 'select') {
        return `<label>${esc(c.label)}
          <select data-idx="${i}">
            ${c.opcoes.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}
          </select>
        </label>`;
      }
      return `<label>${esc(c.label)}
        <input data-idx="${i}" type="${c.tipo || 'text'}"
          value="${esc(c.valor || '')}" placeholder="${esc(c.placeholder || '')}">
      </label>`;
    }).join('') : '';

    const botoesPadrao = botoes || [{ texto: 'OK', tipo: 'primary', valor: true }];
    const botoesHtml = botoesPadrao.map((b, i) =>
      `<button class="btn ${b.tipo || 'primary'}" data-btn="${i}">${esc(b.texto)}</button>`
    ).join('');

    backdrop.innerHTML = `
      <div class="modal-box">
        <div class="modal-header ${tipo}">
          <div class="modal-icon">${icone || icons[tipo]}</div>
          <h3>${esc(titulo || '')}</h3>
        </div>
        <div class="modal-body">
          ${mensagem ? `<div style="margin:0">${mensagem}</div>` : ''}
          ${camposHtml}
        </div>
        <div class="modal-footer">${botoesHtml}</div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const fechar = (resultado) => {
      backdrop.classList.add('closing');
      setTimeout(() => { backdrop.remove(); resolve(resultado); }, 250);
    };

    backdrop.querySelectorAll('[data-btn]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.btn);
        const config = botoesPadrao[idx];
        if (campos) {
          const valores = [];
          backdrop.querySelectorAll('[data-idx]').forEach(inp => {
            valores[Number(inp.dataset.idx)] = inp.value;
          });
          fechar({ botao: config.valor, valores });
        } else {
          fechar(config.valor);
        }
      });
    });

    backdrop.addEventListener('click', e => { if (e.target === backdrop) fechar(null); });
    const escKey = e => {
      if (e.key === 'Escape') { document.removeEventListener('keydown', escKey); fechar(null); }
    };
    document.addEventListener('keydown', escKey);

    setTimeout(() => {
      const primeiro = backdrop.querySelector('input, select');
      if (primeiro) primeiro.focus();
    }, 100);
  });
}

const alertar = (titulo, mensagem, tipo = 'info') =>
  modal({ titulo, mensagem, tipo, botoes: [{ texto: 'OK', tipo: 'primary', valor: true }] });

const confirmar = (titulo, mensagem, tipo = 'warning') =>
  modal({
    titulo, mensagem, tipo,
    botoes: [
      { texto: 'Cancelar', tipo: 'ghost', valor: false },
      { texto: 'Confirmar', tipo: 'primary', valor: true }
    ]
  });

const pedirValores = (titulo, campos, tipo = 'info') =>
  modal({
    titulo, tipo, campos,
    botoes: [
      { texto: 'Cancelar', tipo: 'ghost', valor: false },
      { texto: 'Guardar', tipo: 'primary', valor: true }
    ]
  });

function setLoading(btn, ativo = true) {
  if (!btn) return;
  if (ativo) {
    btn.dataset.textoOriginal = btn.innerHTML;
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
    if (btn.dataset.textoOriginal) btn.innerHTML = btn.dataset.textoOriginal;
  }
}

/* Ripple em botões */
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn, .small-btn, .action-btn');
  if (!btn || btn.disabled) return;
  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement('span');
  const size = Math.max(rect.width, rect.height);
  ripple.className = 'ripple';
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
  ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
});

/* ============================================
   CLASSES E DISCIPLINAS
   ============================================ */
let CLASSES = {};
async function loadClasses() {
  try {
    CLASSES = await api('/classes');
    const classSelect = $('#classe');
    classSelect.innerHTML = '<option value="">Selecionar</option>';
    Object.keys(CLASSES).forEach(c =>
      classSelect.insertAdjacentHTML('beforeend', `<option>${c}</option>`));
  } catch (e) { toast('Erro ao carregar classes', 'error'); }
}
loadClasses();

function renderSubjects() {
  const c = $('#classe').value, box = $('#subjectsBox');
  box.innerHTML = c
    ? `<div style="grid-column:1/-1;color:#9eb0c5;font-size:12px">Selecione as disciplinas pretendidas para ${c}.</div>` +
      CLASSES[c].map(s => `<label class="subject"><input type="checkbox" name="disciplinas" value="${esc(s)}"> ${esc(s)}</label>`).join('')
    : '';
}

/* ============================================
   INSCRIÇÃO
   ============================================ */
$('#registrationForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  setLoading(btn, true);

  const f = new FormData(e.target);
  const disciplinas = [...document.querySelectorAll('input[name="disciplinas"]:checked')].map(x => x.value);
  const body = Object.fromEntries(f);
  body.disciplinas = disciplinas;

  try {
    const cred = await api('/inscricao', { method: 'POST', body: JSON.stringify(body) });
    await modal({
      titulo: 'Inscrição enviada!',
      tipo: 'success',
      mensagem: `
        <p style="margin:0 0 14px">Guarde estes dados de acesso. Vão ser necessários para entrar no portal.</p>
        <div style="background:#091829;border:1px solid var(--line);border-radius:12px;padding:16px;font-family:monospace;font-size:13px;line-height:1.8">
          <div><b style="color:var(--gold2)">Nº do aluno:</b> ${esc(cred.numero)}</div>
          <div><b style="color:var(--gold2)">E-mail:</b> ${esc(cred.entradaEmail)}</div>
          <div><b style="color:var(--gold2)">Senha:</b> ${esc(cred.senha)}</div>
        </div>
        <p style="margin:14px 0 0;font-size:12px;color:var(--muted)">O acesso às restantes áreas será liberado após a confirmação da matrícula.</p>
      `,
      botoes: [{ texto: 'Entendi', tipo: 'primary', valor: true }]
    });
    e.target.reset();
    $('#subjectsBox').innerHTML = '';
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
});

/* ============================================
   LOGIN ALUNO
   ============================================ */
$('#studentLogin').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  setLoading(btn, true);
  try {
    const { token } = await api('/login', {
      method: 'POST',
      body: JSON.stringify({
        email: $('#loginEmail').value.trim(),
        senha: $('#loginPassword').value
      })
    });
    sessionStorage.setItem('zenite_token', token);
    await renderStudent();
    showPage('studentDashboard');
    toast('Bem-vindo de volta!', 'success');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
});

/* ============================================
   DASHBOARD ALUNO
   ============================================ */
async function renderStudent() {
  const s = await api('/aluno/perfil');

  $('#studentApp').innerHTML = `
    <div class="dashboard-head">
      <div>
        <span class="eyebrow">ÁREA DO ALUNO</span>
        <h2>Olá, ${esc(s.nome)} ${esc(s.apelido)}</h2>
        <p class="muted">${esc(s.numero)} • ${esc(s.classe)}</p>
      </div>
      <button class="small-btn danger" onclick="logoutStudent()">Sair</button>
    </div>
    <div class="dashboard-layout">
      <aside class="side" id="studentNav">
        ${['Perfil','Notas','Plano de Pagamento','Extrato','Calendário','Saldo Negativo','Histórico']
          .map((x, i) => `<button class="${i === 0 ? 'active' : ''}" onclick="studentTab('${x}',this)">${x}</button>`)
          .join('')}
      </aside>
      <div class="dash-content" id="studentContent"></div>
    </div>`;

  studentTab('Perfil', $('#studentNav button'));
}

async function studentTab(tab, btn) {
  document.querySelectorAll('#studentNav button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const s = await api('/aluno/perfil');
  const confirmed = s.status === 'Matrícula confirmada';
  const debt = s.debt || 0;
  const c = $('#studentContent');

  if (tab !== 'Perfil' && !confirmed) {
    c.innerHTML = `<div class="dashboard-card">
      <h3>Matrícula pendente</h3>
      <p class="muted">O seu perfil está disponível, mas esta área será liberada após a confirmação da matrícula pela administração.</p>
      <span class="pill gold">Matrícula pendente</span>
    </div>`;
    return;
  }

  if (tab === 'Perfil') {
    c.innerHTML = `
      <div class="stat-grid">
        <div class="stat"><span>Número</span><b>${esc(s.numero)}</b></div>
        <div class="stat"><span>Classe</span><b>${esc(s.classe)}</b></div>
        <div class="stat"><span>Situação</span><b style="font-size:14px">${esc(s.status)}</b></div>
        <div class="stat"><span>Saldo negativo</span><b>${debt} MT</b></div>
      </div>
      <div class="dashboard-card">
        <h3>Dados do aluno</h3>
        <p>Nome completo: ${esc(s.nome)} ${esc(s.apelido)}</p>
        <p>Província/Distrito: ${esc(s.provincia)} / ${esc(s.distrito)}</p>
        <p>Telefone: ${esc(s.telefone)}</p>
        <p>Encarregado: ${esc(s.nome_encarregado)} • ${esc(s.telefone_encarregado)}</p>
        <p>Disciplinas: ${esc((s.disciplinas || []).join(', ') || 'Não selecionadas')}</p>
      </div>`;
  }

  if (tab === 'Notas') {
    const grades = await api('/aluno/notas');
    const rows = (s.disciplinas || []).map(d => {
      const gs = grades.filter(g => g.disciplina === d);
      const get = item => gs.find(x => x.item === item)?.valor ?? '—';
      return `<tr>
        <td>${esc(d)}</td><td>${get('Teste 1')}</td><td>${get('Teste 2')}</td>
        <td>${get('Trabalho')}</td><td>${get('Teste Final')}</td>
      </tr>`;
    }).join('');

    c.innerHTML = `<div class="dashboard-card">
      <h3>Notas por disciplina</h3>
      ${debt > 0 ? '<p class="pill red">Notas bloqueadas devido a saldo negativo.</p>' : ''}
      <div class="table-wrap"><table class="table">
        <tr><th>Disciplina</th><th>T1</th><th>T2</th><th>Trab.</th><th>Final</th></tr>
        ${rows}
      </table></div>
    </div>`;
  }

  if (tab === 'Plano de Pagamento') {
    const { monthlyFee } = await api('/aluno/settings');
    c.innerHTML = `<div class="dashboard-card">
      <h3>Plano de pagamento</h3>
      <p class="muted">Mensalidade de referência: ${monthlyFee} MT</p>
      <table class="table">
        <tr><th>Conceito</th><th>Valor</th><th>Estado</th></tr>
        <tr><td>Mensalidade</td><td>${monthlyFee} MT</td><td><span class="pill gold">Plano activo</span></td></tr>
      </table>
    </div>`;
  }

  if (tab === 'Extrato') {
    const ps = await api('/aluno/extrato');
    c.innerHTML = `<div class="dashboard-card">
      <h3>Extrato financeiro</h3>
      <table class="table">
        <tr><th>Data</th><th>Valor</th><th>Método</th><th>Referência</th></tr>
        ${ps.map(p => `<tr>
          <td>${esc(p.date)}</td><td>${p.amount} MT</td>
          <td>${esc(p.method)}</td><td>${esc(p.ref)}</td>
        </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--muted)">Sem movimentos.</td></tr>'}
      </table>
    </div>`;
  }

  if (tab === 'Calendário') {
    const evs = await api('/aluno/calendario');
    c.innerHTML = `<div class="dashboard-card">
      <h3>Calendário académico</h3>
      <table class="table">
        <tr><th>Data</th><th>Evento</th><th>Hora</th></tr>
        ${evs.map(x => `<tr>
          <td>${esc(x.date)}</td><td>${esc(x.event)}</td><td>${esc(x.time)}</td>
        </tr>`).join('') || '<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--muted)">Sem eventos.</td></tr>'}
      </table>
    </div>`;
  }

  if (tab === 'Saldo Negativo') {
    c.innerHTML = `<div class="dashboard-card">
      <h3>Saldo negativo</h3>
      <div class="stat"><span>Valor em dívida</span><b>${debt} MT</b></div>
      <p class="muted">${debt > 0
        ? 'Regularize o pagamento para desbloquear funcionalidades académicas.'
        : 'Não existe saldo negativo registado.'}</p>
    </div>`;
  }

  if (tab === 'Histórico') {
    const ns = await api('/aluno/notificacoes');
    c.innerHTML = `<div class="dashboard-card">
      <h3>Notificações</h3>
      ${ns.map(n => `<p>
        <span class="pill ${n.lida ? 'green' : 'red'}">${n.lida ? 'Lida' : 'Nova'}</span>
        ${esc(n.mensagem)} <small class="muted">${esc(n.data)}</small>
      </p>`).join('') || '<div class="empty">Sem notificações.</div>'}
    </div>`;
  }
}

async function logoutStudent() {
  const ok = await confirmar('Terminar sessão?', 'Vais sair da tua conta.', 'warning');
  if (!ok) return;
  sessionStorage.removeItem('zenite_token');
  showPage('login');
  toast('Sessão terminada.', 'info');
}

/* ============================================
   LOGIN ADMIN
   ============================================ */
$('#adminLoginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  setLoading(btn, true);
  try {
    const { token } = await api('/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        user: $('#adminUser').value,
        pass: $('#adminPass').value
      })
    });
    sessionStorage.setItem('zenite_token', token);
    sessionStorage.setItem('zenite_admin', '1');
    await renderAdmin();
    showPage('adminDashboard');
    toast('Bem-vindo, Administrador!', 'success');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
});

/* ============================================
   DASHBOARD ADMIN
   ============================================ */
async function renderAdmin() {
  const st = await api('/admin/stats');
  $('#adminApp').innerHTML = `
    <div class="dashboard-head">
      <div>
        <span class="eyebrow">PAINEL ADMINISTRATIVO</span>
        <h2>Gestão do Instituto Zênite</h2>
      </div>
      <button class="small-btn danger" onclick="logoutAdmin()">Sair</button>
    </div>
    <div class="stat-grid">
      <div class="stat"><span>Total de alunos</span><b>${st.students}</b></div>
      <div class="stat"><span>Matrículas pendentes</span><b>${st.pending}</b></div>
      <div class="stat"><span>Pagamentos</span><b>${st.payments}</b></div>
      <div class="stat"><span>Saldo em dívida</span><b>${st.totalDebt} MT</b></div>
    </div>
    <div class="dashboard-card">
      <div class="admin-toolbar">
        <button class="small-btn gold" onclick="adminTab('alunos')">👥 Alunos</button>
        <button class="small-btn" onclick="adminTab('notas')">📝 Lançar notas</button>
        <button class="small-btn" onclick="adminTab('pagamentos')">💳 Pagamentos</button>
        <button class="small-btn" onclick="adminTab('calendario')">📅 Calendário</button>
        <button class="small-btn" onclick="adminTab('relatorios')">📊 Relatórios</button>
      </div>
      <div id="adminContent"></div>
    </div>`;
  adminTab('alunos');
}

async function adminTab(tab) {
  const c = $('#adminContent');
  c.innerHTML = '<div class="skeleton" style="width:100%;height:20px"></div><div class="skeleton" style="width:80%"></div><div class="skeleton" style="width:60%"></div>';

  if (tab === 'alunos') {
    const students = await api('/admin/alunos');
    c.innerHTML = `<h3>Gestão de alunos</h3>
      <div class="table-wrap"><table class="table">
        <tr><th>Nº</th><th>Aluno</th><th>Classe</th><th>Estado</th><th>Acções</th></tr>
        ${students.map(s => `<tr>
          <td>${esc(s.numero)}</td>
          <td>${esc(s.nome)} ${esc(s.apelido)}</td>
          <td>${esc(s.classe)}</td>
          <td><span class="pill ${
            s.status === 'Matrícula confirmada' ? 'green'
            : s.status === 'Matrícula anulada' ? 'red' : 'gold'
          }">${esc(s.status)}</span></td>
          <td>
            <div class="action-group">
              <button class="action-btn confirm" onclick="confirmarMatricula('${s.id}')" title="Confirmar matrícula">✓ Confirmar</button>
              <button class="action-btn cancel" onclick="anularMatricula('${s.id}')" title="Anular matrícula">✕ Anular</button>
              <button class="action-btn money" onclick="editarDivida('${s.id}')" title="Editar dívida">💰 Dívida</button>
              <button class="action-btn money" onclick="registarPagamento('${s.id}')" title="Registar pagamento">💳 Pagamento</button>
              <button class="action-btn info" onclick="verFormulario('${s.id}')" title="Ver dados">📄 Ver</button>
              <button class="action-btn cancel" onclick="excluirAluno('${s.id}')" title="Excluir aluno">🗑 Excluir</button>
            </div>
          </td>
        </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--muted)">Nenhum aluno inscrito ainda.</td></tr>'}
      </table></div>`;
  }

  if (tab === 'notas') {
    const students = await api('/admin/alunos');
    c.innerHTML = `<h3>Lançamento de notas</h3>
      <label style="max-width:400px;display:block">Aluno
        <select id="gradeStudent" onchange="gradeForm()">
          <option value="">Selecionar aluno...</option>
          ${students.map(s => `<option value="${s.id}">${esc(s.numero)} — ${esc(s.nome)} ${esc(s.apelido)}</option>`).join('')}
        </select>
      </label>
      <div id="gradeForm"></div>`;
  }

  if (tab === 'pagamentos') {
    const ps = await api('/admin/pagamentos');
    c.innerHTML = `<h3>Pagamentos registados</h3>
      <div class="table-wrap"><table class="table">
        <tr><th>Aluno</th><th>Data</th><th>Valor</th><th>Método</th><th>Referência</th></tr>
        ${ps.map(p => `<tr>
          <td>${esc(p.nome || '—')}</td><td>${esc(p.date)}</td>
          <td>${p.amount} MT</td><td>${esc(p.method)}</td><td>${esc(p.ref)}</td>
        </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--muted)">Sem pagamentos.</td></tr>'}
      </table></div>`;
  }

  if (tab === 'calendario') {
    const evs = await api('/admin/calendario');
    c.innerHTML = `<h3>Calendário académico</h3>
      <form onsubmit="addCalendar(event)" class="form-grid" style="margin-bottom:20px">
        <label>Data<input name="date" type="date" required></label>
        <label>Evento<input name="event" required placeholder="Ex: Início das aulas"></label>
        <label>Hora<input name="time" type="time" required></label>
        <button class="btn primary" style="align-self:end">+ Adicionar</button>
      </form>
      <table class="table">
        <tr><th>Data</th><th>Evento</th><th>Hora</th><th></th></tr>
        ${evs.map(x => `<tr>
          <td>${esc(x.date)}</td><td>${esc(x.event)}</td><td>${esc(x.time)}</td>
          <td><button class="action-btn cancel" onclick="deleteCalendar(${x.id})">🗑 Limpar</button></td>
        </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--muted)">Sem eventos.</td></tr>'}
      </table>`;
  }

  if (tab === 'relatorios') {
    const st = await api('/admin/stats');
    c.innerHTML = `<h3>Resumo administrativo</h3>
      <div class="stat-grid">
        <div class="stat"><span>Total de alunos</span><b>${st.students}</b></div>
        <div class="stat"><span>Confirmadas</span><b>${st.confirmed}</b></div>
        <div class="stat"><span>Pendentes</span><b>${st.pending}</b></div>
        <div class="stat"><span>Receita total</span><b>${st.revenue} MT</b></div>
      </div>
      <div class="dashboard-card" style="margin-top:15px">
        <p>Saldo em dívida total: <b>${st.totalDebt} MT</b></p>
        <p>Pagamentos registados: <b>${st.payments}</b></p>
      </div>`;
  }
}

/* ============================================
   AÇÕES DE GESTÃO DE ALUNO
   ============================================ */

async function confirmarMatricula(id) {
  const ok = await confirmar(
    'Confirmar matrícula?',
    'O aluno terá acesso a todas as áreas académicas após esta ação.',
    'success'
  );
  if (!ok) return;
  try {
    await api(`/admin/aluno/${id}/estado`, {
      method: 'POST',
      body: JSON.stringify({ status: 'Matrícula confirmada' })
    });
    toast('Matrícula confirmada com sucesso!', 'success');
    await renderAdmin();
  } catch (err) { toast(err.message, 'error'); }
}

async function anularMatricula(id) {
  const ok = await confirmar(
    'Anular matrícula?',
    'O aluno perderá acesso às áreas académicas. Esta ação pode ser revertida.',
    'error'
  );
  if (!ok) return;
  try {
    await api(`/admin/aluno/${id}/estado`, {
      method: 'POST',
      body: JSON.stringify({ status: 'Matrícula anulada' })
    });
    toast('Matrícula anulada.', 'warning');
    await renderAdmin();
  } catch (err) { toast(err.message, 'error'); }
}

async function editarDivida(id) {
  const res = await pedirValores(
    'Editar saldo negativo',
    [{ label: 'Valor em dívida (MT)', tipo: 'number', valor: '0', placeholder: 'Ex: 500' }],
    'warning'
  );
  if (!res || !res.botao) return;
  try {
    await api(`/admin/aluno/${id}/divida`, {
      method: 'POST',
      body: JSON.stringify({ amount: Number(res.valores[0]) || 0 })
    });
    toast('Dívida atualizada!', 'success');
    await renderAdmin();
  } catch (err) { toast(err.message, 'error'); }
}

async function registarPagamento(id) {
  const res = await pedirValores(
    'Registar pagamento',
    [
      { label: 'Valor (MT)', tipo: 'number', valor: '180', placeholder: 'Ex: 180' },
      { label: 'Método', tipo: 'select', opcoes: ['M-Pesa', 'M-Kesh', 'E-Mola', 'Transferência', 'Dinheiro'] }
    ],
    'success'
  );
  if (!res || !res.botao) return;
  try {
    await api(`/admin/aluno/${id}/pagamento`, {
      method: 'POST',
      body: JSON.stringify({
        amount: Number(res.valores[0]) || 0,
        method: res.valores[1]
      })
    });
    toast('Pagamento registado!', 'success');
    await renderAdmin();
  } catch (err) { toast(err.message, 'error'); }
}

async function verFormulario(id) {
  const students = await api('/admin/alunos');
  const s = students.find(x => x.id === id);
  if (!s) return;

  await modal({
    titulo: `Formulário — ${s.nome} ${s.apelido}`,
    tipo: 'info',
    mensagem: `
      <div style="display:grid;gap:8px;font-size:13px">
        <div><b style="color:var(--gold2)">Nº do aluno:</b> ${esc(s.numero)}</div>
        <div><b style="color:var(--gold2)">Nome completo:</b> ${esc(s.nome)} ${esc(s.apelido)}</div>
        <div><b style="color:var(--gold2)">BI:</b> ${esc(s.bi)}</div>
        <div><b style="color:var(--gold2)">Data de nascimento:</b> ${esc(s.data_nascimento)}</div>
        <div><b style="color:var(--gold2)">Província/Distrito:</b> ${esc(s.provincia)} / ${esc(s.distrito)}</div>
        <div><b style="color:var(--gold2)">Telefone:</b> ${esc(s.telefone)}</div>
        <div><b style="color:var(--gold2)">WhatsApp:</b> ${esc(s.whatsapp || '—')}</div>
        <div><b style="color:var(--gold2)">Email:</b> ${esc(s.email || '—')}</div>
        <div><b style="color:var(--gold2)">Pai:</b> ${esc(s.nome_pai || '—')}</div>
        <div><b style="color:var(--gold2)">Mãe:</b> ${esc(s.nome_mae || '—')}</div>
        <div><b style="color:var(--gold2)">Encarregado:</b> ${esc(s.nome_encarregado)} (${esc(s.telefone_encarregado)})</div>
        <div><b style="color:var(--gold2)">Classe:</b> ${esc(s.classe)}</div>
        <div><b style="color:var(--gold2)">Modalidade:</b> ${esc(s.modalidade)}</div>
        <div><b style="color:var(--gold2)">Disciplinas:</b> ${esc((s.disciplinas || []).join(', '))}</div>
        <div><b style="color:var(--gold2)">Estado:</b> ${esc(s.status)}</div>
      </div>`,
    botoes: [{ texto: 'Fechar', tipo: 'primary', valor: true }]
  });
}

async function excluirAluno(id) {
  const ok = await confirmar(
    'Excluir aluno?',
    'Todos os dados (notas, pagamentos, dívidas e notificações) serão apagados permanentemente. Esta ação NÃO pode ser revertida.',
    'error'
  );
  if (!ok) return;
  try {
    await api(`/admin/aluno/${id}`, { method: 'DELETE' });
    toast('Aluno excluído.', 'success');
    await renderAdmin();
  } catch (err) { toast(err.message, 'error'); }
}

/* ============================================
   NOTAS
   ============================================ */
async function gradeForm() {
  const id = $('#gradeStudent').value;
  const box = $('#gradeForm');
  if (!id) { box.innerHTML = ''; return; }

  const students = await api('/admin/alunos');
  const s = students.find(x => x.id === id);
  if (!s) return;

  box.innerHTML = `<form onsubmit="saveGrade(event)" class="form-grid" style="margin-top:18px">
    <input type="hidden" name="studentId" value="${s.id}">
    <label>Disciplina<select name="disciplina">
      ${(s.disciplinas || []).map(x => `<option>${esc(x)}</option>`).join('')}
    </select></label>
    <label>Trimestre<select name="trimestre">
      <option>1º</option><option>2º</option><option>3º</option>
    </select></label>
    <label>Componente<select name="item">
      <option>Teste 1</option><option>Teste 2</option>
      <option>Trabalho</option><option>Teste Final</option>
    </select></label>
    <label>Nota<input name="valor" type="number" min="0" max="20" step=".01" required></label>
    <button class="btn primary" style="align-self:end">💾 Guardar nota</button>
  </form>`;
}

async function saveGrade(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  setLoading(btn, true);
  const f = new FormData(e.target);
  const body = Object.fromEntries(f);
  body.valor = Number(body.valor);
  try {
    await api('/admin/nota', { method: 'POST', body: JSON.stringify(body) });
    toast('Nota lançada com sucesso.', 'success');
    gradeForm();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

/* ============================================
   CALENDÁRIO
   ============================================ */
async function addCalendar(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  setLoading(btn, true);
  const f = new FormData(e.target);
  try {
    await api('/admin/calendario', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(f))
    });
    toast('Evento adicionado.', 'success');
    adminTab('calendario');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function deleteCalendar(id) {
  const ok = await confirmar('Remover evento?', 'O evento será eliminado do calendário.', 'warning');
  if (!ok) return;
  try {
    await api(`/admin/calendario/${id}`, { method: 'DELETE' });
    toast('Evento removido.', 'success');
    adminTab('calendario');
  } catch (err) { toast(err.message, 'error'); }
}

/* ============================================
   LOGOUT ADMIN
   ============================================ */
async function logoutAdmin() {
  const ok = await confirmar('Terminar sessão?', 'Vais sair do painel administrativo.', 'warning');
  if (!ok) return;
  sessionStorage.removeItem('zenite_token');
  sessionStorage.removeItem('zenite_admin');
  showPage('adminLogin');
  toast('Sessão terminada.', 'info');
}

/* ============================================
   EXPORTS GLOBAIS
   ============================================ */
window.showPage = showPage;
window.renderSubjects = renderSubjects;
window.studentTab = studentTab;
window.logoutStudent = logoutStudent;
window.adminTab = adminTab;
window.gradeForm = gradeForm;
window.saveGrade = saveGrade;
window.addCalendar = addCalendar;
window.deleteCalendar = deleteCalendar;
window.logoutAdmin = logoutAdmin;
window.confirmarMatricula = confirmarMatricula;
window.anularMatricula = anularMatricula;
window.editarDivida = editarDivida;
window.registarPagamento = registarPagamento;
window.verFormulario = verFormulario;
window.excluirAluno = excluirAluno;
window.modal = modal;
window.alertar = alertar;
window.confirmar = confirmar;
window.pedirValores = pedirValores;
window.setLoading = setLoading;

/* ============================================
   SESSÕES EXISTENTES
   ============================================ */
if (sessionStorage.getItem('zenite_admin')) {
  renderAdmin().catch(() => {});
  showPage('adminDashboard');
} else if (sessionStorage.getItem('zenite_token')) {
  renderStudent().catch(() => {});
  showPage('studentDashboard');
}
