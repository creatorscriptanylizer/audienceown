import Link from "next/link";
import { CheckCircle2, CircleAlert, CircleDashed, Info, LoaderCircle, TriangleAlert } from "lucide-react";

type Action={label:string;href:string};
type ProductStateProps={icon?:React.ComponentType<{className?:string;size?:number;"aria-hidden"?:boolean}>;title:string;description:string;primaryAction?:Action;secondaryAction?:Action;compact?:boolean;className?:string};
type Kind="loading"|"empty"|"error"|"success"|"unavailable"|"action";
const defaults={loading:LoaderCircle,empty:CircleDashed,error:CircleAlert,success:CheckCircle2,unavailable:Info,action:TriangleAlert};
const tones={loading:"text-violet-300 bg-violet-400/10",empty:"text-zinc-300 bg-white/[.06]",error:"text-red-300 bg-red-400/10",success:"text-emerald-300 bg-emerald-400/10",unavailable:"text-zinc-300 bg-white/[.06]",action:"text-amber-300 bg-amber-400/10"};

function ProductState({kind,icon,title,description,primaryAction,secondaryAction,compact=false,className=""}:ProductStateProps&{kind:Kind}){
  const Icon=icon??defaults[kind];
  const role=kind==="error"?"alert":"status";
  return <section role={role} aria-live={kind==="loading"?"polite":undefined} aria-busy={kind==="loading"||undefined} className={`surface rounded-2xl text-center ${compact?"p-5":"p-6 sm:p-8"} ${className}`}>
    <span className={`mx-auto grid size-11 place-items-center rounded-xl ${tones[kind]}`}><Icon aria-hidden size={20} className={kind==="loading"?"animate-spin motion-reduce:animate-none":undefined}/></span>
    <h2 className="mt-4 text-lg font-semibold text-zinc-100">{title}</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-400">{description}</p>
    {(primaryAction||secondaryAction)&&<div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">{primaryAction&&<Link className="button button-primary min-h-11" href={primaryAction.href}>{primaryAction.label}</Link>}{secondaryAction&&<Link className="button button-secondary min-h-11" href={secondaryAction.href}>{secondaryAction.label}</Link>}</div>}
  </section>;
}

export const LoadingState=(props:ProductStateProps)=><ProductState kind="loading" {...props}/>;
export const EmptyState=(props:ProductStateProps)=><ProductState kind="empty" {...props}/>;
export const ErrorState=(props:ProductStateProps)=><ProductState kind="error" {...props}/>;
export const SuccessState=(props:ProductStateProps)=><ProductState kind="success" {...props}/>;
export const UnavailableState=(props:ProductStateProps)=><ProductState kind="unavailable" {...props}/>;
export const ActionRequiredState=(props:ProductStateProps)=><ProductState kind="action" {...props}/>;

export function StateSkeleton({className="h-40"}:{className?:string}){return <div aria-hidden className={`rounded-2xl border border-white/[.06] bg-[linear-gradient(110deg,rgba(255,255,255,.025),rgba(255,255,255,.07),rgba(255,255,255,.025))] bg-[length:200%_100%] ${className}`}/>;}
