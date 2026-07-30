export const AI_PROMPT_VERSION="social-draft-v1";
export function aiConfiguration(){return{enabled:process.env.AI_ENHANCEMENT_ENABLED==="true",provider:process.env.AI_PROVIDER??"openai",
model:process.env.OPENAI_MODEL??"gpt-4o-mini",timeoutMs:Math.max(1000,Math.min(Number(process.env.AI_REQUEST_TIMEOUT_MS??15000),60000)),
maxConcurrency:Math.max(1,Math.min(Number(process.env.AI_MAX_CONCURRENCY??3),10)),
globalBudget:Math.max(0,Number(process.env.AI_GLOBAL_MONTHLY_BUDGET_MINOR_UNITS??100000))};}
export function modelBackedAiAvailable(){const config=aiConfiguration();return config.enabled&&config.provider==="openai"&&Boolean(process.env.OPENAI_API_KEY);}
