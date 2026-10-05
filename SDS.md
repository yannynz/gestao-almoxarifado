# Software Design Specification
## Sistema de Gestão de Ferramentas e Insumos

**Versão:** 1.0  
**Status:** MVP  
**Arquitetura:** Monólito modular serverless  
**Objetivo inicial:** piloto com aproximadamente 10 usuários e 1 administrador.

---

# 1. Objetivo

Desenvolver uma aplicação web simples para gestão de ferramentas e insumos de um almoxarifado.

O sistema deverá responder principalmente:

- Quais ferramentas existem?
- Qual ferramenta está disponível?
- Quem está atualmente com determinada ferramenta?
- Quando ela foi retirada?
- Quando foi devolvida?
- Quem registrou a movimentação?
- Quanto existe de determinado insumo?
- Quem retirou determinado insumo?
- Quais insumos estão abaixo do estoque mínimo?
- Qual é o histórico de movimentações?

O sistema deve reduzir ao mínimo a interação necessária para operações rotineiras.

O funcionário que recebe uma ferramenta ou insumo **não precisa utilizar o sistema**.

O registro será realizado pelo almoxarife/operador.

---

# 2. Princípios do projeto

A arquitetura seguirá cinco princípios.

### 2.1 Simplicidade

Não introduzir infraestrutura ou abstrações sem necessidade concreta.

### 2.2 Baixo custo

O MVP deve operar com custo próximo de zero durante desenvolvimento e demonstração.

### 2.3 Propriedade

Código-fonte, autenticação, regras de negócio, schema e dados pertencem à aplicação.

Vercel, Neon e demais fornecedores serão tratados apenas como infraestrutura substituível.

### 2.4 Integridade

Operações críticas de estoque e empréstimo deverão ser atômicas e protegidas contra concorrência.

### 2.5 Evolução

A aplicação começa como monólito modular. Separação em serviços somente deverá ocorrer se volume, organização da equipe ou requisitos futuros justificarem.

---

# 3. Stack

## Aplicação

- Next.js
- React
- TypeScript
- Node.js runtime

## Persistência

- PostgreSQL
- Drizzle ORM
- Drizzle Kit

## Infraestrutura inicial

- Vercel — aplicação
- Neon — PostgreSQL
- GitHub — código-fonte

Arquitetura:

```text
                Internet
                    |
                    v
              +-----------+
              |  Vercel   |
              +-----------+
                    |
                    v
        +-----------------------+
        |       Next.js         |
        |                       |
        | UI / Server           |
        | Auth                  |
        | Inventory             |
        | Movements             |
        | Administration        |
        +-----------+-----------+
                    |
                 Drizzle
                    |
                    v
              +-----------+
              |PostgreSQL |
              |   Neon    |
              +-----------+
```

O Next.js possui suporte oficial a execução server-side por Vercel Functions. A Vercel recomenda pooling para bancos relacionais em Functions.

O Drizzle possui suporte oficial a PostgreSQL e Neon.

---

# 4. Decisões arquiteturais

## 4.1 Monólito modular

Não haverá frontend e backend independentes.

```text
Next.js
├── apresentação
├── autenticação
├── autorização
├── regras de negócio
├── acesso ao banco
└── administração
```

Entretanto, internamente o código será dividido por domínio.

```text
src/
├── app/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── employees/
│   ├── inventory/
│   └── movements/
├── db/
├── lib/
└── components/
```

Isso evita tanto um monólito desorganizado quanto a complexidade prematura de microsserviços.

---

# 5. O que NÃO será utilizado no MVP

Não serão utilizados inicialmente:

- microsserviços;
- API Gateway;
- Redis;
- filas;
- Kafka/RabbitMQ;
- WebSockets;
- Firebase;
- Supabase;
- Supabase Auth;
- Clerk;
- Auth0;
- armazenamento de imagens;
- aplicativo Android/iOS;
- Kubernetes;
- Docker em produção;
- Elasticsearch;
- GraphQL.

A introdução futura de qualquer um desses componentes deverá resolver um problema concreto.

---

# 6. Perfis

Existirão inicialmente dois perfis de acesso.

