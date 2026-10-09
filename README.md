# LURE Educação 2 — Área de Membros

Cópia do AssessoriaLure (repositório `LureTech/lureedu`) com a mesma plataforma — trilhas por seção, player de aulas, progresso, prova final, certificados verificáveis, comunidade, diagnóstico de maturidade e painel administrativo — mas começando **sem trilhas, módulos nem aulas**, para receber conteúdo novo.

- **Frontend:** Angular 22 (standalone + signals, Tailwind CSS 4)
- **API:** TypeScript + Hono, rodando como função serverless na Vercel (`api/index.ts` → `server/`)
- **Banco:** o mesmo PostgreSQL no Supabase do LURE EDUCAÇÃO original, mas no schema **`lure2`**; arquivos enviados ficam na tabela `stored_files`
- **Publicação:** Vercel (site + API no mesmo projeto, `vercel.json`), num projeto separado (`lureedu2`)

## Um banco, dois sites separados

Os dois sites usam o mesmo projeto do Supabase, mas cada um tem o seu schema (uma "pasta" de tabelas):

| Site | Schema | O que tem |
|---|---|---|
| LURE EDUCAÇÃO (original) | `lure` | trilhas, aulas, alunos e comunidade do original |
| LURE Educação 2 (este) | `lure2` | as mesmas tabelas, começando vazias |

- A API deste site só enxerga o `lure2` (`DB_SCHEMA=lure2` no `supabase.env` e na Vercel). Nada que se faz aqui aparece lá, e vice-versa.
- Alunos, progresso, certificados, comunidade, notificações e arquivos enviados também são separados.
- Os logins são separados: o `supabase.env` deste site tem um `JWT_SECRET` próprio. As contas de **administrador** do original foram copiadas para cá (mesmo e-mail e mesma senha); trocar a senha num site não muda no outro.
- O `lure2` foi criado por `npx tsx scripts/criar-schema.ts`, que roda as mesmas migrações do original. Ele nunca escreve no schema `lure`.
- **Mudanças no banco:** uma migração nova em `server/sql/` deste projeto vale só para o `lure2`. Se o original ganhar uma coluna nova e você quiser aqui também, copie a migração para cá e rode `npx tsx scripts/setup-db.ts`.

## Abrir no computador (Windows)

1. Dê dois cliques em **`iniciar.cmd`**.
2. O navegador abre em **http://localhost:4201**.
3. Entre com a mesma conta de administrador do LURE EDUCAÇÃO original.
4. Em **Admin → Módulos**, crie as trilhas, os módulos e as aulas novas.

Os servidores ficam rodando em segundo plano. Para desligar, dê dois cliques em **`parar.cmd`**.

- **O que o `iniciar.cmd` faz:** usa o Node da pasta `.tools` (ou o Node 24.15+ do sistema, ou baixa um portátil, sem instalar nada no Windows) e sobe a API e o site. Na primeira vez instala as dependências.
- **Banco:** o Supabase do original, schema `lure2`, configurado em `supabase.env` (não vai para o Git).
- **Logs:** ficam em `logs\` (`backend.log` é a API, `frontend.log` o site).
- **Portas:** API na **8086**, site na **4201**. Assim dá para rodar o original (8085/4200) e este ao mesmo tempo sem um usar a API do outro.

## Estrutura

```
api/         entrada da função da Vercel
server/      API em TypeScript — app.ts, routes/ (uma por área), lib/ (banco, login, arquivos), sql/
frontend/    App Angular — src/app/{core,shared,layout,pages}
docs/        API.md (contrato da API) e FALHAS-E-CORRECOES.md (o que foi corrigido do esboço)
scripts/     iniciar.ps1 / parar.ps1 (usados pelos .cmd), criar-schema.ts (cria o lure2) e setup-db.ts (migrações)
backend/     API Java antiga — não é mais usada; as migrações em src/main/resources/db/migration criam as tabelas
```

## Desenvolvimento

Requisito: **Node 24.15+** (ou use o da pasta `.tools`).

```bash
npm install
npm run dev:api        # API em http://localhost:8086 (lê o supabase.env → schema lure2)
npm run typecheck

cd frontend
npm install
npm start              # site em http://localhost:4201 (proxy de /api e /files para a API local da 8086;
                       #   LURE_API=https://<site>.vercel.app npm start usa a API publicada deste site)
```

Migrações novas em `server/sql/`: `npx tsx scripts/setup-db.ts` (aplica no schema do `DB_SCHEMA`).

## Publicar na Vercel

Este site ainda não tem repositório no GitHub nem projeto na Vercel (a cópia foi desligada dos do original). Para publicar:

1. Crie um repositório novo no GitHub e faça `git remote add origin <url>` + `git push -u origin main`.
2. Rode `powershell -ExecutionPolicy Bypass -File scripts\publicar-vercel.ps1`: cria o projeto `lureedu2` na Vercel, copia as variáveis do `supabase.env` (inclusive `DB_SCHEMA=lure2`) e publica.
3. No projeto `lureedu2` da Vercel, conecte o repositório novo (Settings → Git) para cada push na `main` publicar.

Variáveis do projeto (Settings → Environment Variables):

| Variável | Valor |
|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | iguais ao `supabase.env` |
| `DB_SCHEMA` | `lure2` — **nunca** `lure`, que é o schema do site original |
| `JWT_SECRET` | texto aleatório com 32+ caracteres, diferente do original |
| `APP_FRONTEND_URL` | endereço do site na Vercel (link do e-mail de "esqueci a senha") |
| `WEBAUTHN_RP_ID` | domínio do site na Vercel, sem `https://` (Face ID) |
| `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`, `MAIL_FROM` | SMTP (opcional) |

A Vercel limita cada envio a cerca de 4,5 MB: fotos, capas e materiais maiores que isso não sobem.

## Como usar

- **Vídeos:** cole na aula (Admin → Módulos → editar módulo) um link do YouTube (**Não listado**) ou o link público de um `.mp4` hospedado no Cloudflare R2 (10 GB grátis, sem custo de tráfego — veja [docs/VIDEOS.md](docs/VIDEOS.md)). O banco guarda só o link; o vídeo toca no player da LURE.
- **Certificado:** sai sozinho quando o aluno conclui todas as aulas e passa na prova final (se o módulo tiver prova, nota mínima 70%). Qualquer pessoa confere em `/certificado/<código>`.
- **Módulo "Em gravação":** trancado para alunos, que o veem como "Em breve". Ao liberar, todos os alunos recebem uma notificação.
- **Esqueci a senha:** envia e-mail se o SMTP estiver configurado; sem SMTP, o link aparece no log da API (`logs\backend.log` no computador, ou nos logs da Vercel). O admin também pode redefinir a senha de qualquer conta.
