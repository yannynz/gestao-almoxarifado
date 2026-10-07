# Segurança

Este MVP foi revisado contra o OWASP Top 10:2025 e os cheat sheets de autenticação, armazenamento de senhas, sessões, autorização, CSRF, logging e cabeçalhos HTTP.

## Controles implementados

- Um único usuário `ADMIN`, garantido por índice único parcial no PostgreSQL.
- Nenhum endpoint ou tela pública para criação de usuários.
- Senhas entre 15 e 128 caracteres, armazenadas com Argon2id (`19 MiB`, 2 iterações, paralelismo 1).
- Resposta genérica e comparação com hash fictício para reduzir enumeração de contas.
- Rate limiting atômico e compartilhado via PostgreSQL, combinado por conta e endereço de origem, sem um bloqueio global suscetível a negação de serviço.
- Sessões server-side com tokens CSPRNG de 256 bits; apenas o hash é persistido.
- Cookies `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` e prefixo `__Host-` em produção.
- Expiração absoluta em 12 horas e por inatividade em 60 minutos.
- Autorização validada dentro de cada Server Action privilegiada.
- Proteção CSRF fail-closed: toda mutação exige `Origin` ou `Referer` confiável, rejeita `Sec-Fetch-Site: cross-site` e mantém as proteções do Next.js e `SameSite` em profundidade.
- CSP, HSTS, `nosniff`, bloqueio de framing, política de referrer e restrição de permissões do navegador.
- Validação Zod no servidor, queries parametrizadas pelo Drizzle e constraints no PostgreSQL.
- Logs estruturados para sucesso/falha de login, bloqueio, logout, CSRF, criação de sessão e falha de autorização, sem senha ou token.
- Login de demonstração bloqueado pelo código quando `NODE_ENV=production`.

## Checklist antes de publicar

1. Usar HTTPS exclusivamente.
2. Configurar `DATABASE_URL` na Vercel com usuário de banco de privilégio mínimo.
3. Manter a credencial proprietária de migrations somente fora do runtime.
4. Criar o ADMIN uma vez com `npm run db:create-admin` e apagar `ADMIN_PASSWORD` do ambiente.
5. Não executar o seed de demonstração em produção.
6. Habilitar backup/PITR no banco e testar restauração.
7. Configurar alertas para eventos `auth.failure`, `auth.rate_limited` e `authz.denied` nos logs.
8. Executar `npm audit --omit=dev`, testes e build antes de cada deploy.

## Riscos residuais conhecidos

- MFA ainda não foi implementado. Recomenda-se passkey/WebAuthn ou TOTP antes de ampliar o número de usuários ou a sensibilidade dos dados.
- A CSP permite scripts inline por compatibilidade com a renderização atual do Next.js; remover `unsafe-inline` exigirá CSP com nonce.
- Não há verificação automática de senhas comprometidas; a senha administrativa deve ser longa, exclusiva e gerada por gerenciador de senhas.
- Alertas dependem da configuração do provedor de observabilidade; o aplicativo apenas emite os eventos estruturados.

## Referências

- https://top10.owasp.org/2025/
- https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