## ADMIN

Pode:

- criar usuários;
- desativar usuários;
- alterar permissões;
- cadastrar funcionários;
- cadastrar ferramentas;
- editar ferramentas;
- colocar ferramenta em manutenção;
- cadastrar insumos;
- realizar ajustes de estoque;
- visualizar histórico completo;
- visualizar todas as movimentações.

## OPERATOR

Pode:

- consultar ferramentas;
- registrar retirada;
- registrar devolução;
- consultar insumos;
- registrar consumo;
- consultar movimentações operacionais.

A autorização seguirá o princípio de menor privilégio recomendado pela OWASP.

---

# 7. Usuário x funcionário

Esses conceitos não deverão ser misturados.

**User** é quem acessa o sistema.

**Employee** é quem recebe fisicamente uma ferramenta ou insumo.

Exemplo:

```text
Carlos
USER / OPERATOR

João
EMPLOYEE

Carlos entrega:
A1 - Furadeira

para:
João
```

João não precisa possuir login.

Essa decisão reduz a barreira tecnológica para os trabalhadores.

---

# 8. Banco de dados

PostgreSQL será a fonte de verdade da aplicação.

O Drizzle será responsável por:

- representação tipada do schema;
- construção de queries;
- migrations;
- transactions;
- integração TypeScript/PostgreSQL.

O PostgreSQL continuará acessível como PostgreSQL convencional.

Não haverá dependência de recursos proprietários do Neon para regras de negócio.

---

# 9. Schema inicial

## users

```text
id
username
password_hash
role
active
created_at
updated_at
```

Regras:

```text
id UNIQUE
username pode repetir mas n eh boa pratica (pode ter 3 joao trampando) 
role = ADMIN | OPERATOR
active DEFAULT true
```

---

## sessions

```text
id
user_id
token_hash
expires_at
created_at
last_used_at
```

Relacionamento:

```text
User 1 ───── N Session
```

Uma conta poderá ter mais de uma sessão ativa.

---

## employees

```text
id
name
phone
registration_code NULL
active
created_at
updated_at
```

`registration_code` poderá posteriormente receber matrícula/código interno.

---

## tools

```text
id
code
name
description NULL
status
active
created_at
updated_at
```

Status:

```text
AVAILABLE
LOANED
MAINTENANCE
```

`code` deverá ser único.

Exemplo:

```text
A1
Furadeira Bosch

A2
Furadeira Makita

S1
Serra Circular
```

---

# 10. Empréstimos

Em vez de representar retirada e devolução apenas como eventos soltos, o sistema possuirá uma entidade explícita de empréstimo.

## tool_loans

```text
id
tool_id
employee_id

checked_out_by
checked_out_at

returned_by NULL
returned_at NULL

notes NULL
```

Isso permite representar diretamente:

```text
A1
↓
João
↓
retirada 08:32
↓
ainda não devolvida
```

Uma ferramenta estará emprestada quando existir um empréstimo aberto:

```text
returned_at IS NULL
```

Esse modelo facilita perguntas como:

```text
Quem está com A1?

Há quanto tempo?

Quais ferramentas João possui?

Quais empréstimos estão abertos?
```

---

# 11. Estado da ferramenta

O campo `tools.status` continuará existindo por conveniência operacional.

Entretanto, a aplicação deverá manter consistência entre:

```text
tools.status
```

e:

```text
tool_loans
```

Exemplo:

```text
LOAN aberto
→
tool.status = LOANED

LOAN devolvido
→
tool.status = AVAILABLE
```

Essa atualização deverá ocorrer na mesma transação.

---

# 12. Insumos

## supplies

```text
id
code
name
quantity
minimum_quantity
unit
active
created_at
updated_at
```

Exemplo:

```text
DC45
Disco de corte 4½

quantity = 37
minimum_quantity = 10
unit = UN
```

O estoque nunca poderá ficar negativo.

---

# 13. Movimentações de insumos

## supply_movements

```text
id
supply_id
employee_id NULL
type
quantity
registered_by
notes NULL
created_at
```

Tipos:

