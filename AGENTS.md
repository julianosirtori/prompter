# AGENTS.md

Prompter: PWA (React 19 + Vite + TypeScript) para gravar vídeos curtos lendo um roteiro com tempo
por bloco. Visão de produto e uso: [README.md](README.md), [docs/produto.md](docs/produto.md).

## Comandos

Use npm (há `package-lock.json`).

| Tarefa | Comando |
|---|---|
| Typecheck | `npm run typecheck` (`tsc -b`, TypeScript 7) |
| Lint | `npm run lint` (oxlint, config em `.oxlintrc.json`) |
| Build | `npm run build` (typecheck + `vite build`) |
| Dev | `npm run dev` · `npm run dev:phone` (HTTPS na rede local) |

Não há suíte de testes nem CI. Antes de concluir uma mudança, rode `npm run typecheck` e
`npm run lint`. Se mexer em `vite.config.ts` ou `src/pwa/`, rode também `npm run build`.

## Arquitetura

- As camadas só dependem para dentro: `features → app/engine/media/storage → domain`.
  `src/domain` é puro, sem DOM, React ou storage.
- Regras de ritmo (palavras por segundo, limite de "Apertado", duração estimada) ficam só em
  `src/domain/pace.ts`. Não duplique esses números na UI.
- Textos de interface em PT-BR. Rótulos derivados de valores do domínio ficam em
  `src/app/copy.ts`. Comentários e nomes no código ficam em inglês.

## Pegadinhas

- O service worker é gerado: `vite.config.ts` lê `src/pwa/sw.js`, troca `__BUILD_ID__` e
  `__ASSETS__` e emite `/sw.js` só no build. Edite `src/pwa/sw.js` e mantenha os placeholders.
  No `npm run dev` ele não é registrado.
- A câmera só funciona em origem segura. Para testar no celular use `npm run dev:phone`
  (certificado autoassinado), nunca `http://192.168.x.x`.
- `tsconfig.app.json` usa `noUncheckedIndexedAccess`: acesso por índice devolve `T | undefined`.
  Trate o caso em vez de usar `!` (só `src/main.tsx` usa, no `#root`).
