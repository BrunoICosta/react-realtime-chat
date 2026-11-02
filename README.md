# Realtime Chat

🇧🇷 Português · [🇺🇸 English](README.en.md)

Chat em tempo real com salas, presença online, indicador de "digitando..." e histórico por sala,
construído como um monorepo **npm workspaces**: um front-end em **React 19 + Vite**, um servidor
**Node 22 + Express + Socket.io** e um pacote compartilhado com os **contratos tipados dos eventos**
e os **schemas zod** usados pelos dois lados. Como a demo publicada é estática (sem servidor), o front tem
um segundo transporte que simula o backend dentro do navegador (abas conversam entre si via
`BroadcastChannel` e um bot responde em `#geral`).

**Demo:** https://portfolio.brunoisaac.dev/react-realtime-chat/ (modo demo, sem servidor; abra em duas abas)

![Tela do chat com salas, mensagens agrupadas e pessoas online](docs/screenshot.png)

## Funcionalidades

- **Login sem cadastro**: apelido + cor do avatar; o servidor emite um **JWT** (HS256, 12h).
- **Salas**: `#geral`, `#dev` e `#random` por padrão, criação de novas salas, sair da sala.
- **Badges de não lidas** por sala e contador no título da aba (`(3) #geral · Realtime Chat`).
- **Mensagens agrupadas** por autor (janela de 5 min) e por dia (Hoje, Ontem, 12 de setembro).
- **Envio otimista**: a mensagem aparece na hora, é reconciliada pelo `clientId` e pode ser
  reenviada se falhar.
- **Auto-scroll inteligente**: acompanha o fim da conversa, mas se você estiver lendo mensagens
  antigas aparece a pílula "N novas mensagens".
- **"Fulano está digitando..."** com eventos _throttled_ no cliente e expiração no servidor.
- **Pessoas online** por sala (várias abas do mesmo usuário contam como uma presença).
- **Composer amigável a emoji**: Enter envia, Shift+Enter quebra linha, respeita IME, seletor
  rápido de emoji, contador de caracteres, mensagens só com emoji ficam maiores.
- **Banner de reconexão** ("Conexão perdida. Tentando reconectar…" / "Conexão restabelecida") e
  reentrada automática nas salas com merge do histórico.
- **Rate limiting** por socket (token bucket) com aviso na interface.
- **Português (pt-BR) e inglês**: seletor de idioma com bandeiras (SVG inline) no topo, detecção automática, datas no
  formato do idioma e até o bot do modo demo responde no idioma escolhido.
- **Tema claro/escuro** (segue o sistema e lembra a escolha), layout
  **responsivo** com gavetas no mobile e foco em **acessibilidade** (labels, `aria-live`,
  `role="log"`, foco visível, navegação por teclado no seletor de emoji).

## Stack

| Camada    | Tecnologias                                                                                   |
| --------- | --------------------------------------------------------------------------------------------- |
| Web       | React 19.2, Vite 8.2, TypeScript 6.0, socket.io-client 4.8, CSS puro com design tokens        |
| i18n      | i18next 26, react-i18next 17, i18next-browser-languagedetector 8                              |
| Server    | Node 22, Express 5.2, Socket.io 4.8, jsonwebtoken 9, zod 4.4, tsx 4 (dev)                     |
| Shared    | Tipos de eventos (`ClientToServerEvents` / `ServerToClientEvents`), modelos e schemas zod     |
| Testes    | Vitest 4.1, Testing Library (React 16, user-event 14, jest-dom 7), jsdom 30, socket.io-client |
| Qualidade | ESLint 10 + typescript-eslint 8, Prettier 3, TypeScript `strict` + `noUncheckedIndexedAccess` |
| CI/CD     | GitHub Actions (lint, testes, build); demo publicada na Cloudflare (Workers static assets)    |

## Arquitetura e decisões

```
apps/web  ──(ChatTransport)──┬── SocketIoTransport ──── WebSocket ──── apps/server
                             └── BroadcastChannelTransport (modo demo, só navegador)
        ╲                                                           ╱
         └────────────── packages/shared (tipos + zod) ────────────┘
```

- **Contratos compartilhados.** `packages/shared` define `ClientToServerEvents` e
  `ServerToClientEvents`, usados para tipar o `Server` do Socket.io e o `socket` do cliente.
  Renomear um evento ou mudar um payload quebra a compilação dos dois lados. Os mesmos schemas
  zod validam o formulário no navegador e os payloads no servidor.
