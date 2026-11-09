# Análise do Brasfoot — Documentação de referência

> **Leia primeiro: nível de evidência.** Não houve acesso a uma versão executável do jogo nesta análise, e a web tem pouca documentação técnica sobre ele (o site oficial não tem manual/FAQ; os endereços testados retornaram 404). Por isso cada afirmação traz uma etiqueta:
>
> - **[C]** Confirmado em fonte lida (site oficial ou Wikipédia pt-BR) — fontes no fim.
> - **[P]** Conhecimento prévio do gênero/jogo, **não verificado** nesta sessão. Tratar como ponto a validar jogando.
> - **[H]** Hipótese de implementação ou de projeto. Pode estar errada.
> - **[?]** Lacuna: não se sabe; precisa de teste direto no jogo.
>
> Nada nas seções de mecânica interna (fórmulas de partida, evolução, IA) foi confirmado. Elas estão como perguntas a investigar e hipóteses de modelagem.

---

## 1. Visão geral

| Item | Informação | Etiqueta |
|---|---|---|
| Gênero | Simulador de gerenciamento de futebol (técnico + manager) | [C] |
| Origem | Lançado em 2003 ("Brasfoot 2003"), inspirado no português **Elifoot**, "com maior jogabilidade" | [C] |
| Criador | Gustavo Gross (fontes secundárias; não confirmado na Wikipédia lida) | [P] |
| Última versão oficial | **22-23** (site oficial). O site afirma que **não existe "Brasfoot 2026"** e alerta para golpes | [C] |
| Plataformas | Windows e Android; PC exige Java; instalador ~17 MB | [C] |
| Modelo | Desde 2025 o PC é freeware; registro gratuito (público no site) | [C] |
| Interface | Descrita como "primariamente textual, sem gráficos e animações" (Wikipédia); o site fala em "visual simples, porém moderno" | [C] (divergentes) |
| Demo | Começa na 4ª divisão, só copa e nacional do Brasil ou Espanha; sem improvisar posição dentro do setor | [C] |
| Pro/Tech/mobile | Nenhuma fonte lida cita essas edições | [?] |

**Essência do jogo [C]:** você é técnico e manager; compra e vende jogadores, escala o time, define tática e estratégia, controla preço de ingresso, disputa campeonatos nacionais, estaduais, regionais, continentais e mundiais, pode ser chamado para uma seleção, e há ranking de técnicos e de clubes. O jogo é leve e roda em qualquer PC.

**Por que funciona [P/H]:** ciclo curto (escalar → jogar → resultado → mercado), baixíssima barreira de entrada, enorme conteúdo (todas as ligas) e editor aberto à comunidade. A profundidade vem do volume de decisões simples, não de simulação visual.

---

## 2. Interface e navegação

**Confirmado:** interface textual/tabular; existem telas de "Galeria de troféus" e "Configurações das ligas" (legendas no site); existe um **editor de times** separado, com busca de jogadores (2013) e novo design (2016) [C].

**Telas esperadas [P — validar no jogo]:**

| Tela | Finalidade provável |
|---|---|
| Início / seleção de clube e liga | Escolher país, divisão e clube; nome do técnico, nacionalidade [C: nacionalidade do técnico desde 2012] |
| Menu principal da carreira | Hub: elenco, tática, mercado, finanças, calendário, tabelas |
| Elenco / jogadores | Lista com posição, idade, força, características, contrato, salário, lesão/suspensão |
| Escalação e tática | Escolher titulares, reservas (banco aumentou na 22-23 [C]), formação, improvisar posições [C] |
| Partida | Placar, lances em texto, substituições durante o jogo (mais substituições na 22-23 [C]) |
| Mercado de transferências | Comprar/vender, negociar direitos, numeração e salário [C] |
| Finanças / estádio | Preço de ingressos, ampliar estádio, sócio-torcedor [C] |
| Campeonatos / tabelas / artilharia | Classificação, calendário, artilheiros (premiação ao clube em alguns campeonatos [C]) |
| Categoria de base (Sub-21) | [C desde 2015] |
| Ranking de técnicos/clubes/seleções | [C] |
| Galeria de troféus / histórico | [C] |
| Configurações das ligas | Formato de campeonatos [C] |
| Time da semana/ano, Bola de Ouro | [C desde 2012] |

