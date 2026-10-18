# Bastion: Capital Preservation Intelligence

An end-to-end prototype of an event-driven portfolio risk platform for institutional and mutual-fund managers. Capital preservation comes before profit: every incoming headline is checked against the book, scored for downside, and pushed to the manager's phone with a fully traceable chain of reasoning.

> All news items, posts and feeds in this prototype are **simulated**. Prices and market caps are illustrative fixtures, not live quotes. Hedge / reduce actions are simulated orders.

## Run it

```bash
cp .env.example .env.local   # add TYPESAFE_API_KEY (and optionally ANTHROPIC_API_KEY)
npm install
npm run dev -- -p 3109       # http://localhost:3109
```

From the workspace root, the launch config is named `bastion`.

| Page | What it shows |
|---|---|
| **Command** `/` | KPIs (NAV, Event VaR, preservation posture), latest event with probability gauge, Jev magnitude distribution, systemic meter, at-risk table with P10–P90 confidence bars, impact trajectory, holdings × events heatmap, book treemap |
| **Portfolio** `/portfolio` | Add from a 40-name universe or define a custom security (Jev classifies its industry domain), edit shares / domain inline, remove. Risk recalculates immediately; open events are re-scored with Jev for new names |
| **Feeds** `/feeds` | 18 sources, Free (3 feeds) vs Enterprise tier simulator, 6 monitoring profiles |
| **Stress Lab** `/stress` | 22 breaking-news presets, a custom-headline composer, "run all" with a scenario league table ranked by expected loss |
| **Trace** `/trace` | The AI Reasoning & Traceability console: raw payload → LLM extraction (step-by-step analysis, entities, dependencies, impact vectors) → screen + JEV classification → raw Jev request/response → risk calculus with every number → push dispatch. "Replay pipeline" animates it |
| **How Jev decides** `/method` | Button-driven six-step walkthrough of one real decision, plus the integration map |
| **Phone dock** (right) | Simulated push alerts with ingest→push latency (SLA < 60 s) and **Hedge Position / Reduce Exposure / Dismiss Alert** actions that change the book |

## Pipeline

```
feed event ─► [00 ingest] ─► [01 LLM extraction] ─► [02 screen + JEV class] ─► [03 Jev scoring] ─► [04 risk calculus] ─► [05 push]
              server         Claude (or fallback)    deterministic              one batched call     client, pure fn      phone dock
```

1. **Ingest.** `src/lib/engine.ts` posts the event and the current book to `POST /api/analyze`.
2. **LLM extraction** (`src/lib/llm/client.ts`). Claude reads the headline and the book and returns JSON: summary, event type, sentiment, horizon, entities, 4–6 auditable analysis steps, first- and second-order sector dependencies, and **impact vectors** expressed in the JEV tag / industry vocabulary.
3. **Screen** (`src/lib/pipeline/screen.ts`). Vectors are matched to holdings: ticker listed, or every specified dimension (sector, industry, country, tags) satisfied. Because vectors target tags rather than names, they also apply to holdings added later.
4. **Jev scoring** (`src/lib/jev/client.ts`). One batched request to TypeSafe System One asks, for every exposed holding: exposure (choice: direct / indirect / peripheral / none), direction (choice: down / flat / up) and magnitude (score over 5 move buckets), plus two portfolio-level questions: systemic spread (score) and follow-through (noul). Typical cost is a few thousand input tokens (~$0.0002) and ~100–300 ms.
5. **Risk calculus** (`src/lib/pipeline/calculus.ts`, pure and shared):
   - exposure weight `w = P(direct)·1 + P(indirect)·0.6 + P(peripheral)·0.25`
   - event factor `f = 0.45 + 0.55·(½·source reliability + ½·follow-through)`
   - **probability** `= P(direction) · (0.4 + 0.6·w) · f`. Jev overrules the LLM's direction when it is ≥ 15 pts more confident in the opposite one
   - **range** = P25–P75 and **CI** = P10–P90 of the Jev magnitude distribution (piecewise uniform over buckets)
   - **expected loss** `= position · E[move] · probability · (1 − hedge ratio)`
   - **threat**: CRITICAL if p ≥ 65% and E ≥ 4.5%, or loss ≥ 0.35% NAV; ELEVATED if p ≥ 50% and E ≥ 2.5%, or ≥ 0.15% NAV; GUARDED if p ≥ 30% and E ≥ 1.2%; UPSIDE for likely up-moves (fluctuation risk)
   - **Event VaR** sums each holding's worst live residual loss (live events decay linearly over 20 min as they get priced in; stress tests never touch the live book). **Posture** `= 100·exp(−0.8 · VaR%NAV / drawdown budget)`, so the 1.5% budget maps to ~45.
