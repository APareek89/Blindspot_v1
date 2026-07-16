/** BullMQ queue name for eval runs (worker consumes this). */
export const EVAL_QUEUE = "bs:evals";

/** Default judge model when JUDGE_MODEL is unset (configurable per PRD §11). */
export const DEFAULT_JUDGE_MODEL = "gemini-1.5-flash";

/** Default port the gateway listens on when PORT is unset. */
export const DEFAULT_GATEWAY_PORT = 8787;
