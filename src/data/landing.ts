export const metrics = [
  { value: "6", label: "Core services" },
  { value: "3", label: "Market data domains" },
  { value: "24/7", label: "Task orchestration" },
];

export const coreModules = [
  {
    title: "Domestic Stock Service",
    description: "A-share master data, search, and daily bar queries with clean REST access.",
    tag: "Stock",
  },
  {
    title: "Domestic Fund Service",
    description: "Fund profiles, NAV history, holdings snapshots, and keyword discovery.",
    tag: "Fund",
  },
  {
    title: "Domestic Index Service",
    description: "Index constituents, weights, and daily market data for benchmarks.",
    tag: "Index",
  },
  {
    title: "Portfolio Service",
    description: "Create portfolios, manage holdings, record trades, and compute core metrics.",
    tag: "Portfolio",
  },
  {
    title: "Data Fetch Service",
    description: "Synchronous and Kafka-orchestrated async fetching for reliable coverage.",
    tag: "Ingestion",
  },
  {
    title: "Unified API Gateway",
    description: "Single entry point with routing to microservices, ready for agent tools.",
    tag: "Gateway",
  },
];

export const visionPoints = [
  {
    title: "Natural-language portfolio questions",
    description:
      "Handle high-concurrency questions like \"How did my portfolio perform today?\" with instant metrics.",
  },
  {
    title: "Professional-grade analysis prompts",
    description:
      "Support complex instructions like \"Compare alpha vs HS300 last month\" with tool calls.",
  },
  {
    title: "Agentic planning + tool orchestration",
    description:
      "Use Spring AI + LangChain4j to plan tasks, invoke services, and assemble narratives.",
  },
  {
    title: "RAG-ready knowledge layer",
    description:
      "pgvector-backed retrieval keeps market context and portfolio metadata in reach.",
  },
];

export const stackHighlights = [
  "Spring Boot 3.x + Apache Dubbo",
  "Kafka (KRaft) task scheduling",
  "PostgreSQL + Redis caches",
  "Spring AI + LangChain4j",
  "pgvector for retrieval",
];

export const agentWorkflow = [
  {
    step: "Interpret",
    detail: "Intent parsing + guardrails to keep queries safe and focused.",
  },
  {
    step: "Plan",
    detail: "Break tasks into service calls across portfolio and market data.",
  },
  {
    step: "Execute",
    detail: "Invoke tools, aggregate data, and log traceable decisions.",
  },
  {
    step: "Explain",
    detail: "Return clean summaries with charts-ready metrics and context.",
  },
];
