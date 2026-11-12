# Prompter — Especificação de produto

> Status: rascunho v0.2 (benchmark incorporado; ver seção 9) · Data: 12/11/2026 · Dono: dev solo (usuário único no início)
> Escopo deste documento: o quê e por quê. Não há código aqui.

---

## 1. Problema, usuário, job-to-be-done e métricas

### 1.1 Usuário

Desenvolvedor solo brasileiro que divulga os próprios apps com vídeos curtos (Reels/TikTok, ~30s, 9:16) falando para a câmera. Grava sozinho, sem equipe, às vezes no celular, às vezes na webcam do computador. Edita depois (CapCut ou similar) seguindo a coluna "O que eu ponho na edição" do roteiro. Não é ator nem apresentador: decorar 30s de texto com sete blocos cronometrados é difícil, e ler aparece no olhar.

### 1.2 Problema

1. **Ler aparece.** Olhar fora da lente, olhos varrendo a linha da esquerda para a direita, cabeça baixa, voz monótona de leitura. O espectador percebe em menos de 3s, e esses 3s são o gancho do vídeo.
2. **O tempo importa.** O roteiro é cronometrado (0–3s gancho, 3–7s dor, ...) porque a edição depende disso. Falar rápido demais ou devagar demais desalinha os cortes e os prints planejados.
3. **Um erro custa o take inteiro.** Hoje, errar no bloco 5 obriga a regravar tudo, e o cansaço piora os takes seguintes.
4. **O roteiro chega em formatos diferentes** (tabela markdown, tabela com bordas unicode, texto solto) e passá-lo para um teleprompter genérico exige limpeza manual: tirar a coluna de edição, tirar as direções de cena, quebrar em frases.
5. **Teleprompters genéricos rolam texto contínuo**, que é o formato que mais "parece leitura": muitas palavras visíveis, rolagem que puxa o olhar para baixo, sem noção de bloco nem de tempo.

### 1.3 Job-to-be-done

> "Quando eu tenho um roteiro de 30s pronto, quero gravá-lo olhando para a lente, no ritmo certo, em poucos takes, para publicar um vídeo que pareça conversa e não leitura, sem gastar a tarde nisso."

Jobs secundários:
- "Quando eu erro um trecho, quero regravar só aquele bloco, para não perder o resto que ficou bom."
- "Quando eu gravo com o app nativo da câmera (melhor qualidade), quero que o prompter me guie mesmo assim."
- "Antes de gravar, quero ensaiar e sentir o ritmo, para não queimar takes aquecendo."

### 1.4 Métricas de sucesso

Usuário único, então são métricas pessoais, medidas por eventos locais (sem servidor no MVP) e por autoavaliação.

| Métrica | Como medir | Meta |
|---|---|---|
| Tempo de colar o roteiro até ter um take utilizável | timestamp de "roteiro colado" até "take marcado como bom" | ≤ 10 min (hoje estimado em 30–60 min) |
| Takes completos por vídeo publicado | contagem de takes por roteiro | ≤ 3 |
| Aderência ao tempo | duração do take versus duração do roteiro | ±2s em 80% dos takes |
| Roteiro aceito pelo parser sem edição manual | % de colagens em que o usuário não edita nenhum bloco antes de ensaiar | ≥ 90% dos roteiros gerados pela IA dele |
| "Não parece lido" | autoavaliação 1–5 depois de rever o take (pergunta opcional) e, depois, retenção nos 3s iniciais do Reels | média ≥ 4 |
| Uso contínuo | vídeos gravados com o app por semana | ≥ 2 por semana durante 4 semanas |

Métrica de fracasso que dispara revisão: depois de 3 vídeos, ele volta a gravar sem o app.

---

## 2. Princípios para não parecer que está lendo

Cada princípio vira um requisito concreto.

### P1. O texto fica colado na lente
- **Celular (câmera frontal no topo):** o texto ocupa a faixa dos **primeiros 20–25% da altura**, logo abaixo da câmera, do notch ou da Dynamic Island. Nunca no meio nem embaixo da tela.
- **Computador (webcam no topo do monitor):** faixa de texto **centralizada horizontalmente e encostada no topo** da janela, logo abaixo da webcam. Sugerir na primeira vez: "Deixe esta janela no topo da tela, embaixo da câmera."
- Largura máxima da linha: **cerca de 60% da largura da tela no celular** e **~480px no computador**. Linha estreita significa pouco movimento horizontal de olho.

### P2. Poucas palavras por vez
- Cada bloco é quebrado em **trechos de 2 a 6 palavras** (alvo de 4), cortando de preferência em pontuação (vírgula, ponto, interrogação) e nunca separando artigo ou preposição da palavra seguinte ("no | caderno" é proibido; "No caderno?" é um trecho).
- No máximo **2 linhas visíveis**: o trecho atual (grande, alto contraste) e o próximo (menor, ~40% de opacidade). Nada de rolagem contínua.
- Fonte grande: **≥ 30px no celular** e **≥ 40px no computador**, sem serifa, peso 600, com tamanho ajustável em 3 níveis (P, M, G).

### P3. Contagem regressiva antes de falar
- 3 → 2 → 1 em números grandes **na mesma faixa do texto** (o olho já está na lente quando a fala começa).
- A gravação começa no "3", então sobram cerca de 3s de margem para corte na edição. A fala começa no fim do "1".
- Sem bipe sonoro, porque o microfone gravaria o som. A contagem é só visual.

### P4. Cue visual do próximo bloco
- No último ~1s de cada bloco, uma **barra fina de progresso** embaixo do trecho termina de encher, e o primeiro trecho do próximo bloco aparece como "próximo".
- Trocar de bloco faz um **pulso sutil na borda da faixa** (sem flash forte, porque o reflexo da tela muda a luz no rosto).
- Bloco que começa com pergunta ou com mudança de tom pode mostrar o rótulo da edição em miniatura ("corte", "logo") **só no ensaio**. Na gravação, a coluna de edição fica escondida.

### P5. Direção de cena é instrução, não fala
- Texto entre parênteses, como "(sorri, sem falar)" ou "(pausa)", é **direção**: aparece em itálico, cor diferente (âmbar), com ícone de "ação" e **nunca entra como trecho de fala**.
- Bloco que só tem direção (ex.: 28–30s) vira **bloco mudo**: mostra a direção grande ("Sorria, sem falar") e um indicador de tempo restante. No modo manual, ele avança sozinho ao fim do tempo do roteiro.
- Direções no meio de uma fala ("Testa sete dias grátis (aponta pra câmera)") aparecem como **etiqueta acima do trecho** no momento em que ocorrem.
- Colchetes `[...]` e asteriscos `*...*` também contam como direção.

### P6. O olhar volta para a lente entre trechos
- Nos blocos mudos e no fim do take, o texto **some** e só fica um ponto discreto perto da lente, como âncora do olhar.
- Opção "Ponto de olhar": um pequeno marcador fixo no ponto mais próximo da câmera.

### P7. Ensaiar antes
- Modo **Ensaio**: roda o roteiro igual à gravação, sem gravar, mostrando também a coluna de edição.
- No fim do ensaio, o app mostra quanto tempo cada bloco levou em relação ao roteiro (ver 3.4).
- A recomendação aparece na primeira vez: "Faça um ensaio antes. O primeiro take quase sempre é aquecimento."

