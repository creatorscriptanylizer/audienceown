import"server-only";import OpenAI from"openai";import{aiConfiguration,AI_PROMPT_VERSION}from"../configuration";
import{AiEnhancementError}from"../errors";import{buildEnhancementPrompt}from"../prompts";import{validateEnhancedOutput}from"../schemas";
import type{AiProviderAdapter,DraftEnhancementInput}from"../types";
const outputSchema={type:"object",additionalProperties:false,required:["variants"],properties:{variants:{type:"array",items:{type:"object",
additionalProperties:false,required:["variantType","title","body","callToAction","sourceUrl"],properties:{variantType:{type:"string",enum:["concise","standard","detailed","email","browser","sms","recovery"]},
title:{type:"string"},body:{type:"string"},callToAction:{type:["string","null"]},sourceUrl:{type:["string","null"]}}}}}} as const;
export const openAiProvider:AiProviderAdapter={name:"openai",async enhance(input:DraftEnhancementInput,signal:AbortSignal){
 const key=process.env.OPENAI_API_KEY;if(!key)throw new AiEnhancementError("missing_configuration","OpenAI is not configured.");
 const config=aiConfiguration(),prompt=buildEnhancementPrompt(input),client=new OpenAI({apiKey:key,timeout:config.timeoutMs,maxRetries:0});
 try{let response:Awaited<ReturnType<typeof client.responses.create>>|null=null,variants:ReturnType<typeof validateEnhancedOutput>|null=null;
  for(let attempt=0;attempt<2;attempt++){response=await client.responses.create({model:config.model,input:[{role:"system",content:prompt.system},
    {role:"user",content:attempt===0?prompt.user:`${prompt.user}\n\nREPAIR_INSTRUCTION: Return a fresh response that exactly satisfies the JSON schema, requested variant set, and canonical source URL. Do not repeat malformed output.`}],
    text:{format:{type:"json_schema",name:"draft_enhancement",strict:true,schema:outputSchema}}},{signal});
   try{variants=validateEnhancedOutput(JSON.parse(response.output_text) as unknown,input.requestedVariants,input.sourceUrl);break;}
   catch(validationError){if(attempt===1)throw validationError;}}
  if(!response||!variants)throw new AiEnhancementError("schema_invalid","AI output failed validation.");
  const inputTokens=response.usage?.input_tokens??null,outputTokens=response.usage?.output_tokens??null;
  const inputRate=Number(process.env.AI_OPENAI_INPUT_COST_PER_MILLION_MINOR_UNITS??0),outputRate=Number(process.env.AI_OPENAI_OUTPUT_COST_PER_MILLION_MINOR_UNITS??0);
  const estimated=inputTokens===null||outputTokens===null?null:Math.ceil((inputTokens*inputRate+outputTokens*outputRate)/1_000_000);
  return{provider:"openai",model:config.model,promptVersion:AI_PROMPT_VERSION,variants,usage:{inputTokens,outputTokens,estimatedCostMinorUnits:estimated}};}catch(error){if(error instanceof AiEnhancementError)throw error;
  if(error instanceof OpenAI.RateLimitError)throw new AiEnhancementError("rate_limited","AI rate limit reached.",true);
  if(error instanceof OpenAI.APIConnectionTimeoutError)throw new AiEnhancementError("timeout","AI request timed out.",true);
  if(error instanceof SyntaxError||error instanceof Error&&["duplicate_variants","missing_variant","source_url_mismatch","unsafe_link"].includes(error.message))
   throw new AiEnhancementError("schema_invalid","AI output failed validation.",false);
  throw new AiEnhancementError("provider_unavailable","AI provider unavailable.",true);}}};
