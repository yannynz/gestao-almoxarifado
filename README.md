# Almox

Aplicação mobile-first para controlar ferramentas, empréstimos e insumos de um pequeno almoxarifado.

## Rodar localmente

1. Copie `.env.example` para `.env.local`.
2. Suba o PostgreSQL: `docker compose up -d`.
3. Instale dependências: `npm install`.
4. Aplique as migrations: `npm run db:migrate`.
5. Crie o único administrador conforme a seção abaixo.
6. Opcionalmente carregue dados fictícios: `npm run db:seed`.
7. Inicie: `npm run dev`.

## Criar o único administrador

O banco possui uma restrição que impede a existência de dois usuários ADMIN. Não existe cadastro de usuários pela interface neste MVP.

Com `DATABASE_URL` configurada no `.env.local`, execute no terminal:

```bash
export ADMIN_USERNAME=admin
export ADMIN_DISPLAY_NAME='Administrador'
read -s ADMIN_PASSWORD && export ADMIN_PASSWORD
npm run db:create-admin
unset ADMIN_PASSWORD
```

A senha deve possuir entre 15 e 128 caracteres. Ela é transformada em Argon2id antes de chegar ao banco e não deve ser cadastrada como variável permanente na Vercel.

Para trocar a senha e revogar todas as sessões anteriores:

```bash
export ADMIN_USERNAME=admin
read -s ADMIN_PASSWORD && export ADMIN_PASSWORD
npm run db:set-admin-password
unset ADMIN_PASSWORD
```

## Deploy

1. Crie o PostgreSQL no Neon. Use uma credencial proprietária em `MIGRATION_DATABASE_URL` somente na máquina/CI que aplica migrations e uma credencial de runtime com privilégios mínimos em `DATABASE_URL` na Vercel.
2. Na Vercel, configure somente `DATABASE_URL`; o modo demonstração já é bloqueado em produção pelo código.
3. Execute `npm run db:migrate` contra o Neon fora do runtime da aplicação.
4. Execute `npm run db:create-admin` uma única vez, da sua máquina, apontando `DATABASE_URL` para o Neon.
5. Remova `ADMIN_PASSWORD` do ambiente imediatamente depois.
6. Não execute `db:seed` em produção: cadastre os dados reais pela interface.

## Segurança aplicada

- senha com Argon2id e parâmetros mínimos recomendados pela OWASP;
- apenas um ADMIN garantido por índice único no PostgreSQL;
- sessão aleatória server-side, cookie `HttpOnly`, `Secure`, `SameSite=Lax` e prefixo `__Host-` em produção;
- expiração absoluta de 12 horas e por inatividade de 60 minutos;
- limitação de tentativas de login compartilhada no PostgreSQL;
- respostas genéricas de autenticação;
- autorização ADMIN validada no servidor;
- CSP, HSTS, proteção contra framing, MIME sniffing e vazamento de referrer;
- logs de eventos de autenticação sem senha ou token;
- `ALLOW_DEMO_LOGIN` bloqueado em produção pelo código, mesmo se configurado incorretamente.

## Escopo atual

- login e sessão server-side;
- dashboard operacional;
- cadastro de funcionários, ferramentas e insumos;
- retirada e devolução de ferramentas;
- entrada e consumo atômico de insumos;
- histórico de movimentações;
- layout responsivo com navegação mobile.

## Verificação

- `npm test` — regras essenciais e hashing;
- `npm run lint` — análise estática;
- `npm run build` — build de produção;
- `npm audit --omit=dev` — auditoria das dependências carregadas em produção.