### P8. Sem distração de si mesmo
- O preview da câmera ajuda a enquadrar, mas olhar para si mesmo durante a fala distrai e puxa o olho para baixo. Por padrão, **durante a gravação o preview fica escurecido (~30% de opacidade)** atrás do texto no celular e vira uma **miniatura no canto inferior** no computador. Pode ser desligado.

### P9. Ritmo de fala, não de leitura
- No modo por tempo, o tempo de cada trecho dentro do bloco é proporcional ao número de sílabas estimado, com pausa extra de ~250ms depois de vírgula e de ~400ms depois de ponto ou interrogação. A pausa é parte do roteiro: vira tempo de trecho vazio, não aceleração.
- Controle de velocidade global de 80% a 120%, em passos de 5%.

### P10. Tela não muda a luz do rosto
- Fundo preto puro, texto branco ou creme. Nada de telas brancas durante a gravação. Brilho constante.

---

## 3. Fluxos

Visão geral:

```
Colar roteiro → Revisar blocos → Ensaiar (opcional, recomendado) → Gravar
                                                         │
                       ┌─────────────────────────────────┤
                       ▼                                 ▼
             Com câmera (grava no app)       Só prompter (grava em outro app/aparelho)
                       │
                       ▼
                 Revisar take ── Regravar bloco N ──┐
                       │                            │
                       ▼                            │
                 Baixar / exportar  ◄───────────────┘
```

### 3.1 Colar roteiro

- Tela inicial com uma área de texto grande: **"Cole seu roteiro aqui"**, com o subtítulo "Aceita tabela (markdown ou com bordas) ou texto simples."
- Botão **"Colar da área de transferência"** (usa a Clipboard API quando disponível; senão o usuário cola manualmente).
- O parser roda ao colar, sem botão "processar". Se der certo, vai direto para a revisão.
- Os roteiros ficam salvos localmente. A lista **"Roteiros recentes"** mostra os últimos 10, com o título inferido do primeiro bloco ou do nome do app citado.

#### Regras do parser

**Formatos aceitos:**

1. **Tabela markdown:** linhas com `|`. Ignora a linha separadora `|---|---|`. Aceita pipes no começo e no fim, opcionais.
2. **Tabela com bordas unicode:** caracteres `┌ ┬ ┐ ├ ┼ ┤ └ ┴ ┘ ─ │ ═ ║ ╔ ╗ ╚ ╝ ╠ ╣ ╦ ╩ ╬` e as variantes ASCII `+ - |`.
   - Linhas só de borda são ignoradas.
   - **Células que ocupam várias linhas** (o texto quebra dentro da célula): linhas consecutivas com `│` entre dois separadores horizontais pertencem à mesma linha da tabela, e o texto de cada coluna é concatenado com espaço. Sem separador entre as linhas, uma linha nova cuja célula "Tempo" está vazia continua a anterior.
3. **Texto simples**, em três sub-casos:
   - Linhas com tempo no começo: `0–3s Fisio autônomo: ...`, `0-3s: ...`, `[0:00–0:03] ...`, `00:03 ...`.
   - Linhas com separador entre fala e edição: `0–3s | fala | edição` ou `fala — Edição: ...`. Aceitar os prefixos "Edição:", "Na edição:", "Visual:", "B-roll:" como coluna de edição.
   - Parágrafos sem tempo: cada parágrafo ou linha não vazia vira um bloco, e o tempo é **estimado a 2,6 palavras/s** (fala natural em PT-BR, ~155 palavras/min), com mínimo de 1,5s por bloco. A revisão mostra o aviso "Tempos estimados".

**Detecção de colunas:**
- Pelo cabeçalho, comparando sem acento e sem diferenciar maiúsculas: tempo ← {tempo, time, seg, duração, momento}; fala ← {você fala, fala, falar, texto, narração, roteiro, áudio}; edição ← {edição, o que eu ponho, visual, tela, b-roll, cena, observação}.
- Sem cabeçalho: a coluna cujas células casam com o padrão de tempo é "tempo", a mais longa em média é "fala", e o restante é "edição".
- Colunas extras são preservadas como "outras" e exibidas na revisão.

**Formatos de tempo:** `0–3s`, `0-3s`, `0—3 s`, `0 a 3s`, `0:00–0:03`, `00:00:03`, `3s` (só fim: o início é o fim do bloco anterior), `3–7`, com vírgula ou ponto decimal (`3,5s`). Aceitar en dash, em dash, hífen e "a"/"até".

**Validação, com aviso que não bloqueia:**
- Buraco entre blocos (3–7s e depois 8–10s): "Há 1s sem fala entre os blocos 2 e 3." Opção: "Juntar" ou "Manter como pausa".
- Sobreposição: "Os blocos 4 e 5 se sobrepõem em 1s." Opção: "Ajustar automaticamente".
- Fala longa demais para o tempo (mais de 3,5 palavras/s): o bloco fica destacado com "Apertado: 18 palavras em 5s. Fale rápido ou corte texto."
- Nada reconhecido: "Não entendi esse formato. Cole como texto simples: uma frase por linha."

