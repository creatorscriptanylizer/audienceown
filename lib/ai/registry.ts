import type{AiProviderAdapter}from"./types";import{openAiProvider}from"./providers/openai";
const providers=new Map<string,AiProviderAdapter>([["openai",openAiProvider]]);
export function getAiProvider(name:string){return providers.get(name)??null;}export function listAiProviders(){return[...providers.keys()];}