**Fluxo de navegação [H]:** hub central → submenus → botão "próxima partida/rodada" que avança o calendário. Mapa conceitual em §7.

**Avaliação UI/UX [P/H]:** pontos fortes — densidade de informação, poucos cliques, roda em hardware fraco. Fracos — visual datado, pouca visualização de dados, sem feedback visual da partida, curva de aprendizado implícita (sem tutorial confirmado), a versão removeu suporte a monitores < 1024x768 em 2016 [C], o que indica layout de resolução fixa/pequena.

---

## 3. Funcionalidades e mecânicas

### 3.1 Jogadores e força
- Cada jogador tem um **valor de força** que **tende a cair com a idade** [C].
- Até **duas características principais** entre **dez possíveis** [C] (a lista das dez não foi encontrada [?]).
- Desde 2018: novo sistema de força com **técnica, passe, velocidade**, e escolha de **foco de treino de habilidades** [C].
- Posições e "improvisar" jogadores fora de posição [C]; penalidade exata [?].
- Evolução/regressão por idade: apenas a queda com idade é confirmada; curva, aleatoriedade, treino e jovens da base [?]. *Hipótese de modelagem:* progressão por faixa etária + ruído + efeito de treino.

### 3.2 Escalação, formação e tática
- Escalar, "formular táticas", improvisar [C]. Quantidade de formações, estratégias e seus efeitos [?].
- *Hipótese:* a força efetiva do time é função de força dos jogadores por setor × encaixe de posição × estratégia. (Em engenharia reversa do Elifoot 98, jogo da família, a simulação usa força por setor e mando de campo assimétrico via números aleatórios — **não prova nada sobre o Brasfoot** [H].)

### 3.3 Simulação de partidas
- Confirmado apenas: produz placar, com substituições; relato textual [C/P].
- **Algoritmo: desconhecido [?].** Perguntas a testar: o resultado depende só de força agregada por setor? Há mando de campo? Motivação/moral? Sorteio por lance ou por partida? Prorrogação e pênaltis em mata-mata?
- *Hipótese de implementação:* loop de N "lances"; em cada um sorteia-se posse/criação comparando força de meio/ataque vs defesa, depois finalização vs goleiro, com bônus de mando.

### 3.4 Campeonatos, copas e temporadas [C]
- Nacionais, estaduais (configuráveis, 2015), regionais, continentais, mundiais; seleções.
- Copa do Brasil 64 times (2013) → 128 (2016); Libertadores e Liga dos Campeões desde a 1ª temporada (2013); Sul-Americana mata-mata (2012); ligas africana e asiática (2014); grupos reais da Copa 2014; amistosos com seleções (2017).
- 22-23: novas fórmulas internacionais e nacionais, **Liga das Nações**, **eliminatórias com todos os países**, **torneios amistosos**, rebaixamento com playoffs, ranking de seleções, novos limites de elenco.
- Ranking único baseado no ranking da CBF (2016); ranking por reputação (2012).
- Geração de calendário: algoritmo [?]. *Hipótese:* round-robin (método do círculo) + datas fixas por competição em um calendário anual.

### 3.5 Transferências e contratos
- Comprar/vender, negociar direitos, numeração e salário [C]. "Top Mundial" para jogadores famosos [C, 2016].
- Regras de preço, contraproposta, multa, duração de contrato, empréstimo, janelas [?].

### 3.6 Finanças
- Preço de ingressos, ampliação de estádio, salários [C]. Sócio-torcedor desde 2015; valor varia com divisão e reputação do clube [C].
- Renda por jogo, premiações por colocação, patrocínio, falência/demissão por dívida [?].

### 3.7 Carreira do técnico
- Bons resultados atraem clubes melhores; maus resultados levam à demissão e a clubes piores [C]. Convocação para seleção [C].

### 3.8 Lesões, suspensões, eventos, notícias
- Não há confirmação em nenhuma fonte lida [?]. *[P]* o jogo tem lesões e suspensões por cartões; validar. Notícias/eventos narrativos: não confirmados.

