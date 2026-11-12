# Prompter

Web app (PWA) para gravar vídeos curtos seguindo um roteiro com tempo por bloco, frase por frase,
olhando para a lente. Cole o roteiro que a IA gerou (tabela markdown, tabela com bordas ou texto
simples), revise os blocos, ensaie e grave no celular ou no computador. O vídeo sai em 9:16 e
os takes ficam só no aparelho.

Produto e pesquisa: [`docs/produto.md`](docs/produto.md) · [`docs/benchmark.md`](docs/benchmark.md).

## Rodar

```bash
npm install
npm run dev         # http://localhost:5173 no computador
npm run dev:phone   # HTTPS na rede local, para abrir no celular
```

No celular, abra o endereço `https://192.168.x.x:5173` que o `dev:phone` mostra (mesmo Wi-Fi) e
aceite o aviso de certificado. O navegador só libera a câmera em HTTPS.

Outros comandos: `npm run build`, `npm run preview`, `npm run typecheck`, `npm run lint`.

### Testar o app instalado e offline

O service worker só é registrado no build de produção (`npm run preview`, ou
`npm run preview:phone` para abrir no celular por HTTPS). Com o certificado autoassinado do modo
celular o navegador costuma recusar o service worker, então para testar a instalação e o modo
offline no iPhone use um certificado confiável (ex.: `mkcert` com a CA instalada no aparelho) ou
publique o `dist/` numa hospedagem com HTTPS.

## Estrutura

```
src/
  domain/    regras puras: parser do roteiro, trechos, ritmo, takes, marcadores de corte
  engine/    Prompter: máquina de estados que decide o trecho na tela e marca os blocos
  media/     câmera, gravação (MediaRecorder, corte 9:16), wake lock, salvar arquivo
  storage/   roteiros e configurações (localStorage), takes e vídeos (IndexedDB)
  app/       rotas por hash, hooks de dados, service worker
  features/  telas: paste, review, session, prompter, takes
  ui/        componentes básicos e estilos
public/sw.js  offline (o build carimba a versão do cache)
```

As camadas só dependem para dentro: `features → app/engine/media/storage → domain`.