- **Sem etapa de build no dev.** O `package.json` do shared exporta uma condição `source`
  apontando para o TypeScript. Vite, Vitest, `tsx` (`--conditions=source`) e o `tsc` (via
  `customConditions`) consomem os fontes direto; só o build de produção do servidor usa o `dist`.
- **`ChatTransport`, a peça central do front.** A UI não conhece Socket.io: ela fala com uma
  interface (`login`, `connect`, `joinRoom`, `sendMessage`, `startTyping`, `on(evento)`...) que
  emite exatamente os mesmos eventos do servidor. Há duas implementações:
  - `SocketIoTransport`, usado quando `VITE_SERVER_URL` está definido: faz login via
    `POST /api/login`, conecta com o JWT no handshake e usa _acks_ com timeout
    (`emitWithAck`) para transformar cada pedido em uma `Promise`.
  - `BroadcastChannelTransport` (**modo demo**, padrão na demo publicada): cada aba é um "peer"
    que anuncia sua presença e as salas em que está por `BroadcastChannel`, com heartbeat e
    expiração de peers que somem. Salas e histórico ficam no `localStorage` (compartilhado entre
    as abas), há usuários simulados online e a **Lia (bot)** responde em `#geral` mostrando o
    indicador de digitação antes. A interface mostra o selo **"modo demo"**.

  Assim o demo público funciona de verdade (abra duas abas e converse), sem esconder que existe
  um backend real: o mesmo código de UI roda nos dois modos. Também dá para forçar o demo com
  `?demo` na URL.

- **Estado com `useReducer` + Context.** Um reducer puro (`chat-reducer.ts`) concentra as
  regras: mensagens otimistas, contagem de não lidas, merge de histórico após reconexão,
  ordenação. O provider separa contexto de estado e de ações para evitar renders desnecessários.
  Não foi preciso uma biblioteca de estado.
- **Servidor em memória por design.** `ChatStore` guarda salas, um histórico limitado por sala
  (100 mensagens), presença por usuário (com várias conexões) e sessões. Nada de banco: o foco é
  o tempo real. A identidade sempre vem do JWT verificado no middleware do Socket.io
  (`socket.data.user`), nunca do payload.
- **Robustez no servidor.** Todo payload passa por zod; o ack é normalizado (cliente malicioso
  pode não mandar callback); rate limit por socket com _token bucket_ (mensagens, digitação e
  operações de sala com orçamentos separados); `maxHttpBufferSize` baixo; "digitando" expira
  sozinho; CORS aceita qualquer porta de `localhost` apenas fora de produção.
- **Testes de verdade no servidor.** Cada teste sobe um servidor isolado em porta efêmera e
  conversa com ele usando `socket.io-client` (auth, salas, presença, mensagens, digitação,
  rate limit). No front, testes do reducer, dos helpers, do transporte demo (com um
  `BroadcastChannel` falso e timers falsos) e de componentes com Testing Library.

## Como rodar

Pré-requisito: **Node 22.12+** e npm 10.

```bash
npm install
npm run dev        # sobe o servidor (http://localhost:3001) e o web (http://localhost:5173) juntos
```

O `npm run dev` usa o `concurrently`; o web lê `VITE_SERVER_URL` de `apps/web/.env.development`.
Abra duas janelas (ou uma anônima) para conversar com você mesmo.

Outros comandos:

```bash
npm run dev:demo   # só o front, em modo demo (BroadcastChannel), sem servidor
npm test           # testes do servidor e do web (Vitest)
npm run lint       # ESLint + Prettier
npm run typecheck  # tsc em todos os workspaces
npm run build      # build do shared, do servidor (apps/server/dist) e do web (apps/web/dist)
npm start          # roda o servidor buildado (node apps/server/dist/index.js)
```

Variáveis do servidor (veja `apps/server/.env.example`; um `.env` em `apps/server` é carregado
automaticamente): `PORT`, `CORS_ORIGIN` (lista separada por vírgula), `JWT_SECRET` (obrigatório
em produção) e `JWT_EXPIRES_IN_SECONDS`.

## Deploy