### 3.9 Estatísticas e histórico
- Artilharia, ranking, galeria de troféus, time da semana/ano, Bola de Ouro [C]. Profundidade do histórico por temporada [?].

### 3.10 IA dos clubes
- Nada confirmado [?]. *Hipótese:* IA escala os melhores por posição, vende/compra para manter elenco no limite, sem simular orçamento detalhado. Testar: IA faz propostas pelos seus jogadores? Paga salários realistas?

### 3.11 Editor e comunidade [C]
- Editor aberto cria/edita/exclui times; gerador de nomes aleatórios; sites "Vício Brasfoot" e "Alternative Brasfoot". Mods e pacotes de dados são parte central do ecossistema.

### 3.12 Salvamento e estrutura técnica
- Nada confirmado sobre formato; o jogo exige **Java** [C], logo é aplicação Java desktop.
- *Hipótese [H]:* dados de times em arquivos próprios (editor lê/grava), saves como serialização do estado da carreira (clubes, jogadores, competições, calendário, finanças, histórico).

---

## 4. Relação entre sistemas

```
Liga/Competição ──contém──> Rodada ──contém──> Partida ──entre──> Clube x Clube
Clube ──tem──> Elenco(Jogador*) ──tem──> Contrato(salário, duração)
Clube ──tem──> Finanças (caixa, ingressos, sócios, estádio)
Partida ──usa──> Escalação + Tática + Força dos jogadores ──gera──> Placar, Gols, Lesões, Cartões
Resultado ──alimenta──> Tabela, Artilharia, Premiação, Ranking, Reputação, Carreira do técnico
Reputação/Divisão ──afeta──> Sócio-torcedor, Renda, Ofertas de emprego
Idade/Treino ──afeta──> Força ──afeta──> Valor de mercado ──afeta──> Transferências
Fim de temporada ──dispara──> Promoção/rebaixamento, evolução de jogadores, renovações, novo calendário
```
[H — organização conceitual coerente com o que foi confirmado, não com o código.]

## 5. Mapa de navegação (conceitual) [H]

```
Menu inicial ─> Novo jogo / Carregar / Editor de times / Configurações
Novo jogo ─> País ─> Liga/Divisão ─> Clube ─> HUB DA CARREIRA
HUB ─┬─ Elenco ─> Detalhe do jogador
     ├─ Escalação/Tática
     ├─ Mercado ─> Negociação
     ├─ Finanças/Estádio/Ingressos
     ├─ Campeonatos ─> Tabela / Jogos / Artilharia
     ├─ Base (Sub-21)
     ├─ Rankings / Troféus / Histórico
     └─ Jogar próxima partida ─> Tela de partida ─> Resultado ─> HUB
```

## 6. Modelo conceitual de dados (proposta, não extraído do jogo) [H]

- **Pais**(id, nome, ranking)
- **Competicao**(id, pais?, tipo[liga|copa|continental|selecoes], formato, regras_rebaixamento)
- **Temporada**(id, ano) · **Edicao**(competicao, temporada)
- **Clube**(id, nome, pais, divisao, reputacao, caixa, preco_ingresso, capacidade, socios)
- **Jogador**(id, nome, nascimento, nacionalidade, posicao, forca{tecnica,passe,velocidade,geral}, caracteristicas[0..2], clube, valor)
- **Contrato**(jogador, clube, salario, fim, numero)
- **Partida**(id, edicao, rodada, mandante, visitante, placar, eventos[])
- **Evento**(partida, minuto, tipo[gol|cartao|lesao|subst], jogador)
- **Escalacao**(partida, clube, formacao, estrategia, titulares[], banco[])
- **Transferencia**(jogador, origem, destino, valor, data)
- **Tecnico**(id, nome, nacionalidade, reputacao, clube_atual, historico[])
- **Ranking / Premio / Noticia**

## 7. Fluxos principais [H]

1. **Temporada:** gerar calendário → loop de datas (jogar partidas do dia de todas as competições) → atualizar tabelas → fim: premiar, promover/rebaixar, envelhecer/evoluir jogadores, renovar/expirar contratos, atualizar rankings → nova temporada.
2. **Dia de jogo:** IA monta escalações dos outros clubes → usuário escala → simula todas as partidas → aplica lesões/cartões → receita de bilheteria → resultado na tela.
3. **Transferência:** buscar jogador → proposta → resposta (regra [?]) → atualizar contrato, caixa e elenco, respeitando limite de elenco [C: "novos limites de elenco"].
4. **Carreira:** fim de temporada avalia desempenho → ofertas/demissão [C].