```text
ENTRY
CONSUMPTION
ADJUSTMENT_IN
ADJUSTMENT_OUT
```

Movimentações históricas não serão apagadas pela operação normal da aplicação.

---

# 14. Controle concorrente

Esse é um requisito crítico.

Considere dois operadores tentando entregar a mesma furadeira ao mesmo tempo.

Sem controle:

```text
Carlos → entrega A1 para João

Maria → entrega A1 para Pedro
```

Ambos poderiam ler:

```text
A1 = AVAILABLE
```

antes da primeira atualização terminar.

A operação de retirada deverá portanto ser executada dentro de uma transação.

Conceitualmente:

```text
BEGIN

bloquear ferramenta

verificar:
status == AVAILABLE

criar empréstimo

alterar:
status = LOANED

COMMIT
```

Se qualquer etapa falhar:

```text
ROLLBACK
```

Drizzle fornece API oficial de transactions e rollback.

---

# 15. Conexão com PostgreSQL

Não utilizaremos automaticamente `neon-http` apenas pela simplicidade.

A própria documentação do Drizzle explica que HTTP é adequado para queries isoladas, enquanto conexões baseadas em sessão são necessárias quando se deseja suporte apropriado a transações interativas.

Como empréstimos e movimentações exigem transações, a camada de banco deverá utilizar uma estratégia compatível com transactions.

A configuração final deverá utilizar conexão Neon apropriada para o runtime Node.js e pooling.

A Vercel recomenda pooling para conexões relacionais em Functions.

O Neon também oferece pooling via PgBouncer para aplicações serverless.

---

# 16. Autenticação

A autenticação será própria.

Não será utilizado provedor externo de identidade.

Fluxo:

```text
username
+
password
   |
   v
buscar user
   |
   v
verificar password_hash
   |
   v
gerar token aleatório
   |
   +---- token → cookie
   |
   +---- hash(token) → PostgreSQL
```

A senha nunca será armazenada.

---

# 17. Password hashing

A primeira escolha será Argon2id.

A OWASP recomenda Argon2id como primeira opção para armazenamento moderno de senhas.

A aplicação deverá utilizar biblioteca consolidada e não implementar algoritmo criptográfico próprio.

Nunca utilizar:

```text
MD5
SHA1
SHA256(password)
Base64
criptografia reversível
senha plaintext
```

---

# 18. Sessões

As sessões serão server-side.

O browser receberá somente um identificador/token aleatório.

O banco armazenará somente o hash desse token.

Cookie:

```text
HttpOnly = true
Secure = true em produção
SameSite = lax
Path = /
Expires/Max-Age definido
```

Essas opções correspondem às recomendações documentadas pelo próprio Next.js.

Estrutura:

```text
Browser
   |
session cookie
   |
   v
Next.js
   |
hash(token)
   |
   v
sessions
   |
   v
user
```

Logout:

```text
DELETE session
+
DELETE cookie
```

Desativar usuário deverá impedir novas operações mesmo que exista cookie anterior.

---

# 19. Autorização

Nunca confiar somente na interface.

Esconder:

```text
[ CADASTRAR USUÁRIO ]
```

do operador não significa segurança.

Toda operação protegida deverá executar:

```text
authenticate
↓
authorize
↓
validate
↓
execute
```

O Next.js recomenda explicitamente tratar Server Actions e Route Handlers como endpoints públicos e verificar autorização dentro de cada operação.

---

# 20. Data Access Layer

Será criada uma pequena DAL para operações de segurança e dados comuns.

Exemplo conceitual:

```text
requireSession()

requireAdmin()

getCurrentUser()

getTool()

getOpenLoan()

getSupply()
```

Isso evita espalhar regras de autorização pela aplicação.

A documentação atual do Next.js recomenda centralizar verificações sensíveis em uma Data Access Layer.

---

# 21. Server Actions

Server Actions serão utilizadas principalmente para formulários internos:

```text
login
createTool
checkoutTool
returnTool
consumeSupply
createEmployee
```

Exemplo:

```text
Form
 ↓
Server Action
 ↓
Auth
 ↓
Validation
 ↓
Service
 ↓
Transaction
 ↓
Database
```

