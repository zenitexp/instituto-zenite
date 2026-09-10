const API = 'https://seu-app.onrender.com'; // troque depois do deploy

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
  if (!r.ok) throw new Error((await r.json()).erro || 'Erro');
  return r.json();
}

/* Instituto Zênite — Portal Académico
   Arquitetura preparada para substituir o armazenamento local por Firebase/REST.
   Dados de demonstração são mantidos no navegador para o protótipo funcionar no Acode.
*/
const CLASSES = {};
for(let i=2;i<=12;i++) CLASSES[i+"ª"] = [
  "Português","Matemática","Inglês","História","Geografia","Biologia","Física","Química","Informática"
];

const DB_KEY="zenite_db_v1";
let db=JSON.parse(localStorage.getItem(DB_KEY)||"null")||{
  students:[], notifications:[], payments:[], grades:[], debts:[], calendar:[],
  settings:{monthlyFee:180}
};
saveDB();

const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function saveDB(){localStorage.setItem(DB_KEY,JSON.stringify(db))}
function showPage(id){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  const p=$("#"+id); if(p)p.classList.add("active");
  window.scrollTo({top:0,behavior:"smooth"});
}
function toast(msg,type="ok"){
  const t=$("#toast");t.textContent=msg;t.className="toast show";
  t.style.borderColor=type==="error"?"var(--red)":"var(--gold)";
  clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.classList.remove("show"),3200);
}
$("#year").textContent=new Date().getFullYear();

const classSelect=$("#classe");
Object.keys(CLASSES).forEach(c=>classSelect.insertAdjacentHTML("beforeend",`<option>${c}</option>`));
function renderSubjects(){
  const c=classSelect.value, box=$("#subjectsBox");
  box.innerHTML=c?`<div style="grid-column:1/-1;color:#9eb0c5;font-size:12px">Selecione as disciplinas pretendidas para ${c}.</div>`+
  CLASSES[c].map((s,i)=>`<label class="subject"><input type="checkbox" name="disciplinas" value="${esc(s)}"> ${esc(s)}</label>`).join(""):"";
}

function generateCredentials(nome,numero){
  const clean=(nome||"aluno").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
  const code="2007"+String(Math.floor(1000+Math.random()*9000));
  return {email:`${clean}.${numero}@zenite.co.mz`,senha:`${clean}${code}@IZ.com`};
}

$("#registrationForm").addEventListener("submit",e=>{
  e.preventDefault();
  const f=new FormData(e.target), disciplinas=[...document.querySelectorAll('input[name="disciplinas"]:checked')].map(x=>x.value);
  const numero="ZN"+new Date().getFullYear()+String(db.students.length+1).padStart(4,"0");
  const cred=generateCredentials(f.get("nome"),numero);
  const student={
    id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),numero,
    nome:f.get("nome"),apelido:f.get("apelido"),bi:f.get("bi"),dataNascimento:f.get("dataNascimento"),
    provincia:f.get("provincia"),distrito:f.get("distrito"),telefone:f.get("telefone"),whatsapp:f.get("whatsapp"),
    email:f.get("email"),nomePai:f.get("nomePai"),nomeMae:f.get("nomeMae"),
    nomeEncarregado:f.get("nomeEncarregado"),telefoneEncarregado:f.get("telefoneEncarregado"),
    classe:f.get("classe"),modalidade:f.get("modalidade"),disciplinas,status:"Matrícula pendente",
    entradaEmail:cred.email,senha:cred.senha,createdAt:new Date().toISOString()
  };
  db.students.push(student);
  db.notifications.push({numero,studentId:student.id,mensagem:"A sua inscrição foi recebida e aguarda confirmação da matrícula.",data:new Date().toLocaleString("pt-MZ"),lida:false});
  saveDB(); e.target.reset();$("#subjectsBox").innerHTML="";
  showCredentials(student);
});
function showCredentials(s){
  const msg=`Inscrição enviada com sucesso!\\n\\nNº do aluno: ${s.numero}\\nE-mail de entrada: ${s.entradaEmail}\\nSenha: ${s.senha}\\n\\nGuarde estes dados. Acesso às restantes áreas será liberado após a confirmação da matrícula.`;
  alert(msg); // substituído pelo modal real abaixo
}
window.showCredentials=showCredentials;