## 8. Lista de funcionalidades existentes (confirmadas [C])

Gestão de clube; compra/venda de jogadores; escalação, tática, improvisação de posições; preço de ingresso; ampliar estádio; direitos, numeração e salário; sócio-torcedor; categoria de base Sub-21; campeonatos nacionais/estaduais/regionais/continentais/mundiais; Copa do Brasil (128), Libertadores, Liga dos Campeões, Sul-Americana, Liga das Nações, eliminatórias, amistosos, ligas da África e Ásia; seleções (convocação do técnico); rankings de técnicos, clubes e seleções; troféus; artilheiros com premiação; time da semana/ano e Bola de Ouro; ex-jogadores viram treinadores; nacionalidade do técnico; uniformes reserva e terceiro; força com técnica/passe/velocidade e foco de treino; duas características por jogador; idade reduz força; editor de times; gerador de nomes; demissão e troca de clube; mais reservas e substituições; rebaixamento com playoffs.

## 9. Avaliação

**Pontos fortes [C/P]:** escopo enorme de competições reais e fictícias, leveza, gratuito, editor/comunidade, loop viciante. **Fracos [P/H]:** interface textual/datada, sem simulação visual, opacidade das regras (nem o site as documenta), pouca profundidade tática percebida, uma única plataforma desktop com Java, ausência de multiplayer/online confirmado.

**Preservar:** rapidez do ciclo, escopo de ligas, editor aberto e comunidade, sensação de "um clique a mais e já é a próxima rodada", simplicidade de entrada.

**Modernizar:** UI responsiva e acessível (web/mobile), visualização da partida (campo 2D, heatmaps), tutoriais e explicação das regras, relatórios de scouting, dados comparativos/gráficos, saves na nuvem, tema escuro, internacionalização, modding por pacotes de dados versionados.

**Adicionar:** staff técnico, treino por atributo, olheiros/scouting, empréstimos, cláusulas contratuais, negociação mais rica, lesões com recuperação detalhada, entrevistas/notícias, objetivos da diretoria, multiplayer assíncrono/ligas online, fair play financeiro.

## 10. Proposta de evolução (versão moderna)

1. **Núcleo determinístico:** motor de simulação separado da UI, com seed e testes; começar com modelo simples de força por setor e mando (hipótese §3.3) e calibrar contra estatísticas reais.
2. **Dados:** formato aberto (JSON/SQLite) para ligas/times, compatível com importação do que o editor do Brasfoot exportar (investigar formato [?]).
3. **MVP:** 1 liga com divisões, escalação/tática, mercado básico, finanças, calendário, save/load.
4. **Fase 2:** copas, continentais, seleções, base, evolução por idade/treino, IA de mercado.
5. **Fase 3:** visual de partida, notícias, scouting, mods, online.
6. Princípio de design: **toda regra exposta e explicável na UI** (o maior déficit do original).

## 11. Próximos passos para fechar as lacunas [?]

Instalar o Brasfoot 22-23 (instalador gratuito, requer Java) e documentar: lista das 10 características; formações/estratégias; efeito de moral e mando; regras de transferência e contrato; lesões e cartões; evolução por idade; estrutura de arquivos de save e do editor; comportamento da IA. Posso conduzir essa investigação se o jogo for instalado nesta máquina.

---

## Fontes consultadas
- Site oficial: brasfoot.com (home, "o-brasfoot-2022-2023", download, registro)
- pt.wikipedia.org/wiki/Brasfoot (fonte principal do histórico e das mecânicas)
- Lutris: lutris.net/games/brasfoot (descrição geral)
- Artigo de engenharia reversa do Elifoot 98 (tabnews) e matéria do Browserfoot (criticalhits) — **jogos diferentes, usados apenas como analogia [H]**
- A busca por fóruns, tutoriais e vídeos retornou quase só spam/SEO; nada de confiável foi aproveitado dali.
