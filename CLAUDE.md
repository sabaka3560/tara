# CLAUDE.md — Tara (AI Wardrobe App)

## Required Reading Before Any Work
- `GUARDRAILS.md` — code standards, file limits, naming, helper functions
- `CONTRACTS.md` — shared types, API contracts, file ownership
- `PHASES.md` — what phase we're in, what tests must pass
- `ARCHITECTURE.md` — full tech stack decisions

---

## Agentic System — Claude Code Only
No LangGraph. No external orchestration framework. Agents are Claude Code subagents
spawned with `isolation: "worktree"`. Each worktree is a git branch. Progress tracked
in `agents/PROGRESS-*.md`. Conflicts prevented by file ownership in CONTRACTS.md.

## Skills Installed (`.claude/skills/`)
```
react-native/skills/react-native-best-practices   Performance, FlashList, Reanimated
react-native/skills/react-native-brownfield-*     Migration patterns
hub/engineering/karpathy-coder                    Clean code, think before typing
hub/engineering/llm-cost-optimizer                Prompt caching, token reduction
hub/engineering/chaos-engineering                 Resilience patterns
hub/engineering/agenthub                          Multi-agent coordination
anthropic/skills/claude-api                       Anthropic SDK, prompt caching
anthropic/skills/frontend-design                  UI component patterns
anthropic/skills/webapp-testing                   Test patterns
```

## How to Invoke Skills
Type the skill path or name when starting a task. Example:
"Using react-native-best-practices skill, build the wardrobe grid component"

---

## Who You Are Working With
This is a greenfield AI-native application. The developer thinks in systems and wants Claude to reason like a senior architect — not guess, not fill gaps with intuition, not jump to implementation. When in doubt: stop, surface the ambiguity, choose the right path together.

---

## Thinking Protocol (Non-Negotiable)

Before writing a single line of code, Claude must:

1. **Restate the problem** in one sentence. If you cannot, ask.
2. **Identify what is unknown** — missing requirements, unclear interfaces, ambiguous data shapes.
3. **Enumerate options** — at least 2 design choices with explicit trade-offs.
4. **Declare the chosen path and why** — not "this seems good" but "this is better because X given constraint Y."
5. **Break into discrete steps** — numbered, ordered, no compound steps.
6. **Then implement** — one step at a time, verify before moving to the next.

**Never skip to step 6.** This is the most common failure mode.

---

## Decision-Making Rules

- **Ask, don't assume.** If a requirement is ambiguous, surface it. One clarifying question beats three wrong implementations.
- **Smallest viable change.** Solve exactly what was asked. No speculative abstractions, no "while I'm in here" changes.
- **Explicit over implicit.** Name things precisely. Avoid generic names (`data`, `result`, `handler`, `util`).
- **Interfaces before implementations.** Define types/contracts/schemas before writing logic.
- **Reversible before irreversible.** Prefer designs you can change. Flag decisions that are hard to undo.

---

## Architecture Principles

- AI is the core, not a feature. Every design decision should optimize for AI capability exposure.
- Own the orchestration layer. Models are interchangeable; the agent loop, memory, and tool contracts are the moat.
- MCP-first tool design. Any capability worth building is worth exposing as an MCP tool.
- Context is infrastructure. Memory (short-term, long-term, episodic) is as important as the model choice.
- Eval-driven development. No agent feature ships without an eval harness measuring it.

---

## Tech Stack Decisions (Locked)

| Layer | Choice | Reason |
|---|---|---|
| Orchestration | LangGraph | Stateful agent loops, cycle support |
| Model | Claude Sonnet 4.6 (default) | Best reasoning/cost, tool use, MCP native |
| Vector DB | pgvector (Supabase) | Postgres-first, no extra infra |
| Backend | Python + FastAPI | LLM ecosystem, async streaming |
| Frontend | Next.js 15 + Vercel AI SDK | Streaming UI, RSC, tool call rendering |
| Auth + DB | Supabase | Single infra for auth, postgres, storage |
| MCP Server | Python MCP SDK | Standard tool exposure |
| Evals | Braintrust | Agent trace evaluation |

Do not introduce new dependencies without documenting the reason here.

---

## Code Conventions

- No comments explaining WHAT. Only WHY (hidden constraint, non-obvious invariant, workaround).
- Types first. Define Pydantic models / TypeScript interfaces before implementation.
- No fallbacks for impossible states. Trust internal guarantees; only validate at system boundaries.
- Streaming by default for all LLM responses.
- Tool schemas must be explicit — no `Any` types in MCP tool definitions.
- Tests required for: agent tool calls, MCP server endpoints, memory read/write paths.

---

## Agent Development Rules

- Every agent has: a **goal**, **tools**, **memory config**, and **eval set** — defined before coding.
- Tool calls must be idempotent where possible. Document when they are not.
- Always handle: model refusal, tool error, context overflow, partial output.
- Long-horizon agents (>10 steps) require explicit state checkpointing.
- Never silently swallow tool errors. Surface them to the agent loop.

---

## What Claude Should NOT Do

- Do not add error handling for scenarios that cannot happen.
- Do not suggest "we could also..." unless asked to explore options.
- Do not write migration guides, changelogs, or backward-compat shims.
- Do not add logging "just in case" — add it when there is a specific observability need.
- Do not refactor surrounding code when fixing a bug.
- Do not create new files when editing an existing one solves the problem.

---

## When Stuck or Uncertain

Say: **"I need to clarify X before proceeding. My options are A or B — which fits your intent?"**

Do not proceed with a guess. The cost of one wrong architectural decision exceeds the cost of one clarifying question.