6. **Dispatch.** An alert is pushed to the phone dock after a simulated APNs/FCM hop; the trace records ingest→push latency.

## JEV classification

`src/lib/jev/classify.ts` + `src/lib/data/taxonomy.ts`. Code format `JEV-{L|M|S}-{SECTOR.INDUSTRY}`, e.g. `JEV-L-SEMI.FBLS` (large-cap fabless semiconductors).

- Cap tiers: Large > $10B, Mid $2–10B, Small < $2B
- 8 sectors / 30 industry domains, including Semiconductors (foundry, fabless, equipment, memory, IDM), Healthcare, Minerals (lithium, rare earths, copper, iron ore, uranium, gold), Quantum Computing, Government Contractors (defense, federal IT, space, defense software), Energy, Technology and Financials
- Region DM / EM from listing country; exchanges include NASDAQ, NYSE, TWSE, KRX, NSE, B3, ASX, XETRA, Euronext
- Custom securities are classified live by Jev (`POST /api/classify`, one choice question over all 30 domains)

## Integration points

### Cloud LLM: Anthropic Messages API

| | |
|---|---|
| Code | `src/lib/llm/client.ts` (official `@anthropic-ai/sdk`) |
| Env | `ANTHROPIC_API_KEY`, `LLM_MODEL` (default `claude-haiku-5-5`) |
| Call | `client.messages.create` with thinking disabled and effort `low` (demo setting: fastest and cheapest), and a cached system prompt holding the tag vocabulary |
| Output | JSON → `sanitizeExtraction()` → `Extraction` (`src/lib/types.ts`) |
| Fallback | Curated fixture on each preset (`src/lib/data/events.ts`); keyword heuristic for custom headlines (`src/lib/llm/heuristic.ts`). The trace shows which mode ran and why |

Status is exposed at `GET /api/status` and as the LLM / JEV pills in the top bar.

### Jev model API: TypeSafe System One

| | |
|---|---|
| Code | `src/lib/jev/client.ts` |
| Env | `TYPESAFE_API_KEY`, `JEV_API_URL` (default `https://api.typesafe.ai/v1/systemone`), `JEV_MODEL` (default `jev-latest`) |
| Request | `{ model, state: string, questions: { [id]: { type: "choice" \| "score" \| "noul", instructions, criteria? } } }`. choice criteria are `{option: description}`; score criteria are an ordered list |
| Response | `answers[id]`: choice → `{choice, confidence, probabilities}`; score → `{score, probabilities{"0".."n"}}`; noul → `{noul}`; plus `usage.input_tokens` |
| Fallback | `src/lib/jev/fallback.ts`: deterministic answers in the same shape |

### Feed connectors

Feeds are defined in `src/lib/data/feeds.ts`; the simulated stream lives in `src/components/shell/Shell.tsx` (`useLiveStream`). To connect a real source, produce `NewsEvent` objects (`{id, feedId, headline, body, author?}`) from a webhook or poller and call `POST /api/analyze` with the book, or call `fireEvent()` on the client. No other code changes are needed.

### Server API

| Route | Body | Returns |
|---|---|---|
| `POST /api/analyze` | `{uid, receivedAt, event, holdings, llmMode?}` | `Trace`: stages with timings, LLM result, screen hits, Jev result |
| `POST /api/rescore` | `{event, extraction, holdings}` | `{screened, screenedOut, jev}` (re-uses a cached extraction) |
| `POST /api/classify` | `{name, description}` | ranked industry domains with Jev probabilities |
| `GET /api/status` | | LLM and Jev availability |

## Code map

```
src/lib/types.ts            domain types
src/lib/data/               taxonomy, 40-security universe + default book, 18 feeds, 22 event presets
src/lib/llm/                Claude client, sanitiser, offline heuristic
src/lib/jev/                Jev client, fallback, JEV classifier
src/lib/pipeline/           server orchestration (run.ts), screen, calculus
src/lib/store.ts            zustand store (persisted to localStorage)
src/lib/engine.ts           client orchestration, alerts, re-scoring
src/lib/risk.ts             book aggregation (Event VaR, posture)
src/components/             shell, phone dock, charts, dashboard pieces
src/app/                    pages + API routes
```

State persists in the browser; **Portfolio → Reset demo** clears it.