$("#studentLogin").addEventListener("submit",e=>{
  e.preventDefault();
  const email=$("#loginEmail").value.trim(), pass=$("#loginPassword").value;
  const s=db.students.find(x=>x.entradaEmail===email && x.senha===pass);
  if(!s){toast("Credenciais inválidas.","error");return}
  sessionStorage.setItem("zenite_student",s.id); renderStudent(s.id); showPage("studentDashboard");
});
function currentStudent(){return db.students.find(s=>s.id===sessionStorage.getItem("zenite_student"))}
function renderStudent(id){
  const s=db.students.find(x=>x.id===id);if(!s)return;
  const debt=db.debts.find(d=>d.studentId===id)?.amount||0;
  const grades=db.grades.filter(g=>g.studentId===id);
  $("#studentApp").innerHTML=`
    <div class="dashboard-head"><div><span class="eyebrow">ÁREA DO ALUNO</span><h2>Olá, ${esc(s.nome)} ${esc(s.apelido)}</h2><p class="muted">${esc(s.numero)} • ${esc(s.classe)}</p></div><button class="small-btn" onclick="logoutStudent()">Sair</button></div>
    <div class="dashboard-layout"><aside class="side" id="studentNav">
      ${["Perfil","Notas","Plano de Pagamento","Extrato","Calendário","Saldo Negativo","Histórico"].map((x,i)=>`<button class="${i===0?"active":""}" onclick="studentTab('${x}',this)">${x}</button>`).join("")}
    </aside><div class="dash-content" id="studentContent"></div></div>`;
  studentTab("Perfil",$("#studentNav button"));
}
function studentTab(tab,btn){
  document.querySelectorAll("#studentNav button").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
  const s=currentStudent(), confirmed=s.status==="Matrícula confirmada";
  if(tab!=="Perfil"&&!confirmed){
    $("#studentContent").innerHTML=`<div class="dashboard-card"><h3>Matrícula pendente</h3><p class="muted">O seu perfil está disponível, mas esta área será liberada após a confirmação da matrícula pela administração.</p><span class="pill gold">Matrícula pendente</span></div>`;return;
  }
  const debt=db.debts.find(d=>d.studentId===s.id)?.amount||0;
  if(tab==="Perfil") $("#studentContent").innerHTML=`<div class="stat-grid"><div class="stat"><span>Número</span><b>${esc(s.numero)}</b></div><div class="stat"><span>Classe</span><b>${esc(s.classe)}</b></div><div class="stat"><span>Situação</span><b style="font-size:14px">${esc(s.status)}</b></div><div class="stat"><span>Saldo negativo</span><b>${debt} MT</b></div></div><div class="dashboard-card"><h3>Dados do aluno</h3><p>Nome completo: ${esc(s.nome)} ${esc(s.apelido)}</p><p>Província/Distrito: ${esc(s.provincia)} / ${esc(s.distrito)}</p><p>Telefone: ${esc(s.telefone)}</p><p>Encarregado: ${esc(s.nomeEncarregado)} • ${esc(s.telefoneEncarregado)}</p><p>Disciplinas: ${esc(s.disciplinas.join(", ")||"Não selecionadas")}</p></div>`;
  if(tab==="Notas"){
    const rows=s.disciplinas.map(d=>{const gs=db.grades.filter(g=>g.studentId===s.id&&g.disciplina===d);return `<tr><td>${esc(d)}</td><td>${gs.find(x=>x.item==="Teste 1")?.valor??"—"}</td><td>${gs.find(x=>x.item==="Teste 2")?.valor??"—"}</td><td>${gs.find(x=>x.item==="Trabalho")?.valor??"—"}</td><td>${gs.find(x=>x.item==="Teste Final")?.valor??"—"}</td></tr>`}).join("");
    $("#studentContent").innerHTML=`<div class="dashboard-card"><h3>Notas por disciplina</h3>${debt>0?'<p class="pill red">Notas bloqueadas devido a saldo negativo.</p>':''}<div class="table-wrap"><table class="table"><tr><th>Disciplina</th><th>T1</th><th>T2</th><th>Trab.</th><th>Final</th></tr>${rows}</table></div></div>`;
  }
  if(tab==="Plano de Pagamento") $("#studentContent").innerHTML=`<div class="dashboard-card"><h3>Plano de pagamento</h3><p class="muted">Mensalidade de referência: ${db.settings.monthlyFee} MT</p><table class="table"><tr><th>Conceito</th><th>Valor</th><th>Estado</th></tr><tr><td>Mensalidade</td><td>${db.settings.monthlyFee} MT</td><td><span class="pill gold">Plano activo</span></td></tr></table></div>`;
  if(tab==="Extrato"){const ps=db.payments.filter(p=>p.studentId===s.id);$("#studentContent").innerHTML=`<div class="dashboard-card"><h3>Extrato financeiro</h3><table class="table"><tr><th>Data</th><th>Valor</th><th>Método</th><th>Referência</th></tr>${ps.map(p=>`<tr><td>${esc(p.date)}</td><td>${p.amount} MT</td><td>${esc(p.method)}</td><td>${esc(p.ref)}</td></tr>`).join("")||'<tr><td colspan="4">Sem movimentos.</td></tr>'}</table></div>`}
  if(tab==="Calendário") $("#studentContent").innerHTML=`<div class="dashboard-card"><h3>Calendário académico</h3><table class="table"><tr><th>Data</th><th>Evento</th><th>Hora</th></tr>${db.calendar.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.event)}</td><td>${esc(x.time)}</td></tr>`).join("")||'<tr><td colspan="3">Sem eventos.</td></tr>'}</table></div>`;
  if(tab==="Saldo Negativo") $("#studentContent").innerHTML=`<div class="dashboard-card"><h3>Saldo negativo</h3><div class="stat"><span>Valor em dívida</span><b>${debt} MT</b></div><p class="muted">${debt>0?"Regularize o pagamento para desbloquear funcionalidades académicas.":"Não existe saldo negativo registado."}</p></div>`;
  if(tab==="Histórico"){const ns=db.notifications.filter(n=>n.studentId===s.id);$("#studentContent").innerHTML=`<div class="dashboard-card"><h3>Notificações</h3>${ns.map(n=>`<p><span class="pill ${n.lida?"green":"red"}">${n.lida?"Lida":"Nova"}</span> ${esc(n.mensagem)} <small class="muted">${esc(n.data)}</small></p>`).join("")||'<div class="empty">Sem notificações.</div>'}</div>`}
}
function logoutStudent(){sessionStorage.removeItem("zenite_student");showPage("login");toast("Sessão terminada.")}

$("#adminLoginForm").addEventListener("submit",e=>{
  e.preventDefault();
  if($("#adminUser").value==="admin"&&$("#adminPass").value==="admin123"){sessionStorage.setItem("zenite_admin","1");renderAdmin();showPage("adminDashboard")}
  else toast("Utilizador ou senha incorrectos.","error");
});

function renderAdmin(){
  const pending=db.students.filter(s=>s.status==="Matrícula pendente").length;
  $("#adminApp").innerHTML=`<div class="dashboard-head"><div><span class="eyebrow">PAINEL ADMINISTRATIVO</span><h2>Gestão do Instituto Zênite</h2></div><button class="small-btn" onclick="sessionStorage.removeItem('zenite_admin');showPage('adminLogin')">Sair</button></div>
  <div class="stat-grid"><div class="stat"><span>Total de alunos</span><b>${db.students.length}</b></div><div class="stat"><span>Matrículas pendentes</span><b>${pending}</b></div><div class="stat"><span>Pagamentos</span><b>${db.payments.length}</b></div><div class="stat"><span>Saldo em dívida</span><b>${db.debts.reduce((a,d)=>a+Number(d.amount||0),0)} MT</b></div></div>
  <div class="dashboard-card"><div class="admin-toolbar"><button class="small-btn" onclick="adminTab('alunos')">Alunos</button><button class="small-btn" onclick="adminTab('notas')">Lançar notas</button><button class="small-btn" onclick="adminTab('pagamentos')">Pagamentos</button><button class="small-btn" onclick="adminTab('calendario')">Calendário</button><button class="small-btn" onclick="adminTab('relatorios')">Relatórios</button></div><div id="adminContent"></div></div>`;
  adminTab("alunos");
}
function adminTab(tab){
  const c=$("#adminContent");
  if(tab==="alunos") c.innerHTML=`<h3>Gestão de alunos</h3><div class="table-wrap"><table class="table"><tr><th>Nº</th><th>Aluno</th><th>Classe</th><th>Estado</th><th>Acções</th></tr>${db.students.map(s=>`<tr><td>${esc(s.numero)}</td><td>${esc(s.nome)} ${esc(s.apelido)}</td><td>${esc(s.classe)}</td><td><span class="pill ${s.status==="Matrícula confirmada"?"green":s.status==="Matrícula anulada"?"red":"gold"}">${esc(s.status)}</span></td><td><button class="small-btn" onclick="manageStudent('${s.id}')">Gerir</button></td></tr>`).join("")||'<tr><td colspan="5">Nenhum aluno.</td></tr>'}</table></div>`;
  if(tab==="notas") c.innerHTML=`<h3>Lançamento de notas</h3><label>Aluno<select id="gradeStudent" onchange="gradeForm()"><option value="">Selecionar</option>${db.students.map(s=>`<option value="${s.id}">${esc(s.numero)} — ${esc(s.nome)}</option>`).join("")}</select></label><div id="gradeForm"></div>`;
  if(tab==="pagamentos") c.innerHTML=`<h3>Pagamentos</h3><div class="table-wrap"><table class="table"><tr><th>Aluno</th><th>Data</th><th>Valor</th><th>Método</th><th>Referência</th></tr>${db.payments.map(p=>{const s=db.students.find(x=>x.id===p.studentId);return `<tr><td>${esc(s?.nome||"—")}</td><td>${esc(p.date)}</td><td>${p.amount} MT</td><td>${esc(p.method)}</td><td>${esc(p.ref)}</td></tr>`}).join("")||'<tr><td colspan="5">Sem pagamentos.</td></tr>'}</table></div>`;
  if(tab==="calendario") c.innerHTML=`<h3>Calendário</h3><form onsubmit="addCalendar(event)" class="form-grid"><label>Data<input name="date" type="date" required></label><label>Evento<input name="event" required></label><label>Hora<input name="time" type="time" required></label><button class="btn primary" style="align-self:end">Adicionar</button></form><table class="table" style="margin-top:20px"><tr><th>Data</th><th>Evento</th><th>Hora</th><th></th></tr>${db.calendar.map((x,i)=>`<tr><td>${esc(x.date)}</td><td>${esc(x.event)}</td><td>${esc(x.time)}</td><td><button class="small-btn" onclick="deleteCalendar(${i})">Limpar</button></td></tr>`).join("")}</table>`;
  if(tab==="relatorios") c.innerHTML=`<h3>Resumo administrativo</h3><p>Total de alunos: <b>${db.students.length}</b></p><p>Matrículas confirmadas: <b>${db.students.filter(s=>s.status==="Matrícula confirmada").length}</b></p><p>Matrículas pendentes: <b>${db.students.filter(s=>s.status==="Matrícula pendente").length}</b></p><p>Receita registada: <b>${db.payments.reduce((a,p)=>a+Number(p.amount||0),0)} MT</b></p>`;
}
function manageStudent(id){
  const s=db.students.find(x=>x.id===id); if(!s)return;
  const action=prompt(`Gerir ${s.nome} ${s.apelido}\\n\\n1 Confirmar matrícula\\n2 Anular matrícula\\n3 Suspender\\n4 Activar\\n5 Editar dívida\\n6 Registar pagamento\\n7 Ver formulário\\n8 Excluir\\n\\nDigite o número:`);
  if(action==="1"){s.status="Matrícula confirmada";db.notifications.push({studentId:s.id,numero:s.numero,mensagem:"A sua matrícula foi confirmada. O acesso académico está disponível.",data:new Date().toLocaleString("pt-MZ"),lida:false});}
  else if(action==="2")s.status="Matrícula anulada";
  else if(action==="3")s.status="Suspenso";
  else if(action==="4")s.status="Matrícula confirmada";
  else if(action==="5"){const v=prompt("Novo saldo negativo (MT):","0");db.debts=db.debts.filter(d=>d.studentId!==id);db.debts.push({studentId:id,amount:Number(v)||0});}
  else if(action==="6"){const amount=Number(prompt("Valor (MT):","180"));const method=prompt("Método: M-Pesa / M-Kesh / E-Mola / Outro","M-Pesa");db.payments.push({studentId:id,amount,date:new Date().toLocaleString("pt-MZ"),method,ref:"P"+Date.now()});}
  else if(action==="7"){alert(`FORMULÁRIO\\nNº: ${s.numero}\\nNome: ${s.nome} ${s.apelido}\\nBI: ${s.bi}\\nClasse: ${s.classe}\\nProvíncia: ${s.provincia}\\nDistrito: ${s.distrito}\\nTelefone: ${s.telefone}\\nEncarregado: ${s.nomeEncarregado}\\nDisciplinas: ${s.disciplinas.join(", ")}`);}
  else if(action==="8"){if(confirm("Excluir este aluno?"))db.students=db.students.filter(x=>x.id!==id);}
  saveDB();renderAdmin();toast("Operação concluída.");
}
function gradeForm(){
  const s=db.students.find(x=>x.id===$("#gradeStudent").value),box=$("#gradeForm");if(!s){box.innerHTML="";return}
  box.innerHTML=`<form onsubmit="saveGrade(event)" class="form-grid" style="margin-top:18px"><input type="hidden" name="studentId" value="${s.id}"><label>Disciplina<select name="disciplina">${s.disciplinas.map(x=>`<option>${esc(x)}</option>`).join("")}</select></label><label>Trimestre<select name="trimestre"><option>1º</option><option>2º</option><option>3º</option></select></label><label>Componente<select name="item"><option>Teste 1</option><option>Teste 2</option><option>Trabalho</option><option>Teste Final</option></select></label><label>Nota<input name="valor" type="number" min="0" max="20" step=".01" required></label><button class="btn primary" style="align-self:end">Guardar nota</button></form>`;
}
function saveGrade(e){e.preventDefault();const f=new FormData(e.target);db.grades.push({studentId:f.get("studentId"),disciplina:f.get("disciplina"),trimestre:f.get("trimestre"),item:f.get("item"),valor:Number(f.get("valor"))});saveDB();toast("Nota lançada com sucesso.");gradeForm()}
function addCalendar(e){e.preventDefault();const f=new FormData(e.target);db.calendar.push({date:f.get("date"),event:f.get("event"),time:f.get("time")});saveDB();adminTab("calendario");toast("Evento adicionado.")}
function deleteCalendar(i){db.calendar.splice(i,1);saveDB();adminTab("calendario")}
window.addCalendar=addCalendar;window.deleteCalendar=deleteCalendar;window.adminTab=adminTab;window.manageStudent=manageStudent;window.gradeForm=gradeForm;window.saveGrade=saveGrade;window.studentTab=studentTab;window.logoutStudent=logoutStudent;window.renderSubjects=renderSubjects;window.showPage=showPage;

// Reabrir sessões existentes.
if(sessionStorage.getItem("zenite_student")&&currentStudent()){renderStudent(sessionStorage.getItem("zenite_student"))}
if(sessionStorage.getItem("zenite_admin")){renderAdmin()}

// Nota: alert/confirm/prompts são usados somente no protótipo administrativo.
// Na versão de produção devem ser substituídos pelos modais personalizados do sistema.