Não será criada uma REST API completa sem necessidade.

Server Actions são endpoints HTTP e deverão ser tratadas como tal.

---

# 22. Validação

Todos os dados provenientes do usuário deverão ser validados no servidor.

Será utilizada uma biblioteca de schema validation, preferencialmente Zod.

Exemplos:

```text
tool.code:
1-30 caracteres

tool.name:
1-150 caracteres

quantity:
integer > 0

username:
formato permitido

employee.name:
não vazio
```

TypeScript não substitui validação de runtime.

A OWASP recomenda validação de tipo, tamanho, formato e faixa de entrada.

---

# 23. Constraints no banco

Regras críticas não ficarão somente no TypeScript.

O PostgreSQL também deverá proteger os dados.

Exemplos:

```text
UNIQUE(tool.code)

UNIQUE(user.username)

CHECK(quantity >= 0)

NOT NULL

FOREIGN KEY
```

Drizzle possui suporte nativo a índices, UNIQUE, CHECK, NOT NULL, primary keys e demais constraints PostgreSQL.

Isso cria duas barreiras:

```text
Aplicação
    ↓
validação

Banco
    ↓
constraint
```

---

# 24. Fluxo de retirada

Interface:

```text
Buscar ferramenta

[A1________________]

A1
Furadeira Bosch

DISPONÍVEL

Funcionário
[ João da Silva ▼ ]

[ RETIRAR ]
```

Backend:

```text
1. verificar sessão
2. verificar permissão
3. validar IDs
4. iniciar transaction
5. verificar/bloquear ferramenta
6. confirmar disponibilidade
7. criar tool_loan
8. alterar status para LOANED
9. commit
10. atualizar interface
```

Objetivo:

Uma retirada normal deverá exigir aproximadamente três interações.

---

# 25. Fluxo de devolução

```text
A1
Furadeira Bosch

EMPRESTADA

João da Silva
Desde 08:32

[ DEVOLVER ]
```

Backend:

```text
1. autenticar
2. localizar empréstimo aberto
3. transaction
4. registrar returned_by
5. registrar returned_at
6. ferramenta → AVAILABLE
7. commit
```

---

# 26. Fluxo de consumo

```text
Disco de corte 4½

Disponível:
37 UN

Funcionário:
[ João ]

Quantidade:
[ 5 ]

[ RETIRAR ]
```

Transaction:

```text
validar quantidade

UPDATE estoque
37 → 32

INSERT movimentação
quantity = 5
type = CONSUMPTION
employee = João
registered_by = Carlos
```

Se estoque disponível for inferior ao solicitado:

```text
REJECT
```

---

# 27. Dashboard

O MVP não precisa de gráficos.

Página inicial:

```text
+----------------------+
|  83                  |
| Ferramentas livres   |
+----------------------+

+----------------------+
|  12                  |
| Emprestadas          |
+----------------------+

+----------------------+
|   3                  |
| Estoque baixo        |
+----------------------+

Movimentações recentes
```

O objetivo é informação operacional, não BI.

---

# 28. Pesquisa

A busca deverá aceitar:

```text
A1
furadeira
bosch
data(retirada ou devolucao)
```

Inicialmente será suficiente utilizar busca PostgreSQL simples.

Não utilizar Elasticsearch.

Com o volume previsto, adicionar um mecanismo externo de busca não apresenta benefício relevante.

---

# 29. Índices

Índices iniciais:

```text
users.username UNIQUE

tools.code UNIQUE

tools.status

tool_loans.tool_id

tool_loans.employee_id

tool_loans.returned_at

supply_movements.supply_id

supply_movements.employee_id

supply_movements.created_at
```

Índices adicionais deverão ser criados conforme queries reais demonstrarem necessidade.

---

# 30. Auditoria

O histórico operacional será parte do domínio.

Devemos conseguir responder:

```text
Quem?
O quê?
Para quem?
Quando?
```

Movimentações históricas não serão normalmente excluídas.

Logs técnicos e histórico de negócio serão conceitos diferentes.

A OWASP recomenda logging adequado para ações relevantes e eventos de segurança.

