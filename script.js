/* Instituto Zênite — Portal Académico (API real) */
const API = 'https://seu-app.onrender.com'; // ⚠️ TROCA ISTO pela URL do teu Render

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

function toast(msg, type = 'ok') {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast show';
  t.style.borderColor = type === 'error' ? 'var(--red)' : 'var(--gold)';
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

$('#year').textContent = new Date().getFullYear();

/* ============ CLASSES / DISCIPLINAS ============ */
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

/* ============ INSCRIÇÃO ============ */
$('#registrationForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const disciplinas = [...document.querySelectorAll('input[name="disciplinas"]:checked')].map(x => x.value);
  const body = Object.fromEntries(f);
  body.disciplinas = disciplinas;

  try {
    const cred = await api('/inscricao', { method: 'POST', body: JSON.stringify(body) });
    alert(
      `Inscrição enviada com sucesso!\n\n` +
      `Nº do aluno: ${cred.numero}\n` +
      `E-mail de entrada: ${cred.entradaEmail}\n` +
      `Senha: ${cred.senha}\n\n` +
      `Guarde estes dados. O acesso às restantes áreas será liberado após a confirmação da matrícula.`
    );
    e.target.reset();
    $('#subjectsBox').innerHTML = '';
  } catch (err) { toast(err.message, 'error'); }
});

/* ============ LOGIN ALUNO ============ */
$('#studentLogin').addEventListener('submit', async e => {
  e.preventDefault();
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
  } catch (err) { toast(err.message, 'error'); }
});

/* ============ DASHBOARD ALUNO ============ */
async function renderStudent() {
  const s = await api('/aluno/perfil');

  $('#studentApp').innerHTML = `
    <div class="dashboard-head">
      <div>
        <span class="eyebrow">ÁREA DO ALUNO</span>
        <h2>Olá, ${esc(s.nome)} ${esc(s.apelido)}</h2>
        <p class="muted">${esc(s.numero)} • ${esc(s.classe)}</p>
      </div>
      <button class="small-btn" onclick="logoutStudent()">Sair</button>
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
        <td>${esc(d)}</td>
        <td>${get('Teste 1')}</td>
        <td>${get('Teste 2')}</td>
        <td>${get('Trabalho')}</td>
        <td>${get('Teste Final')}</td>
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
        </tr>`).join('') || '<tr><td colspan="4">Sem movimentos.</td></tr>'}
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
        </tr>`).join('') || '<tr><td colspan="3">Sem eventos.</td></tr>'}
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

function logoutStudent() {
  sessionStorage.removeItem('zenite_token');
  showPage('login');
  toast('Sessão terminada.');
}

/* ============ LOGIN ADMIN ============ */
$('#adminLoginForm').addEventListener('submit', async e => {
  e.preventDefault();
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
  } catch (err) { toast(err.message, 'error'); }
});

/* ============ DASHBOARD ADMIN ============ */
async function renderAdmin() {
  const st = await api('/admin/stats');
  $('#adminApp').innerHTML = `
    <div class="dashboard-head">
      <div>
        <span class="eyebrow">PAINEL ADMINISTRATIVO</span>
        <h2>Gestão do Instituto Zênite</h2>
      </div>
      <button class="small-btn" onclick="logoutAdmin()">Sair</button>
    </div>
    <div class="stat-grid">
      <div class="stat"><span>Total de alunos</span><b>${st.students}</b></div>
      <div class="stat"><span>Matrículas pendentes</span><b>${st.pending}</b></div>
      <div class="stat"><span>Pagamentos</span><b>${st.payments}</b></div>
      <div class="stat"><span>Saldo em dívida</span><b>${st.totalDebt} MT</b></div>
    </div>
    <div class="dashboard-card">
      <div class="admin-toolbar">
        <button class="small-btn" onclick="adminTab('alunos')">Alunos</button>
        <button class="small-btn" onclick="adminTab('notas')">Lançar notas</button>
        <button class="small-btn" onclick="adminTab('pagamentos')">Pagamentos</button>
        <button class="small-btn" onclick="adminTab('calendario')">Calendário</button>
        <button class="small-btn" onclick="adminTab('relatorios')">Relatórios</button>
      </div>
      <div id="adminContent"></div>
    </div>`;
  adminTab('alunos');
}

async function adminTab(tab) {
  const c = $('#adminContent');

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
          <td><button class="small-btn" onclick="manageStudent('${s.id}')">Gerir</button></td>
        </tr>`).join('') || '<tr><td colspan="5">Nenhum aluno.</td></tr>'}
      </table></div>`;
  }

  if (tab === 'notas') {
    const students = await api('/admin/alunos');
    c.innerHTML = `<h3>Lançamento de notas</h3>
      <label>Aluno
        <select id="gradeStudent" onchange="gradeForm()">
          <option value="">Selecionar</option>
          ${students.map(s => `<option value="${s.id}">${esc(s.numero)} — ${esc(s.nome)}</option>`).join('')}
        </select>
      </label>
      <div id="gradeForm"></div>`;
  }

  if (tab === 'pagamentos') {
    const ps = await api('/admin/pagamentos');
    c.innerHTML = `<h3>Pagamentos</h3>
      <div class="table-wrap"><table class="table">
        <tr><th>Aluno</th><th>Data</th><th>Valor</th><th>Método</th><th>Referência</th></tr>
        ${ps.map(p => `<tr>
          <td>${esc(p.nome || '—')}</td><td>${esc(p.date)}</td>
          <td>${p.amount} MT</td><td>${esc(p.method)}</td><td>${esc(p.ref)}</td>
        </tr>`).join('') || '<tr><td colspan="5">Sem pagamentos.</td></tr>'}
      </table></div>`;
  }

  if (tab === 'calendario') {
    const evs = await api('/admin/calendario');
    c.innerHTML = `<h3>Calendário</h3>
      <form onsubmit="addCalendar(event)" class="form-grid">
        <label>Data<input name="date" type="date" required></label>
        <label>Evento<input name="event" required></label>
        <label>Hora<input name="time" type="time" required></label>
        <button class="btn primary" style="align-self:end">Adicionar</button>
      </form>
      <table class="table" style="margin-top:20px">
        <tr><th>Data</th><th>Evento</th><th>Hora</th><th></th></tr>
        ${evs.map(x => `<tr>
          <td>${esc(x.date)}</td><td>${esc(x.event)}</td><td>${esc(x.time)}</td>
          <td><button class="small-btn" onclick="deleteCalendar(${x.id})">Limpar</button></td>
        </tr>`).join('')}
      </table>`;
  }

  if (tab === 'relatorios') {
    const st = await api('/admin/stats');
    c.innerHTML = `<h3>Resumo administrativo</h3>
      <p>Total de alunos: <b>${st.students}</b></p>
      <p>Matrículas confirmadas: <b>${st.confirmed}</b></p>
      <p>Matrículas pendentes: <b>${st.pending}</b></p>
      <p>Receita registada: <b>${st.revenue} MT</b></p>
      <p>Saldo em dívida: <b>${st.totalDebt} MT</b></p>`;
  }
}

async function manageStudent(id) {
  const students = await api('/admin/alunos');
  const s = students.find(x => x.id === id);
  if (!s) return;

  const action = prompt(
    `Gerir ${s.nome} ${s.apelido}\n\n` +
    `1 Confirmar matrícula\n2 Anular matrícula\n3 Suspender\n4 Activar\n` +
    `5 Editar dívida\n6 Registar pagamento\n7 Ver formulário\n8 Excluir\n\nDigite o número:`
  );

  const mapStatus = {
    '1': 'Matrícula confirmada',
    '2': 'Matrícula anulada',
    '3': 'Suspenso',
    '4': 'Matrícula confirmada'
  };

  try {
    if (mapStatus[action]) {
      await api(`/admin/aluno/${id}/estado`, {
        method: 'POST',
        body: JSON.stringify({ status: mapStatus[action] })
      });
    } else if (action === '5') {
      const v = prompt('Novo saldo negativo (MT):', '0');
      await api(`/admin/aluno/${id}/divida`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(v) || 0 })
      });
    } else if (action === '6') {
      const amount = Number(prompt('Valor (MT):', '180'));
      const method = prompt('Método: M-Pesa / M-Kesh / E-Mola / Outro', 'M-Pesa');
      await api(`/admin/aluno/${id}/pagamento`, {
        method: 'POST',
        body: JSON.stringify({ amount, method })
      });
    } else if (action === '7') {
      alert(
        `FORMULÁRIO\n` +
        `Nº: ${s.numero}\nNome: ${s.nome} ${s.apelido}\nBI: ${s.bi}\n` +
        `Classe: ${s.classe}\nProvíncia: ${s.provincia}\nDistrito: ${s.distrito}\n` +
        `Telefone: ${s.telefone}\nEncarregado: ${s.nome_encarregado}\n` +
        `Disciplinas: ${(s.disciplinas || []).join(', ')}`
      );
      return;
    } else if (action === '8') {
      if (!confirm('Excluir este aluno?')) return;
      await api(`/admin/aluno/${id}`, { method: 'DELETE' });
    } else return;

    toast('Operação concluída.');
    await renderAdmin();
  } catch (err) { toast(err.message, 'error'); }
}

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
    <button class="btn primary" style="align-self:end">Guardar nota</button>
  </form>`;
}