**Normalizações:** tirar markdown inline (`**`, `_`, `` ` ``), aspas tipográficas inconsistentes e espaços duplos; preservar emojis da coluna de edição; separar direções (P5).

### 3.2 Revisar blocos

- Lista vertical de **cartões de bloco**: tempo (`0–3s · 3s`), fala (editável), direções (chips âmbar), edição (cinza, recolhida por padrão) e a quebra em trechos mostrada com divisores finos (`Fisio autônomo: | onde tá a ficha | do paciente | que você atendeu ontem?`).
- Ações por bloco: editar texto, editar tempo, ajustar quebra de trecho (tocar entre palavras junta ou separa), marcar como "só direção", excluir, inserir bloco depois.
- Cabeçalho: duração total ("30s · 7 blocos") e o indicador de ritmo médio ("2,7 palavras/s · natural"). Faixas: < 2,2 calmo; 2,2–3,2 natural; > 3,2 rápido.
- Rodapé fixo com **[Ensaiar]** (secundário) e **[Gravar]** (primário). No computador, os atalhos aparecem: `E` ensaiar, `G` gravar.
- Edições são salvas automaticamente.

### 3.3 Configurar a sessão (folha rápida antes de ensaiar ou gravar)

Uma folha só, lembrada entre sessões:
- **Modo de gravação:** "Gravar aqui (com câmera)" · "Só prompter (gravo em outro app)".
- **Avanço:** "Pelo tempo do roteiro" (padrão) · "Manual".
- **Velocidade:** 80–120%.
- **Tamanho do texto:** P · M · G.
- **Câmera:** frontal ou traseira (no celular; no computador, a lista de dispositivos). Microfone: lista de dispositivos.
- **Espelhar texto** (para teleprompter com vidro). Fica em "Avançado".

### 3.4 Ensaiar

- Mesma tela da gravação (seção 5), sem gravar, com duas diferenças: a coluna de edição aparece como legenda pequena embaixo da faixa e o selo "ENSAIO" fica visível no canto.
- Avanço pelo tempo por padrão. O usuário pode trocar para manual e tocar ou apertar espaço a cada bloco para **medir o próprio ritmo**.
- No fim do ensaio manual: tabela "Seu tempo × roteiro" por bloco (ex.: "Bloco 4: 6,1s · roteiro 8s · você foi mais rápido"), com as opções:
  - **"Usar meus tempos"**: substitui os tempos dos blocos pelos medidos (a duração total muda, e o app avisa).
  - **"Manter o roteiro"**.
  - **"Ensaiar de novo"**.
- Microcopy de fim: "Ensaio feito. Bora gravar?" com os botões [Gravar] e [Ensaiar de novo].

### 3.5 Gravar com câmera (no app)

1. Pedido de permissão de câmera e microfone. Antes do prompt do navegador, uma explicação: "Preciso da câmera e do microfone para gravar. O vídeo fica só no seu aparelho."
2. Tela de enquadramento: preview 9:16 grande, faixa de texto já mostrando o primeiro trecho (para ele conferir a altura dos olhos) e botão **[Começar]**.
3. Toque em Começar (ou tecla espaço/Enter, ou controle Bluetooth): contagem regressiva 3-2-1. A gravação começa no "3".
4. Os blocos rodam. Ao fim do último bloco, a gravação continua por **+1,5s** (respiro para corte) e para sozinha.
5. Vai direto para a revisão do take.
6. Parada antecipada: botão de parar (ou tecla `Esc`/`S`) salva o take como "incompleto", com os blocos já cobertos registrados.

### 3.6 Gravar só como prompter (sem câmera)

Para quando ele grava com o app nativo da câmera (melhor qualidade) ou com outro aparelho.

- Cenário A, o mais provável: **o celular grava com o app de câmera nativo e o computador roda o prompter.** O celular fica em pé logo em frente da tela, e o texto aparece no topo da janela, logo acima ou atrás do celular. Ou ele usa a câmera traseira do celular, com o prompter no computador logo abaixo da lente.
- Cenário B: **o computador grava (Photo Booth, OBS, QuickTime) e o prompter roda numa janela do navegador** logo abaixo da webcam.
- Cenário C: **o prompter roda num segundo celular ou tablet** posicionado logo abaixo da lente do aparelho que grava.

Comportamento:
- Sem preview de câmera e sem pedido de permissão.
- Botão [Começar] com contagem 3-2-1 e o aviso **"Aperte gravar na sua câmera antes de começar."**
- Contagem mais longa opcional (5s) para dar tempo de apertar gravar no outro aparelho.
- No fim, a tela "Terminou. Pare a gravação na sua câmera." com os botões [De novo] e [Do bloco…].
- Não há revisão de take (o vídeo não está no app). O app registra "takes de prompter" com duração e blocos, só para histórico.

### 3.7 Revisar take

- Player 9:16 do take com uma **linha do tempo marcada por blocos** (chips "1 · 0–3s", "2 · 3–7s", ...). Tocar num chip pula para o bloco.
- A coluna de edição aparece sincronizada embaixo do player, para ele já visualizar a edição.
- Ações:
  - **[Ficou bom]**: marca o take como escolhido (estrela).
  - **[Regravar bloco…]**: escolhe um ou mais blocos contíguos (ver 3.8).
  - **[Gravar de novo]**: take completo novo.
  - **[Baixar]**.
  - **[Apagar]**, com a confirmação "Apagar este take? Não dá pra desfazer."
- **Ritmo por bloco** (lacuna 5 do benchmark): uma linha por chip mostrando o tempo real do bloco no take e o desvio em relação ao roteiro, ex.: "Bloco 4 · 8,0s no roteiro · você terminou de falar 1,1s antes". Fontes do dado, em ordem de confiança: (1) toques de avanço no modo manual; (2) segurar/avançar/voltar no modo por tempo; (3) detecção de fala por volume (VAD com Web Audio, sem transcrever) indicando quando a fala de cada bloco terminou. Desvio acima de ±0,5s fica destacado em âmbar, e o app sugere: "Use meus tempos neste bloco" ou "Corte texto do bloco 4".
- **Notas de edição por bloco** (lacuna 2): cada chip mostra a nota da coluna "O que eu ponho na edição" ("3 cortes rápidos", "Logo ao lado do seu rosto") no momento em que o player passa pelo bloco.
- Autoavaliação opcional, uma pergunta com 5 pontos: "Pareceu conversa ou leitura?" (alimenta a métrica).
- Lista de takes do roteiro: "Take 1 · completo · 31,2s", "Take 2 · bloco 4 · 8,4s ★".

### 3.8 Regravar só um bloco

- A partir da revisão ou da tela de revisão de blocos: "Regravar bloco 4" (ou intervalo "blocos 4–5").
- **Pré-roll de contexto:** durante a contagem, a faixa mostra em cinza o último trecho do bloco anterior ("…num print do WhatsApp?"), para ele entrar no mesmo tom e na mesma energia. Esse trecho **não** é para falar, e o rótulo diz: "Antes: (não fale)".
- O take gravado cobre só os blocos escolhidos, com +1s de margem em cada ponta.
- O nome do arquivo deixa explícito o que é: `fisiorotina_b04_t2.mp4`.
- Junção automática dos takes fica fora do MVP: ele monta no editor, como já faz. Ver seção 6.

### 3.9 Baixar / exportar

- **Baixar take:** arquivo de vídeo com o nome `{slug}_{blocos}_t{n}.{ext}`, ex.: `fisiorotina_completo_t1.mp4`, `fisiorotina_b04_t2.mp4`. O slug vem do nome do app detectado no roteiro ou do título editável.
- **No iPhone:** o download abre a folha de compartilhamento ("Salvar vídeo" vai para o rolo da câmera). Usar Web Share API com arquivo quando suportado; o fallback é o link de download.
- **Exportar marcadores de corte** (lacuna 3 do benchmark; nenhuma ferramenta pesquisada faz isso): para o take escolhido, gera um arquivo com o **tempo real de início e fim de cada bloco dentro do vídeo**, a fala e a nota de edição. Dois formatos, os dois baratos de gerar:
  - `.txt` legível, para ler ao lado do CapCut:
    ```
    FisioRotina · take 2 · 31,4s
    00:03.0 – 00:06.1  B1  "Fisio autônomo: onde tá a ficha..."   → Legenda grande, "Fisio autônomo" em teal
    00:06.1 – 00:10.3  B2  "No caderno? No Drive?..."               → 3 cortes rápidos (caderno, pasta, print)
    ```
  - `.csv` (`bloco,inicio_s,fim_s,fala,edicao`), para planilha ou automação futura.
  - Os tempos já contam a margem inicial da contagem (o bloco 1 começa em ~00:03), então batem com a linha do tempo do arquivo de vídeo.
  - Para takes de bloco regravado, os tempos são relativos ao arquivo daquele take.
  - No iPhone, sai pela folha de compartilhamento (dá para mandar para o Notas ou para o computador por AirDrop).
- **Baixar escolhidos:** baixa em sequência todos os takes com estrela, na ordem dos blocos.
- O app avisa que os takes ficam guardados só neste aparelho e podem ser apagados pelo navegador: "Baixe os takes bons. O navegador pode limpar vídeos guardados aqui."

---

## 4. Modos de avanço do texto

| | Por tempo do roteiro | Por voz | Manual |
|---|---|---|---|
| Como funciona | Cada bloco dura o tempo da coluna "Tempo"; os trechos dentro do bloco se distribuem por sílabas e pausas (P9) | Reconhecimento de fala acompanha as palavras e avança o trecho quando ele é dito | Toque na tela, espaço/seta/PageDown, ou controle Bluetooth que emula teclado |
| Força | Garante o tempo que a edição precisa; previsível; funciona offline e em qualquer navegador | Segue o ritmo natural dele; tolera pausas e improviso | Controle total; ótimo para ensaio e para medir o próprio ritmo |
| Fraqueza | Se ele atrasa, o texto "foge"; se adianta, ele fica esperando | Suporte ruim e instável no iOS Safari; latência; erra em nomes próprios ("FisioRotina") e números ("sete" × "7"); pode disputar o microfone com a gravação | Precisa de uma mão ou de um controle; tocar no celular durante a gravação mexe o aparelho e aparece no vídeo |
| No MVP | **Sim (padrão)** | Não (fase 2, depois de um spike técnico) | **Sim** |

### Recomendação: **por tempo do roteiro como padrão, com ajuste manual por cima**

Justificativa: o roteiro dele **já é cronometrado para a edição**. Falar no tempo certo é metade do problema ("falar frase por frase no tempo certo"). O modo por tempo é o único que garante isso, funciona igual no iPhone e no computador e não depende de APIs instáveis. Para compensar a fraqueza, com o modo por tempo ativo:

- **Segurar** (tecla ou toque longo, ~400ms) congela o trecho atual enquanto estiver pressionado. Serve para quando ele precisa de um respiro. O tempo perdido é descontado do bloco seguinte, se houver folga, ou simplesmente acumulado.
- **Avançar** (toque curto, seta para a direita, PageDown) pula para o próximo trecho.
- **Voltar** (seta para a esquerda, PageUp) volta um trecho.
- O pequeno indicador "+1,2s" ou "−0,8s" no canto mostra quanto ele está fora do roteiro. Fica visível só no ensaio; na gravação, é opcional.

**Manual** é o padrão sugerido para o primeiro ensaio (para medir o ritmo) e para quem tem controle remoto.

**Controles Bluetooth:** "passadores de slide" (page-turners) e teclados Bluetooth enviam setas ou PageDown, que a web recebe. **Os controles de selfie baratos enviam a tecla de volume, que o Safari do iPhone não entrega para páginas web.** A tela de configuração diz isso claramente: "Controle de selfie (botão de volume) não funciona no navegador. Use um passador de slides ou um teclado."

**Por voz (fase 2, opcional, nunca padrão):** o benchmark confirma que a Web Speech API é instável no Safari iOS (`continuous` para sozinho, `isFinal` não chega, resultados que caem para a nuvem e ficam lentos) e que nenhum prompter web confirma PT-BR. Por isso a voz **não substitui o relógio do bloco: ela só confirma ou adianta**. Se ele terminar a fala do bloco antes do tempo, a voz adianta o próximo trecho; se a voz falhar, o relógio segue normalmente. Implementação prevista: `continuous: false` com reinício automático a cada resultado (o padrão mais estável relatado no iOS). Ela só entra depois que um spike provar, no iPhone dele: (a) que o reconhecimento em pt-BR roda junto com a gravação; (b) latência abaixo de 500ms; (c) correspondência aproximada entre palavras reconhecidas e roteiro (sem acento, números por extenso, nomes próprios com tolerância). Comportamento previsto: avança o trecho quando ~70% das palavras dele forem reconhecidas; nunca volta sozinho; se nada for reconhecido por 2s, o relógio do bloco continua mandando.

**Passo intermediário mais barato (pode entrar como MVP+):** detecção de fala por volume (VAD com Web Audio). Sem transcrever nada, ela sabe se ele "está falando ou parado" e pode (a) medir o ritmo por bloco para o feedback da revisão (3.7) e (b), como opção, segurar o relógio enquanto ele ainda está falando no fim do bloco. Funciona offline e não depende da Web Speech API.

---

## 5. Tela de gravação

### 5.1 Celular, retrato 9:16

Layout de cima para baixo:

```
┌───────────────────────────┐
│    ●  (câmera/notch)      │  ← área segura do topo (safe-area-inset-top)
│ ┌───────────────────────┐ │
│ │  onde tá a ficha      │ │  ← TRECHO ATUAL: 30–36px, branco, peso 600
│ │  do paciente          │ │  ← PRÓXIMO: 22px, 40% opacidade
│ │  ▬▬▬▬▬▬▬▬▬▬░░░░░      │ │  ← barra do bloco (2px)
│ └───────────────────────┘ │  ← faixa ocupa ~20–25% da altura, largura ~60–70%
│                           │
│   [preview câmera 9:16    │  ← escurecido a ~30% durante a gravação
│    em tela cheia, atrás]  │
│                           │
│  ● REC 0:07    bloco 3/7  │  ← rodapé discreto, 13px, 60% opacidade
│        [ ■ parar ]        │
└───────────────────────────┘
```

- A faixa de texto tem um gradiente preto atrás (de 80% para 0%) para dar legibilidade sobre o preview.
- Toque em qualquer lugar = avançar trecho; toque longo = segurar; deslizar para a direita = voltar. **Exceção:** o botão parar exige toque duplo ou pressão de 1s, para evitar parada acidental. A dica aparece abaixo do botão: "Segure para parar".
- A tela não apaga (Screen Wake Lock) e o texto não pode ser selecionado nem dar zoom.
- No iPhone, o app sugere instalar como PWA (Adicionar à Tela de Início) para ganhar tela cheia, porque o Safari não oferece tela cheia para elementos que não são vídeo: "Para tela cheia, adicione à Tela de Início."
- Orientação: só retrato. Em paisagem, mostra "Gire o celular para a vertical."

### 5.2 Computador, texto logo abaixo da webcam

```
┌──────────────────────── tela ─────────────────────────┐
│                     ◉ webcam                           │
│            ┌──────────────────────────┐                │
│            │  Fisio autônomo:         │ ← 40–48px      │
│            │  onde tá a ficha         │ ← próximo, 30px│
│            │  ▬▬▬▬▬▬▬▬░░░░            │                │
│            └──────────────────────────┘                │
│                                                        │
│                                                        │
│                                         ┌─────┐        │
│   ● REC 0:07 · bloco 3/7 · Esc para     │prev │ ← 9:16 │
│     parar · Espaço avança               │ cam │  mini  │
│                                         └─────┘        │
└────────────────────────────────────────────────────────┘
```

- Faixa centralizada, encostada no topo, largura máxima de ~480px (pouco movimento lateral do olho).
- Preview da câmera em miniatura 9:16 no canto inferior direito, com um guia de corte 9:16 sobre a imagem da webcam (normalmente 16:9). O vídeo gravado é recortado para 9:16 pelo app, ou gravado em 16:9 com o guia, conforme o risco técnico (seção 7). **No MVP: grava o que a webcam entrega e mostra o guia 9:16; o recorte é feito na edição.**
- Botão "Tela cheia" (Fullscreen API) e atalho `F`.
- Atalhos: `Espaço` ou `→` avança · `←` volta · segurar `Espaço` segura · `Esc` para · `R` regrava o bloco atual depois de parar · `1`–`9` pulam direto para o bloco (no ensaio) · `+`/`−` mudam a velocidade (só no ensaio).
- Primeira vez: dica de posicionamento: "Deixe esta janela no topo da tela, embaixo da webcam. Diminua o zoom do navegador se o texto ficar longe da câmera."

### 5.3 Estados da tela

| Estado | O que aparece | Microcopy |
|---|---|---|
| Carregando câmera | spinner discreto na faixa | "Abrindo a câmera…" |
| Permissão pendente | explicação antes do prompt do sistema | "Preciso da câmera e do microfone para gravar. O vídeo fica só no seu aparelho." [Permitir] |
| Permissão negada | instruções por plataforma | iPhone: "Câmera bloqueada. Vá em Ajustes > Safari > Câmera e escolha Permitir. Depois recarregue." Computador: "Câmera bloqueada. Clique no cadeado ao lado do endereço e libere câmera e microfone." [Usar só como prompter] |
| Câmera em uso por outro app | aviso | "A câmera está sendo usada por outro app. Feche-o e tente de novo." |
| Pronto / enquadramento | preview + primeiro trecho na faixa | "Olhe para a câmera. Seus olhos devem ficar na altura do texto." [Começar] |
| Contagem | 3 → 2 → 1 grandes na faixa; REC já ativo no "3" | (só números) |
| Gravando, fala | trecho atual + próximo + barra do bloco | rodapé: "● REC 0:07 · bloco 3/7" |
| Gravando, bloco mudo | direção grande em âmbar + contagem do bloco | "Sorria, sem falar · 2s" |
| Gravando, direção no meio da fala | etiqueta âmbar acima do trecho | ex.: "aponta pra câmera" |
| Segurando | trecho congelado, barra pausada, ícone de pausa | "Segurando" (pequeno) |
| Último bloco | barra do take quase cheia | — |
| Finalizando (+1,5s) | faixa vazia, ponto de olhar | (nada: ele deve continuar olhando e sorrindo) |
| Salvando | spinner | "Salvando take…" |
| Take salvo | vai para a revisão | "Take 2 salvo · 30,8s" |
| Parado antes do fim | revisão com selo "incompleto" | "Take parado no bloco 5. Quer regravar a partir dele?" [Regravar do bloco 5] |
| Erro de gravação | mensagem + opção | "A gravação falhou. Tente de novo ou use só como prompter." [Tentar de novo] [Só prompter] |
| Sem espaço | mensagem | "Sem espaço para guardar o take. Baixe ou apague takes antigos." [Ver takes] |
| App em segundo plano durante a gravação | ao voltar | "A gravação parou porque o app saiu da tela. O take foi salvo até o bloco 4." |
| Ensaio | selo "ENSAIO" + coluna de edição embaixo | fim: "Ensaio feito. Bora gravar?" |
| Prompter (sem câmera) | fundo preto, sem preview | antes: "Aperte gravar na sua câmera antes de começar." Fim: "Terminou. Pare a gravação na sua câmera." |

### 5.4 Microcopy geral (PT-BR, tom direto, "você")

- Botões: "Colar roteiro", "Ensaiar", "Gravar", "Começar", "Parar", "Ficou bom", "Gravar de novo", "Regravar bloco…", "Baixar", "Exportar marcadores", "Apagar", "Usar meus tempos", "Manter o roteiro".
- Avisos de ritmo: "Natural", "Calmo", "Rápido: considere cortar texto".
- Nunca usar "teleprompter" na interface, só "roteiro", "bloco" e "take".

---

## 6. Escopo: MVP × depois

### 6.1 MVP (meta: 3 a 5 dias de um dev solo)

Critério de corte: cada item precisa servir ao fluxo "colar → gravar um take natural no tempo certo → baixar", ou evitar regravar tudo.

| # | Item | Por que está no MVP |
|---|---|---|
| M1 | Parser dos 3 formatos (markdown, unicode com células multilinha, texto simples com ou sem tempo) + separação de direções | Sem isso não há produto; é o diferencial em relação a prompters genéricos |
| M2 | Revisão de blocos: editar texto e tempo, ver os trechos, avisos de ritmo | O parser vai errar às vezes; corrigir precisa ser trivial |
| M3 | Tela de prompter (celular e computador) com faixa no topo, trechos de 2–6 palavras, próximo trecho, contagem, barra de bloco, blocos mudos | É o núcleo do "não parecer que está lendo" |
| M4 | Avanço por tempo (padrão) + manual (toque/teclado/passador de slide), com segurar/avançar/voltar | Cobre "no tempo certo" sem APIs instáveis |
| M5 | Modo só prompter (sem câmera) | Barato (é M3 sem câmera) e cobre a gravação com câmera nativa, a de melhor qualidade |
| M6 | Gravação com câmera via MediaRecorder, com margem inicial e final | Pedido explícito; viável em iOS 14.5+ (MP4) e Chrome/Safari desktop, conforme o benchmark |
| M7 | Revisão de take com player e chips de bloco; marcar como bom; apagar | Fecha o ciclo de múltiplos takes |
| M8 | Regravar bloco(s) com pré-roll de contexto | Pedido explícito; barato (é só começar no índice N) e é o maior ganho de tempo |
| M9 | Baixar take (Web Share no iPhone, download no computador) com nomes claros | Sem isso o vídeo não sai do app |
| M10 | Persistência local: roteiros em localStorage, takes em IndexedDB | Sobreviver a um recarregamento sem backend |
| M11 | Ensaio (sem gravar) com medição manual de tempo e "Usar meus tempos" | Pedido explícito; reaproveita M3/M4. **Se faltar tempo, corta-se só "Usar meus tempos".** |
| M13 | **Notas de edição por bloco** visíveis no ensaio e na revisão do take, escondidas na gravação | Lacuna 2 do benchmark: ninguém liga a nota de edição ao bloco; o dado já sai do parser, então custa só interface |
| M14 | **Feedback de ritmo por bloco** na revisão do ensaio e do take (fontes 1 e 2 da seção 3.7; o VAD é MVP+) | Lacuna 5 do benchmark; com toques e eventos de segurar/avançar já registrados, é só cálculo e exibição |
| M15 | **Exportar marcadores de corte** (.txt e .csv) do take escolhido | Lacuna 3 do benchmark; reaproveita os timestamps de troca de bloco que a revisão já precisa (R11). Meio dia de trabalho |
| M12 | PWA instalável (manifest + service worker básico, offline) e Wake Lock | Tela cheia no iPhone; a tela não apaga no meio do take |

**Lacunas do benchmark já cobertas pelo desenho base:** tempo por bloco (lacuna 1: M1 + M4, com o relógio de cada bloco vindo da coluna "Tempo") e frase atual + próxima com barra do bloco (lacuna 4: M3). O MVP passa a ter 15 itens e continua cabendo em ~5 dias porque M13–M15 só exibem dados que M1, M4 e M6 já produzem. Ordem de corte, se atrasar: "Usar meus tempos" (M11) → .csv (M15, fica só o .txt) → fonte 2 do ritmo (M14, fica só o modo manual).

**MVP+ (logo depois, se sobrar tempo):** VAD por volume para ritmo por bloco também no modo por tempo (seção 4).

Fora do MVP de propósito: backend, contas, sincronização, analytics remoto. Tudo roda no aparelho.

### 6.2 Depois

| Fase | Item | Por que não agora |
|---|---|---|
| 2 | **Avanço por voz** (Web Speech API; no iPhone, spike obrigatório antes) | Instável no iOS, conflito com o microfone da gravação, precisa de correspondência aproximada. Alto risco, e o modo por tempo resolve 80% |
| 2 | **Prompter por cima da câmera nativa no iPhone** (texto renderizado em canvas → vídeo → Picture-in-Picture sobre o app Câmera) | Permitiria gravar com a câmera nativa no mesmo celular. Técnica possível, mas frágil; exige spike |
| 2 | Juntar takes (take completo + bloco regravado) em um arquivo, via ffmpeg.wasm | Pesado (~25MB), lento no celular; ele já edita no CapCut |
| 2 | Exportar legendas .srt da fala com os tempos reais do take | Útil para a legenda na edição; não bloqueia gravar |
| 2 | Alinhamento da fala aos blocos com **Whisper no navegador depois da gravação** (Transformers.js, modelo multilíngue tiny/base) para refinar os marcadores e gerar as legendas | O benchmark aponta isso como uso mais realista do Whisper do que acompanhar ao vivo; o download do modelo pesa e não há medida de latência em iPhone |
| 2 | **Modo memorizar:** no 2º take, mostrar só palavras-chave do trecho (ex.: "caderno · Drive · print") | Lacuna 7 do benchmark (nenhuma ferramenta ajuda a decorar antes); ajuda a "não parecer lido", mas depende de validar o básico primeiro |
| 2 | **Encurtar frase com IA** no cartão de bloco apertado ("18 palavras em 5s") | Inspirado no escritor de IA do CapCut; exige chamada de API e chave, então sai do MVP sem backend |
| 2 | **Celular como controle remoto** do prompter no computador (pareamento por QR code) | Inspirado na janela de operador do PromptDog; precisa de canal em tempo real (WebRTC ou servidor) |
| 3 | Comandos de voz ("próximo", "de novo") | Inspirado no Speakflow; depende da mesma Web Speech API instável |
| 3 | Recorte 9:16 na gravação do computador (canvas → captureStream) | Afeta desempenho e qualidade; recortar na edição resolve |
| 3 | Biblioteca de roteiros com tags por app, duplicar roteiro, variações A/B de gancho | Conveniência; o volume dele ainda é baixo |
| 3 | Integração direta com a IA que gera o roteiro (colar o link ou a API) | Colar já funciona |
| 3 | Espelhamento para teleprompter de vidro, temas de cor, fontes | Nicho; espelhar é barato e pode entrar antes se ele comprar um vidro |
| 3 | Métricas de olhar (detecção facial para avisar "você olhou para baixo") | Interessante, mas caro e com risco de privacidade e desempenho |
| 3 | Multiusuário / produto público (contas, pagamento) | Primeiro validar com o próprio uso |

---

## 7. Riscos técnicos e mitigação

| # | Risco | Impacto | Mitigação |
|---|---|---|---|
| R1 | **iOS Safari: getUserMedia só em HTTPS e com gesto do usuário; permissão pode ser pedida de novo a cada sessão** (sobretudo fora do PWA) | Atrito ao abrir a câmera | Servir só em HTTPS; pedir a câmera ao tocar em "Gravar", nunca no carregamento; explicar antes do prompt; no PWA instalado, a permissão tende a persistir mais. Testar nas duas formas |
| R2 | **iOS Safari: MediaRecorder** existe desde o **iOS 14.5**. Antes do iOS 18.4 só grava **MP4 (H.264/AAC)**, e pedir WebM lança `NotSupportedError`; do 18.4 em diante aceita WebM também. Há um bug aberto de MP4 no 18.4 beta (WebKit 290002) | Gravação falha ou sai num formato que o Fotos/CapCut não abre | **Nunca checar a versão do iOS; usar `MediaRecorder.isTypeSupported()`** e preferir MP4 em todo lugar (toca no Fotos e entra direto no CapCut e no Instagram), nesta ordem: `video/mp4;codecs=avc1,mp4a` → `video/mp4` → `video/webm;codecs=vp9,opus` → `video/webm`. Extensão do arquivo conforme o tipo escolhido. Versão mínima suportada: iOS 14.5; abaixo disso, oferecer só o modo prompter. Critério 22 testado no iOS atual dele e, se possível, num aparelho com iOS 18.4+ |
| R3 | **Qualidade da câmera pela web é inferior à do app nativo** (sem estabilização, HDR ou controle de foco; resolução frequentemente limitada a 1080p ou 720p; bitrate menor) | Vídeo "de webcam" | Pedir `1080×1920` ideal com `frameRate 30` e `videoBitsPerSecond` ~8 Mbps; mostrar a resolução obtida na tela de enquadramento ("Gravando em 1080×1920"); posicionar o **modo só prompter** como o caminho de qualidade máxima |
| R4 | **Orientação no iOS:** a trilha pode chegar em paisagem ou mudar ao girar; a câmera frontal no preview é espelhada | Vídeo deitado ou espelhado | Travar a interface em retrato; pedir as dimensões em retrato e verificar `getSettings()`; espelhar só o preview (CSS), nunca a gravação; testar em iPhone real antes de considerar M6 pronto |
| R5 | **App sai da tela ou a tela apaga durante a gravação** (iOS suspende a câmera) | Take perdido | Screen Wake Lock (iOS 16.4+); `MediaRecorder.start(timeslice=1000)` para gravar em pedaços e salvar o parcial; tratar `visibilitychange` com o aviso de estado da seção 5.3 |
| R6 | **Armazenamento local:** limites de cota do IndexedDB e limpeza automática do Safari (ITP apaga dados de sites sem interação depois de ~7 dias; o PWA instalado é mais estável) | Takes somem | Pedir `navigator.storage.persist()`; tratar vídeo guardado como temporário e incentivar o download imediato; avisar com a cota estimada (`storage.estimate()`); takes de 30s a 8 Mbps ≈ 30MB, então manter um limite de ~20 takes com aviso |
| R7 | **Reconhecimento de voz pt-BR** (fase 2): no Safari iOS só existe `webkitSpeechRecognition`, com suporte "parcial" (caniuse); há relatos de `continuous` que para sozinho, `isFinal` sempre falso, resultados que se acumulam, interim results que caem para a nuvem e ficam lentos, e acurácia pior fora do inglês. Depende de Siri/Ditado ativos e **pode conflitar com o getUserMedia de áudio da gravação**. No Chrome o áudio vai para servidor (não funciona offline); no Chrome Android varia por aparelho e não há teste publicado de pt-BR; o Firefox vem desativado | Modo voz inutilizável no aparelho principal | **Decisão de produto: avanço padrão por tempo; voz só como opção que confirma ou adianta, nunca como condutor** (seção 4). Fora do MVP. Spike de meio dia no iPhone dele com gravação simultânea, usando `continuous: false` com reinício automático. Alternativas: VAD por volume (sem transcrição) para "falando ou parado"; reconhecer só no computador (Chrome); Whisper no navegador (multilíngue tiny/base) para alinhar **depois** da gravação, não ao vivo. Fallback automático: se a voz falhar, o relógio segue |
| R8 | **Controle Bluetooth de selfie envia tecla de volume**, que a web não recebe no iOS | Ele compra o controle errado | Documentar na configuração; testar com passador de slides (setas/PageDown) e com teclado BT |
| R9 | **Sem tela cheia no iPhone fora do PWA** (a Fullscreen API não funciona em elementos não-vídeo no iPhone) | Barra do Safari ocupa o topo e empurra o texto para longe da lente | Sugerir a instalação como PWA com `display: standalone`; usar `viewport-fit=cover` e `safe-area-inset` para colar a faixa no topo real |
| R10 | **Parser frágil** diante de variações da IA (cabeçalhos diferentes, células multilinha, tempos em formatos novos) | Usuário edita bloco por bloco, ou desiste | Fixtures de teste com ≥ 15 roteiros reais dele em formatos variados; fallback "texto simples" sempre disponível; revisão de blocos fácil; mensagem clara quando falhar |
| R11 | **Sincronia texto × vídeo para os chips de bloco** (o início real do MediaRecorder tem atraso variável) | Chips da revisão fora do lugar | Registrar `performance.now()` no evento `start` do recorder e nas trocas de bloco; calcular os offsets relativos ao `start`; aceitar erro de até 200ms |
| R12 | **Áudio processado** (cancelamento de eco, supressão de ruído e ganho automático podem deixar a voz abafada) | Áudio pior que o do app nativo | Opção avançada "Áudio cru" (desliga `echoCancellation`, `noiseSuppression`, `autoGainControl`); testar qual soa melhor no iPhone dele e definir o padrão com base nisso |
| R13 | **Reflexo e luz da tela** no rosto ou nos óculos | Vídeo com brilho estranho | Fundo preto, texto não puramente branco (creme #F5F0E6), sem flashes de transição (P10) |

**Spikes recomendados antes de construir (meio dia no total):** R2 + R4 (gravar 30s em mp4 retrato no iPhone dele, com câmera frontal e traseira) e R9 (faixa colada sob a Dynamic Island no PWA).

---

## 8. Critérios de aceite do MVP

Formato: dado / quando / então. "iPhone" = iPhone do usuário com iOS atual, no Safari e como PWA. "Computador" = Chrome e Safari atuais no macOS.

### Parser e revisão
1. Dado o roteiro de exemplo do FisioRotina como **tabela markdown**, quando colado, então são criados exatamente 7 blocos com os tempos 0–3, 3–7, 7–10, 10–18, 18–23, 23–28 e 28–30s, fala e edição nas colunas certas, e a duração total mostrada é "30s".
2. Dado o mesmo roteiro como **tabela unicode** (┌─┬─┐ │), inclusive com uma célula de fala quebrada em 2 linhas, quando colado, então o resultado é idêntico ao do critério 1 (a célula multilinha vira um texto só, separado por espaço).
3. Dado o mesmo roteiro como **texto simples** no formato `0–3s Fisio autônomo: ...`, quando colado, então os 7 blocos são criados com os tempos corretos e a coluna de edição fica vazia sem erro.
4. Dado um texto simples **sem tempos** com 5 linhas, quando colado, então são criados 5 blocos com tempo estimado a 2,6 palavras/s (mínimo 1,5s) e o aviso "Tempos estimados" aparece.
5. Dado o bloco 28–30s "(sorri, sem falar)", então ele é marcado como **bloco mudo**: não gera trecho de fala e aparece como direção em âmbar.
6. Dada uma fala com direção no meio, "Testa sete dias grátis (aponta pra câmera)", então o texto entre parênteses não aparece em nenhum trecho de fala e é exibido como etiqueta de direção.
7. Tempos nos formatos `0-3s`, `0—3 s`, `0:00–0:03`, `3,5s` e `0 a 3s` são todos interpretados corretamente (um teste por formato).
8. Dado um texto que não é roteiro (ex.: uma palavra só ou vazio), então a mensagem "Não entendi esse formato…" aparece e nada quebra.
9. Nenhum trecho gerado tem mais de 6 palavras nem termina em artigo ou preposição (a, o, as, os, um, uma, de, do, da, no, na, em, pra, por, com).
10. Editar a fala ou o tempo de um bloco recalcula os trechos e a duração total em menos de 100ms, e a edição sobrevive a um recarregamento da página.

### Prompter
11. No iPhone em retrato, a borda superior do trecho atual fica a no máximo 25% da altura da tela a partir do topo, e o trecho atual usa ≥ 30px.
12. No computador, a faixa de texto fica encostada no topo da janela, centralizada, com largura ≤ 480px.
13. No máximo 2 trechos ficam visíveis ao mesmo tempo (atual e próximo), e o próximo tem opacidade visivelmente menor.
14. Ao tocar em Começar, a contagem 3-2-1 aparece na faixa de texto, e o primeiro trecho surge ao fim do "1".
15. No **modo por tempo**, a 100% de velocidade, um roteiro de 30s termina sua última fala em 30s ± 0,3s depois do fim da contagem (medido pelos timestamps registrados).
16. Mudar a velocidade para 90% faz o mesmo roteiro durar 33,3s ± 0,3s.
17. No **modo manual**, espaço, seta para a direita, PageDown e toque curto avançam um trecho; seta para a esquerda e PageUp voltam um trecho; testado com um passador de slides Bluetooth no computador e no iPhone.
18. No modo por tempo, segurar espaço ou dar toque longo congela o trecho atual enquanto estiver pressionado, e soltar retoma de onde parou.
19. O bloco mudo mostra a direção e a contagem do bloco, e avança sozinho ao fim do seu tempo, inclusive no modo manual.
20. No último ~1s de cada bloco, a barra do bloco termina de encher e o primeiro trecho do próximo bloco aparece como "próximo".
21. A tela não apaga durante um take de 60s no iPhone (Wake Lock ativo).

### Gravação com câmera
22. No iPhone com iOS 14.5+ (Safari e PWA), um take completo do roteiro de exemplo gera um arquivo **MP4** de vídeo **em retrato, não espelhado, com áudio**, escolhido via `isTypeSupported()`, que toca no app Fotos depois de salvo.
23. No Chrome e no Safari do macOS, um take completo gera um arquivo que abre no QuickTime ou no CapCut.
24. O take começa a gravar no "3" da contagem e termina 1,5s ± 0,2s depois do fim do último bloco, parando sozinho.
25. Negar a permissão de câmera mostra as instruções da plataforma e o botão "Usar só como prompter", que funciona.
26. Parar antes do fim salva o take como "incompleto", com a indicação do último bloco coberto.
27. Mandar o app para segundo plano no meio do take preserva o vídeo gravado até aquele ponto (gravação em pedaços de 1s) e mostra o aviso da seção 5.3 ao voltar.

### Modo só prompter
28. No modo só prompter, nenhuma permissão de câmera ou microfone é pedida, e o roteiro roda com contagem (3s ou 5s, configurável) e com as mensagens de antes e depois da seção 5.3.

### Revisão, múltiplos takes e regravar bloco
29. Depois de cada take, a revisão abre com o player e com 7 chips de bloco; tocar num chip leva o player ao início daquele bloco com erro ≤ 300ms.
30. É possível ter pelo menos 5 takes do mesmo roteiro, listados com número, tipo (completo ou blocos), duração e estrela.
31. "Regravar bloco 4" mostra na contagem o último trecho do bloco 3 com o rótulo "Antes: (não fale)", grava só o bloco 4 com 1s de margem em cada ponta e salva como `{slug}_b04_t{n}`.
32. Regravar um intervalo (blocos 4–5) funciona do mesmo jeito e gera `{slug}_b04-b05_t{n}`.
33. Apagar um take pede confirmação e libera o espaço (refletido em `storage.estimate()`).

### Ensaio
34. O ensaio roda igual à gravação, sem pedir câmera, com o selo "ENSAIO" e a coluna de edição visível.
35. Num ensaio manual, a tabela de fim mostra o tempo medido de cada bloco ao lado do tempo do roteiro; "Usar meus tempos" substitui os tempos e a nova duração total aparece na revisão de blocos.

### Exportação e persistência
36. No iPhone, "Baixar" abre a folha de compartilhamento com o vídeo, e "Salvar vídeo" coloca o arquivo no rolo da câmera.
37. No computador, "Baixar" salva o arquivo com o nome no padrão `{slug}_{blocos}_t{n}.{mp4|webm}`.
38. Recarregar a página mantém os roteiros recentes e os takes ainda não apagados.
39. O app instalado como PWA abre offline e permite colar, revisar, ensaiar e gravar sem rede.

### Notas de edição, ritmo por bloco e marcadores
40. As notas de edição de cada bloco aparecem no ensaio e na revisão do take (sincronizadas com o player) e **nunca** aparecem na tela durante a gravação.
41. Num take gravado no modo manual, a revisão mostra para cada bloco o tempo real e o desvio em relação ao roteiro com precisão de ±0,2s, e desvios acima de ±0,5s ficam destacados.
42. "Exportar marcadores" de um take completo gera um `.txt` e um `.csv` com 7 linhas (uma por bloco), contendo início e fim em segundos, fala e nota de edição; abrindo o vídeo no CapCut e pulando para o início de cada bloco indicado no arquivo, a fala do bloco começa a até 0,3s desse ponto.
43. Os marcadores de um take de bloco regravado têm tempos relativos ao próprio arquivo do take.

### Qualidade percebida (aceite do usuário)
44. Gravando o roteiro de exemplo, o usuário consegue um take completo que ele mesmo marca como "Ficou bom" em no máximo 3 tentativas, e avalia "Pareceu conversa" com nota ≥ 4.

---

## 9. Inspirações do benchmark

Fonte: `docs/benchmark.md` (pesquisa de 12/11/2026, com URLs). Esta seção lista o que adotamos de cada alternativa e onde isso entra na spec.

### 9.1 O que adotamos de cada ferramenta

| Ferramenta | Ponto positivo | Como entra aqui | Onde | Fase |
|---|---|---|---|---|
| **Instagram (Edits/câmera)** | Texto logo abaixo da câmera frontal por padrão | Valida o P1: faixa no topo, colada na lente, como posição fixa (não arrastável) | P1, 5.1, critério 11 | MVP |
| **Teleprompter Pro** | Modo paginado em vez de rolagem contínua | Generalizado para "um trecho por vez + próximo": nada rola | P2, 5.1/5.2, critério 13 | MVP |
| **Teleprompter.com** | Modo Timed (terminar num tempo-alvo) e palavras por minuto | Aplicado **por bloco**, não ao script inteiro: o relógio de cada bloco vem da coluna "Tempo"; o indicador de palavras/s aparece na revisão de blocos | 3.2, seção 4, critérios 15–16 | MVP |
| **Captions** | Modo cena a cena com regravação de um segmento só | "Um bloco = uma cena": regravar bloco(s) com pré-roll de contexto | 3.8, critérios 31–32 | MVP |
| **Elgato Camera Hub** | Navegação por capítulos com hotkeys e overlay de progresso | Teclas `1`–`9` pulam para o bloco; rodapé "bloco 3/7" e barra do bloco | 5.2, P4 | MVP |
| **Parrot** | Essencial numa tela só: espelho, cor, tamanho | Folha única de configuração da sessão, com espelhar em "Avançado" | 3.3 | MVP |
| **Web grátis (sozai, Teleprompter Mirror)** | Voz pelo reconhecimento nativo do navegador, sem backend | Confirma a arquitetura PWA sem servidor; voz fica como opção futura | 6.1, seção 4 | MVP (sem voz) / fase 2 |
| **PromptSmart (VoiceTrack)** | Reconhecimento no aparelho, offline, que pausa quando você improvisa | Comportamento da voz: nunca dispara o texto, só confirma ou adianta; o relógio segue se a voz falhar. O VAD por volume (MVP+) é a versão barata de "pausar quando parar de falar" | seção 4, R7 | MVP+ / fase 2 |
| **BIGVU** | Script → gravação vertical → legenda num só fluxo | Exportar marcadores agora; legendas .srt e alinhamento com Whisper depois | 3.9, 6.2 | MVP (marcadores) / fase 2 |
| **CapCut** | Escritor de IA no painel do prompter (encurtar/expandir) | "Encurtar frase com IA" no bloco marcado como apertado | 3.2, 6.2 | fase 2 |
| **PromptDog** | Segunda janela de operador | Celular como controle remoto do prompter no computador | 6.2 | fase 2 |
| **Speakflow** | Comandos de voz ("próximo parágrafo") e bookmarks | Comandos de voz ("próximo", "de novo") | 6.2 | fase 3 |
| **Descript / NVIDIA Broadcast** | Eye contact por IA aplicado só onde precisa, ou ao vivo | **Não adotado.** É correção paga depois da gravação, e a própria cobertura fala em "uncanny valley". Nossa aposta é prevenir (P1–P8) em vez de corrigir | — | não |

### 9.2 Lacunas do mercado e como a spec responde

| Lacuna (benchmark §3) | Resposta | Onde |
|---|---|---|
| 1. Ninguém tem tempo por bloco, só a duração total | Relógio por bloco vindo da coluna "Tempo" | M1, M4, seção 4 |
| 2. Ninguém liga notas de edição ao bloco | Notas visíveis no ensaio e na revisão, escondidas na gravação | M13, 3.7, critério 40 |
| 3. Ninguém exporta marcadores de corte | `.txt` + `.csv` com início e fim reais de cada bloco no take | M15, 3.9, critérios 42–43 |
| 4. Ninguém mostra "frase atual + próxima + barra do bloco" | É a tela de gravação | M3, P2, P4 |
| 5. Ninguém dá feedback de ritmo por bloco | Tabela "seu tempo × roteiro" no ensaio e na revisão do take | M11, M14, 3.4, 3.7, critério 41 |
| 6. Voz PT-BR na web não é confirmada por ninguém | Não prometemos voz no MVP; spike antes da fase 2 | seção 4, R7 |
| 7. Ninguém ajuda a decorar antes de gravar | Ensaio no MVP; "modo memorizar" com palavras-chave na fase 2 | 3.4, 6.2 |

### 9.3 Reclamações reais que viraram requisito

- **"VoiceTrack parou de funcionar" / a voz perde a posição no improviso** → a voz nunca é o condutor (seção 4).
- **O remoto exige compra extra (PromptSmart)** → teclado e passador de slides funcionam sem nada extra; o controle de selfie com tecla de volume é avisado como incompatível (R8).
- **"Planos absurdamente caros" (BIGVU)** → sem backend nem assinatura no MVP; tudo roda no aparelho.
- **O cue "não é bem implementado" (Teleprompter Pro)** → cue do próximo bloco especificado em detalhe (P4, critério 20).

### 9.4 Mudanças feitas na spec por causa do benchmark (v0.1 → v0.2)

- MVP ganhou M13 (notas por bloco), M14 (ritmo por bloco) e M15 (marcadores de corte), além da ordem de corte em 6.1.
- Seção 4: a voz passou a ser "confirma ou adianta, nunca conduz", e o VAD por volume entrou como MVP+.
- R2: versão mínima corrigida para iOS 14.5, com MP4 obrigatório antes do 18.4, o bug WebKit 290002 e `isTypeSupported()` em vez de checar versão.
- R7: detalhes de instabilidade do `webkitSpeechRecognition` e `continuous: false` com reinício.
- Fase 2 ganhou Whisper pós-gravação, modo memorizar, encurtar frase com IA e celular como controle remoto.
- Critérios 22 (MP4, iOS 14.5+) e 40–43 (notas, ritmo, marcadores) novos ou ajustados; o aceite do usuário passou a ser o 44.

---

## 10. Questões em aberto

1. Ele grava mais no celular ou no computador? Isso define qual tela recebe o polimento primeiro (sugestão: celular).
2. Vale padronizar o formato de saída da IA de roteiro (ex.: sempre tabela markdown) para simplificar o parser? Mesmo assim, o parser deve aceitar os três formatos.
3. Câmera frontal ou traseira no celular? Com a traseira, o texto não fica perto da lente no mesmo aparelho; nesse caso o modo só prompter num segundo dispositivo é o caminho.
4. O vídeo do computador deve sair em 16:9 (recortado na edição) ou já em 9:16? O MVP assume 16:9 com guia.