---

# 31. Datas

Todas as datas serão armazenadas como timestamps com timezone.

Banco:

```text
UTC
```

Apresentação:

```text
America/Sao_Paulo
```

Exemplo exibido:

```text
05/10/2026 14:32
```

---

# 32. Exclusão

Entidades operacionais utilizarão principalmente desativação:

```text
active = false
```

em vez de exclusão física.

Exemplo:

Uma furadeira que foi descartada não deverá desaparecer dos empréstimos históricos.

O mesmo vale para funcionários e usuários relacionados a movimentações.

---

# 33. Estrutura proposta

```text
src/
│
├── app/
│   ├── (auth)/
│   │   └── login/
│   │
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── ferramentas/
│   │   ├── insumos/
│   │   ├── movimentacoes/
│   │   └── admin/
│   │
│   └── layout.tsx
│
├── modules/
│   ├── auth/
│   │   ├── actions.ts
│   │   ├── service.ts
│   │   └── validation.ts
│   │
│   ├── inventory/
│   │   ├── tools.service.ts
│   │   ├── supplies.service.ts
│   │   └── validation.ts
│   │
│   ├── movements/
│   │   ├── loans.service.ts
│   │   └── supplies.service.ts
│   │
│   └── users/
│
├── db/
│   ├── index.ts
│   ├── schema.ts
│   └── relations.ts
│
├── lib/
│   ├── auth.ts
│   ├── permissions.ts
│   └── errors.ts
│
└── components/

drizzle/
├── migrations...
└── meta/

drizzle.config.ts
```

---

# 34. Regra de dependências

Fluxo permitido:

```text
UI
 ↓
Actions
 ↓
Services
 ↓
Database
```

Evitar:

```text
UI → SQL

Component → Drizzle

Client Component → Database
```

Componentes React não deverão conter regra de negócio importante.

---

# 35. Drizzle migrations

Schema será definido em TypeScript.

Exemplo de fluxo:

```text
schema.ts
   ↓
drizzle-kit generate
   ↓
migration SQL
   ↓
Git
   ↓
drizzle-kit migrate
   ↓
PostgreSQL
```

A documentação oficial do Drizzle suporta exatamente o fluxo `generate` + `migrate`; `push` é especialmente útil para iteração rápida/local, enquanto migrations versionadas são mais adequadas para ambientes controlados.

Produção utilizará migrations versionadas.

Não executar alteração automática destrutiva do schema a cada inicialização da aplicação.

---

# 36. Ambientes

Teremos:

```text
LOCAL
PRODUCTION
```

Inicialmente não há necessidade de staging permanente.

Local:

```text
Next.js local
+
PostgreSQL local via Docker
```

Produção/piloto:

```text
Vercel
+
Neon
```

O uso de PostgreSQL local garante que desenvolvimento não dependa da disponibilidade do Neon.

---

# 37. Variáveis de ambiente

Exemplo:

```text
DATABASE_URL
SESSION_SECRET
APP_URL
```

Nunca:

```text
senha
DATABASE_URL
secret
```

dentro do Git.

O Next.js recomenda manter `.env.*` fora do repositório e utilizar `NEXT_PUBLIC_` apenas para valores realmente públicos.

---

# 38. Portabilidade

Nenhuma regra de negócio dependerá diretamente da Vercel ou Neon.

Migração futura deverá ser possível aproximadamente como:

```text
pg_dump Neon
       ↓
PostgreSQL novo

Git clone
       ↓
npm install
       ↓
npm build
       ↓
Node host
```

Next.js poderá futuramente rodar em outra infraestrutura.

PostgreSQL poderá migrar para:

```text
VPS
AWS RDS
Google Cloud SQL
Azure PostgreSQL
outro PostgreSQL
```

Drizzle continuará utilizando PostgreSQL.

---

# 39. Limitação importante da Vercel gratuita

A capacidade técnica do Hobby é muito superior à carga esperada pelo projeto: a documentação atual lista 1 milhão de invocações mensais incluídas, 4 CPU-hours ativas e 360 GB-hours de memória provisionada.

Entretanto:

