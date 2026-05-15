# DESIGN.md — AI-Native Application

## Vision

Build an AI-native product where AI is the product — not a feature bolted on. The moat is the orchestration layer, proprietary tool/data exposure via MCP, and memory architecture. Models are commodities; everything around them is the business.

---

## Major Problems to Solve (Prioritized)

### 1. Agent Memory & Context Degradation
**Problem:** Agents become unreliable over long task horizons (>10 steps). Context degrades, goals drift, earlier decisions are forgotten.

**Why it matters:** Every useful agent task is long-horizon. Short agents are demos.

**Solution space:**
- Short-term: in-context window (managed sliding window)
- Long-term: vector DB retrieval (semantic search over history)
- Episodic: structured summaries of past sessions
- Working memory: explicit state object passed through agent loop

**Decision:** Use `mem0` + pgvector as the memory layer. LangGraph manages in-context state. Episodic summaries written to Supabase after session end.

---

### 2. Tool Reliability (MCP Contract Stability)
**Problem:** Tool schemas drift, parameters change, models hallucinate tool arguments. Silent failures break agent loops.

**Why it matters:** A 95% reliable tool in a 20-step chain = 36% chance of task failure.

**Solution space:**
- Strict Pydantic schemas for all tool inputs/outputs
- Tool call validation layer before execution
- Idempotent tool design where possible
- Structured error responses (not exceptions) fed back to the agent

**Decision:** Every MCP tool returns `{success: bool, data: ..., error: str | null}`. Agent loop handles error routing explicitly.

---

### 3. Evaluation Harness (Agents Are Hard to Test)
**Problem:** Unit tests don't catch agent failures. Agents fail in emergent, trajectory-dependent ways.

**Why it matters:** Without evals, you cannot ship agent features confidently or measure regression.

**Solution space:**
- Trace-level eval (did the agent take the right steps?)
- Output-level eval (is the final output correct?)
- Regression suite over golden trajectories

**Decision:** Braintrust for eval logging. Every agent feature ships with: 1 happy path eval, 1 failure/recovery eval, 1 edge case eval.

---

### 4. Multi-Agent Coordination & Intent Alignment
**Problem:** When multiple agents collaborate, collective behavior can diverge from the original human intent. Failure attribution is hard.

**Why it matters:** Most production agentic workflows eventually need >1 agent.

**Solution space:**
- Central orchestrator pattern (one planner, many executors)
- Shared goal state passed explicitly between agents
- Per-agent audit logs tied to the originating human request

**Decision:** LangGraph multi-agent with explicit shared state schema. Each sub-agent receives a `task_context` object with origin intent, constraints, and escalation path.

---

### 5. Model Provider Lock-in
**Problem:** Hardcoding to one LLM API creates cost risk, vendor risk, and capability ceiling.

**Why it matters:** GPT-4 pricing changed 3x in 2024. Claude pricing shifted too. You need flexibility.

**Solution space:**
- Provider abstraction layer (LiteLLM)
- Capability-based routing (use cheapest model that can handle the task)
- Fallback chains (primary → fallback → local)

**Decision:** LiteLLM as the model router. Claude Sonnet 4.6 as primary. GPT-4.1 mini as cost fallback. Ollama (Llama 3.3) for local/offline tasks.

---

### 6. MCP as Distribution Strategy
**Problem:** Building integrations one-by-one to each AI platform (Claude, ChatGPT, Gemini, Cursor) is unsustainable.

**Why it matters:** MCP is now supported by all major AI clients. One server = universal distribution.

**Architecture:**
```
Proprietary Data / Tools
        ↓
   MCP Server (Python)
    ├── tool: query_knowledge_base
    ├── tool: execute_action
    ├── tool: get_user_context
    └── tool: write_memory
        ↓
Any MCP Client: Claude / ChatGPT / Cursor / VS Code
```

**Decision:** MCP server is a first-class product artifact. Built and versioned independently. Exposed publicly with auth.

---

### 7. Cost & Latency at Scale
**Problem:** LLM token costs grow linearly with usage. RAG + tool calls + memory retrieval stack latency.

**Why it matters:** A useful agent might do 50 LLM calls per user session. At GPT-4 pricing, that's $0.50–$2 per session.

**Solution space:**
- Prompt caching (Anthropic + OpenAI both support it)
- Smart model routing (use small model for classification/routing, large for reasoning)
- Response streaming (perceived latency fix)
- Async tool execution where order doesn't matter

**Decision:** Implement Anthropic prompt caching from day one on all system prompts. Route classification tasks to Haiku 4.5. Stream all responses.

---

## Architecture Diagram

```
User (Web / API)
      ↓
  Next.js Frontend (streaming UI)
      ↓
  FastAPI Backend
      ├── Agent Orchestrator (LangGraph)
      │     ├── Planner Agent
      │     ├── Executor Agents (n)
      │     └── Memory Manager
      ├── MCP Server (tool exposure)
      ├── RAG Pipeline (LlamaIndex + pgvector)
      └── Model Router (LiteLLM)
             ├── Claude Sonnet 4.6
             ├── GPT-4.1 mini
             └── Llama 3.3 (local)

Persistence:
  Supabase (postgres + pgvector + auth + storage)
  Redis (agent working state, cache)

Observability:
  Braintrust (evals + traces)
  LangSmith (agent step logging)
```

---

## What We Are NOT Building

- A vertical AI product (industry-specific, narrow use case)
- A GPT wrapper with a chat UI
- A no-code automation tool
- Anything that requires a proprietary model from scratch

---

## Open Questions (Must Resolve Before Building)

- [ ] What is the primary use case / domain the agent addresses?
- [ ] Who is the user — developer, knowledge worker, business user?
- [ ] What proprietary data or tools do we own that create the moat?
- [ ] Is this B2B (MCP server as product) or B2C (agent as product)?
- [ ] Self-hosted or cloud-first?
