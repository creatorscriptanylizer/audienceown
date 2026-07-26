"use client";
import { useEffect } from "react";
export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){useEffect(()=>{console.error(JSON.stringify({level:"error",event:"ui.error",digest:error.digest}))},[error]);return <main className="grid min-h-screen place-items-center p-5 text-center"><div><h1 className="text-2xl font-semibold">The signal was interrupted</h1><p className="mt-2 text-zinc-400">Nothing was changed. Try the request again.</p><button onClick={reset} className="button button-primary mt-6">Try again</button></div></main>}
