/*
 * Optional AI for the agent desks. Off unless OPENROUTER_API_KEY is set on the server (see README). Without it every
 * desk runs its built-in deterministic method and says so (extractive researcher, template writer, rule checklist).
 * The key never reaches the browser. The model only sees the task brief and the sources the user pasted, and is told
 * to answer only from them with [S1]-style references; the reviewer's checklist still runs on whatever it writes.
 *
 * MODEL: default model id; OPENROUTER_MODEL overrides it. Whatever the id, the server reads the provider's price list
 * and refuses to call a model priced above the ceiling below, or at all when the price list cannot be read.
 */
export const AI = {
  endpoint: "https://openrouter.ai/api/v1/chat/completions",
  catalog: "https://openrouter.ai/api/v1/models",
  model: "qwen/qwen3-30b-a3b-instruct-2507",
  /** USD per one million tokens. */
  maxPromptPerMillion: 1,
  maxCompletionPerMillion: 4,
  maxTokens: 700,
  /** Requests per network per 10 minutes. */
  perIpPer10Min: 12,
  /** Site-wide paid calls per hour unless AI_HOURLY_LIMIT says otherwise. */
  defaultHourly: 60,
  timeoutMs: 25_000,
} as const;

/** Limits on what one desk call may carry (characters). */
export const LIMITS = {
  title: 120,
  brief: 1_500,
  sourceLabel: 80,
  sourceText: 12_000,
  sources: 6,
  note: 600,
  draft: 8_000,
} as const;