**Vercel Hobby é restrito a uso pessoal e não comercial.**

A política da Vercel afirma que uso comercial requer Pro ou Enterprise.

Portanto:

```text
Desenvolvimento / protótipo pessoal
→ Hobby

Demonstração técnica
→ Hobby, desde que permaneça não comercial

Uso empresarial/comercial efetivo
→ revisar plano ou migrar infraestrutura
```

A arquitetura será mantida portável justamente para evitar lock-in caso esse momento chegue.

---

# 40. Neon gratuito

O Neon oferece PostgreSQL serverless com scale-to-zero e free tier suficiente para pequenos projetos.

O compute pode entrar em idle quando não utilizado, reduzindo consumo.

Para este projeto:

```text
~10 usuários
+
dados predominantemente textuais
+
poucas operações por minuto
```

o banco deverá permanecer extremamente pequeno comparado aos limites típicos do serviço.

Deve-se, entretanto, tratar qualquer free tier como política comercial mutável, não como requisito arquitetural permanente.

---

# 41. Testes

## Unitários

Prioridade:

```text
permissions
validation
password/session utilities
regras de estoque
regras de empréstimo
```

## Integração

Prioridade maior.

Testar contra PostgreSQL real:

```text
retirada
devolução
consumo
concorrência
rollback
constraints
sessões
```

## E2E

Fluxos críticos:

```text
login
↓
buscar A1
↓
retirar
↓
consultar
↓
devolver
```

e:

```text
login
↓
buscar insumo
↓
consumir
↓
confirmar estoque
```

---

# 42. Casos críticos de teste

### CT01

Retirar ferramenta disponível.

Resultado:

```text
loan criado
status LOANED
```

### CT02

Tentar retirar ferramenta emprestada.

Resultado:

```text
rejeitado
```

### CT03

Duas retiradas simultâneas.

Resultado:

```text
somente uma deve vencer
```

### CT04

Devolver ferramenta.

Resultado:

```text
returned_at preenchido
status AVAILABLE
```

### CT05

Consumir quantidade maior que estoque.

Resultado:

```text
rejeitado
estoque inalterado
```

### CT06

Operador acessar administração.

Resultado:

```text
403 / acesso negado
```

### CT07

Usuário desativado com sessão existente.

Resultado:

```text
acesso negado
```

### CT08

Falha durante transaction.

Resultado:

```text
rollback completo
```

---

# 43. Plano de implementação

## Fase 0 — Bootstrap

Criar:

```text
Next.js
TypeScript
Git
ESLint
estrutura de diretórios
.env.example
```

Configurar repositório.

**Resultado:** aplicação vazia executando localmente.

---

## Fase 1 — PostgreSQL e Drizzle

Subir PostgreSQL local.

Instalar:

```text
drizzle-orm
drizzle-kit
driver PostgreSQL/Neon apropriado
```

Criar:

```text
db/index.ts
db/schema.ts
drizzle.config.ts
```

Implementar primeiro schema.

Gerar migration.

**Resultado:** banco versionado e aplicação conectada.

---

## Fase 2 — Auth

Implementar:

```text
users
sessions
password hashing
login
logout
requireSession
requireAdmin
```

Criar seed para primeiro ADMIN.

**Resultado:** sistema fechado por autenticação.

---

## Fase 3 — Funcionários

CRUD simples:

```text
criar
listar
editar
desativar
```

**Resultado:** funcionários disponíveis para movimentações.

---

## Fase 4 — Ferramentas

Implementar:

```text
cadastro
edição
busca
status
desativação
manutenção
```

**Resultado:** inventário de ferramentas funcional.

---

## Fase 5 — Empréstimos

Implementar:

```text
checkout
return
open loans
history
```

Adicionar transactions e proteção contra concorrência.

Essa é a primeira fase considerada crítica.

**Resultado:** fluxo principal do sistema funcionando.

---

## Fase 6 — Insumos

Implementar:

```text
cadastro
entrada
consumo
ajuste
estoque mínimo
histórico
```

Todas as alterações de quantidade deverão ser transacionais.

**Resultado:** controle de consumíveis funcionando.