Publicado na Cloudflare (Workers static assets) em https://portfolio.brunoisaac.dev/react-realtime-chat/ pelo pipeline do
repositório [portfolio](https://github.com/BrunoICosta/portfolio). Esse pipeline roda
`npm run build:cf` na raiz deste repositório, que gera só o `apps/web` em **modo demo** (sem
`VITE_SERVER_URL`) com base `/react-realtime-chat/` em `apps/web/dist`. O servidor Node não é
publicado: para usá-lo, rode localmente com `npm run dev`.

## Estrutura de pastas

```
.
├── apps
│   ├── server
│   │   ├── src
│   │   │   ├── auth/          # login (POST /api/login) e serviço de JWT
│   │   │   ├── chat/          # ChatStore em memória, TypingTracker, rate limiter
│   │   │   ├── socket/        # Socket.io: middleware de auth, handlers, acks
│   │   │   ├── app.ts         # Express (CORS, JSON, health, 404)
│   │   │   ├── config.ts      # env validado com zod
│   │   │   └── server.ts      # composição HTTP + Socket.io (usada também nos testes)
│   │   └── test/              # testes de integração com socket.io-client
│   └── web
│       └── src
│           ├── core/          # transporte (interface, Socket.io, demo), i18n, sessão, tema
│           ├── features/
│           │   ├── auth/      # tela de login
│           │   └── chat/      # provider + reducer, componentes, hooks e helpers
│           ├── shared/        # Avatar, Icon, DemoBadge, ThemeToggle...
│           └── styles/        # tokens de design e primitivas
├── packages
│   └── shared/src             # eventos tipados, modelos, schemas zod, constantes
└── .github/workflows          # CI (lint, typecheck, testes, build)
```

## Internacionalização

A interface inteira existe em **português (pt-BR, padrão)** e **inglês**: textos, `aria-label`s,
placeholders, mensagens de validação, avisos, estados vazios e de erro e o título da aba.

- **Como funciona.** `apps/web/src/core/i18n` configura o **i18next** com
  **react-i18next** e o **i18next-browser-languagedetector**. O idioma inicial é: escolha salva
  (`localStorage`, chave `rrc:lang`) > idioma do navegador (`pt*` vira `pt-BR`, o resto vira
  `en`) > `pt-BR`. Trocar pelas bandeiras do topo (um `radiogroup` acessível, navegável com as setas) salva a escolha e atualiza `<html lang>`.
- **Recursos tipados.** `locales/pt-BR.ts` é a fonte da verdade, dividida em namespaces
  (`common`, `auth`, `chat`, `errors`). `locales/en.ts` usa `satisfies Resources`, então
  esquecer uma chave quebra o `tsc`; o `CustomTypeOptions` do i18next deixa as chaves usadas em
  `t()` verificadas pelo compilador. Um teste ainda compara as chaves dos dois idiomas.
- **Erros como códigos.** O servidor e os schemas zod compartilhados não devolvem texto: acks e
  respostas HTTP trazem um `ErrorCode` (`CONFLICT`, `RATE_LIMITED`...) e, em validações, um
  `ValidationCode` (`NICKNAME_TOO_SHORT`...). O front traduz (`useErrorText`), então o mesmo
  servidor atende qualquer idioma.
- **Datas e plurais.** Horários e separadores de dia usam `Intl.DateTimeFormat` com o idioma
  ativo ("Hoje"/"Today", "12 de setembro"/"September 12"); contagens usam os plurais do i18next.
- **Modo demo.** O bot, as mensagens iniciais e a conversa simulada existem nos dois idiomas
  (`core/transport/demo/demo-content.ts`); o bot entende palavras-chave em ambos e responde no
  idioma da aba. Apelidos e mensagens digitadas pelas pessoas nunca são traduzidos.

**Adicionar um idioma** (ex.: espanhol):

1. Inclua o código em `SUPPORTED_LANGUAGES` e o nome em `LANGUAGE_NAMES`
   (`core/i18n/languages.ts`) e ajuste `toSupportedLanguage` (`es*` -> `es`).
2. Crie `core/i18n/locales/es.ts` com `satisfies Resources` (o compilador aponta as chaves que
   faltam) e registre em `resources` (`core/i18n/i18n.ts`).
3. Adicione os textos do bot e do conteúdo demo em `demo-bot.ts` e `demo-content.ts`.

## Próximos passos

- Persistência (PostgreSQL/Redis) e adapter Redis do Socket.io para escalar horizontalmente.
- Paginação do histórico ("carregar mensagens anteriores") com scroll infinito para cima.
- Mensagens diretas, menções com `@`, reações e edição/remoção de mensagens.
- Confirmação de leitura e notificações do navegador.
- Testes end-to-end com Playwright cobrindo duas abas no modo demo.

## Autor

**Bruno Vinicius Isaac Costa** · https://github.com/BrunoICosta

Licença [MIT](LICENSE).
