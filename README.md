# Instituto Zênite — Portal Académico

Protótipo funcional para Acode/GitHub Pages, organizado em:
- `index.html`
- `style.css`
- `script.js`

## Funcionalidades incluídas

### Público
- Página inicial institucional
- Inscrição digital
- Classes da 2ª à 12ª
- Disciplinas por classe
- Dados do aluno e encarregado
- Geração de número, e-mail de entrada e senha

### Aluno
- Login
- Perfil
- Bloqueio das áreas académicas enquanto a matrícula estiver pendente
- Notas por disciplina
- Plano de pagamento
- Extrato
- Calendário
- Saldo negativo
- Histórico/notificações
- Sessão/logout

### Administração
- Login inicial: `admin` / `admin123`
- Dashboard com indicadores
- Gestão de alunos
- Confirmar/anular/suspender/activar
- Editar dívida
- Registar pagamentos
- Ver formulário
- Excluir aluno
- Lançar notas
- Calendário
- Relatórios básicos

### Financeiro
- Mensalidade configurável no objeto `settings`
- M-Pesa, M-Kesh e E-Mola como métodos de pagamento
- Dívida/saldo negativo
- Extrato

## Próxima fase recomendada

Para produção multi-dispositivo, substituir o `localStorage` por Firebase:
1. Firebase Authentication para contas.
2. Firestore para alunos, matrículas, notas, pagamentos, calendário e notificações.
3. Firebase Security Rules por perfil (admin/aluno).
4. Cloud Functions para gerar credenciais e tarefas administrativas.
5. Storage para documentos.
6. Auditoria de alterações.

O protótipo usa armazenamento local apenas para permitir teste imediato no Acode sem depender de servidor.