async function saveGrade(e) {
  e.preventDefault();
  const f = new FormData(e.target);
  const body = Object.fromEntries(f);
  body.valor = Number(body.valor);
  try {
    await api('/admin/nota', { method: 'POST', body: JSON.stringify(body) });
    toast('Nota lançada com sucesso.');
    gradeForm();
  } catch (err) { toast(err.message, 'error'); }
}

async function addCalendar(e) {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await api('/admin/calendario', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(f))
    });
    toast('Evento adicionado.');
    adminTab('calendario');
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteCalendar(id) {
  try {
    await api(`/admin/calendario/${id}`, { method: 'DELETE' });
    adminTab('calendario');
  } catch (err) { toast(err.message, 'error'); }
}

function logoutAdmin() {
  sessionStorage.removeItem('zenite_token');
  sessionStorage.removeItem('zenite_admin');
  showPage('adminLogin');
  toast('Sessão terminada.');
}

/* ============ EXPORTS GLOBAIS ============ */
window.showPage = showPage;
window.renderSubjects = renderSubjects;
window.studentTab = studentTab;
window.logoutStudent = logoutStudent;
window.adminTab = adminTab;
window.manageStudent = manageStudent;
window.gradeForm = gradeForm;
window.saveGrade = saveGrade;
window.addCalendar = addCalendar;
window.deleteCalendar = deleteCalendar;
window.logoutAdmin = logoutAdmin;

/* ============ SESSÕES EXISTENTES ============ */
if (sessionStorage.getItem('zenite_admin')) {
  renderAdmin().catch(() => {});
  showPage('adminDashboard');
} else if (sessionStorage.getItem('zenite_token')) {
  renderStudent().catch(() => {});
  showPage('studentDashboard');
}