---

## Fase 7 — Dashboard

Adicionar somente:

```text
disponíveis
emprestadas
estoque baixo
movimentações recentes
```

**Resultado:** visão operacional.

---

## Fase 8 — Auditoria e segurança

Revisar:

```text
authorization
session expiration
validation
error handling
logging
rate limiting do login
security headers
constraints
```

Executar testes de autorização.

A OWASP recomenda testar explicitamente a lógica de autorização.

---

## Fase 9 — Deploy

Criar Neon.

Configurar banco.

Executar migrations.

Configurar Vercel:

```text
DATABASE_URL
SESSION_SECRET
APP_URL
```

Deploy.

Executar smoke tests.

---

## Fase 10 — Piloto

Cadastrar:

```text
1 admin
operadores
funcionários
ferramentas reais
insumos reais
```

Observar uso real.

Não desenvolver features novas imediatamente.

Registrar:

```text
dificuldades
cliques desnecessários
erros
operações esquecidas
necessidades reais
```

Somente depois definir V2.

---

# 44. Critério de conclusão do MVP

O MVP será considerado funcional quando um operador conseguir:

```text
LOGIN

↓
localizar A1

↓
entregar A1 para João

↓
outro usuário visualizar
"A1 está com João"

↓
registrar devolução

↓
A1 aparecer novamente como disponível
```

e:

```text
visualizar 30 discos

↓
entregar 5 para João

↓
estoque virar 25

↓
histórico registrar
quem recebeu
quem registrou
quando
quanto
```

Sem necessidade de intervenção técnica.

---

# 45. Evoluções possíveis

Somente após validação do MVP:

```text
QR Code
PWA
código de barras
manutenção preventiva
alerta de estoque
alerta de empréstimo longo
CSV/Excel
relatórios
centro de custo
obra
localização
múltiplos almoxarifados
termo de responsabilidade
notificações
```

Um candidato particularmente natural para V2 é QR Code:

```text
QR A1
 ↓
/ferramentas/A1
 ↓
Furadeira Bosch
 ↓
[RETIRAR]
```

Isso reduz ainda mais o atrito operacional sem alterar o núcleo do domínio.

---

# 46. Critérios para abandonar o monólito

Não dividir o sistema simplesmente porque aumentou o número de usuários.

Reavaliar arquitetura somente diante de problemas mensuráveis como:

- equipes independentes trabalhando em domínios distintos;
- necessidades radicalmente diferentes de escala;
- processamento assíncrono significativo;
- integrações externas pesadas;
- limites reais de deploy;
- dificuldade concreta de manutenção;
- requisitos de disponibilidade diferentes entre módulos.

Até lá:

```text
1 aplicação
1 banco
módulos bem separados
```

é a arquitetura preferida.

---

# 47. Arquitetura final do MVP

```text
                    Browser
                       |
                    HTTPS
                       |
                       v
               +---------------+
               |    Vercel     |
               |               |
               |    Next.js    |
               +-------+-------+
                       |
       +---------------+---------------+
       |               |               |
       v               v               v
     Auth          Inventory       Movements
       |               |               |
       +---------------+---------------+
                       |
                    Services
                       |
                    Drizzle
                       |
                 transaction
                       |
                       v
                +-------------+
                | PostgreSQL  |
                |    Neon     |
                +-------------+
```

Não existe componente adicional até que algum requisito prove que precisamos dele.

---

# 48. Resumo das decisões

```text
Frontend        Next.js / React
Backend         Next.js / Node
Linguagem       TypeScript
Arquitetura     Monólito modular
Banco           PostgreSQL
ORM             Drizzle
Migrations      Drizzle Kit
Auth            Próprio
Sessão          PostgreSQL + cookie HttpOnly
Password        Argon2id
Hosting MVP     Vercel
Database host   Neon
API externa     Não
Redis           Não
Microservices   Não
Docker prod     Não
Imagens         Não
Mobile app      Não
```

A prioridade do projeto é deliberadamente:

**resolver bem retirada, devolução, estoque e rastreabilidade antes de adicionar qualquer sofisticação arquitetural.**
