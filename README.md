# Tilt Manager

Jogo de gerenciamento (estilo Brasfoot) do campeonato **CBLOW** de League of Legends (Ferro e Bronze). Times, presidentes e jogadores vêm de [cblow.xyz](https://cblow.xyz); **overall, idade e potencial são gerados** (o site não publica elo/rating), com bônus para os líderes das estatísticas públicas.

```bash
npm install
npm run dev        # desenvolvimento (com painel Admin)
npm test           # vitest: motor, draft, temporadas, telas e teste de estresse
npm run typecheck  # tsc -b (strict)
npm run build      # versão publicável em dist/ (Admin escondido)
npm run preview    # abre o build de produção
```

## Como se joga
1. Escolha um dos 8 times (ou **crie o seu**: nome, sigla, cor, vaga como 9º time ou no lugar de outro, elenco por agentes livres ou jogadores criados).
2. Ajuste escalação (5 posições; improvisar custa 20%), estilo (early/scaling/teamfight), mercado, contratos e finanças.
3. **Jogar** abre o **draft** (janela sobre o confronto): 10 bans e 10 picks no formato profissional, com temporizador, IA no lado adversário, botão **Gerar draft completo** e, no fim, a tela para **definir as posições** (B1…B5 → Topo/Selva/Meio/Atirador/Suporte).
4. A partida é narrada e mostrada num **minimapa** sincronizado com a narração.
5. Fase de classificação (7 rodadas, MD1; 9 com 9 times; turno e returno opcional) + playoffs (semis MD3, final MD5, 3º lugar MD3). Save automático no `localStorage`.

## Admin (somente em desenvolvimento)
Botão **Admin** no topo: configurações (tempo do draft, ritmo da partida, equilíbrio da simulação, formato do campeonato e economia), jogadores (adicionar/editar/remover, posição, time, pé de chumbo, foto), dados e backup (exportar/importar save). No build publicado fica escondido; para publicar com Admin: `VITE_SHOW_ADMIN=true npm run build`.

## Imagens (`public/images/`)
`logo.jpg` (logo) e `minimap.png` (fundo do minimapa; aceita .png/.jpg/.webp).

## Arquitetura
- `src/domain/` — regras puras e testáveis (sem React): `engine` (simulação com cenas para o minimapa), `draft` (ordem profissional, IA, posições), `season` (calendário, playoffs, virada de temporada), `transfers`, `customTeam`, `config`. Estado imutável via **immer**; RNG com semente.
- `src/store/` — **Zustand** + `persist`: jogo, configurações, banco de jogadores do admin, imagens.
- UI: **Tailwind CSS v4** + CSS próprio; paleta preto+cobre inspirada no cblow.xyz; `lucide-react`.
- `src/pages/` com `lazy` + `Suspense`; `ErrorBoundary`; acessibilidade (ARIA, labels, foco).
- Segue as boas práticas da skill `.claude/skills/react-expert` (TypeScript strict, efeitos com limpeza, testes com Testing Library).
- Artes de campeões: Data Dragon (Riot), carregadas da internet.

Documentação da análise do Brasfoot: [`docs/ANALISE_BRASFOOT.md`](docs/ANALISE_BRASFOOT.md).
