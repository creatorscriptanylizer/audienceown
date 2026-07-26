"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
export function CopyLinkButton({value,label}:{value:string;label:string}) {
  const [copied,setCopied]=useState(false);
  async function copy(){await navigator.clipboard.writeText(value);setCopied(true);setTimeout(()=>setCopied(false),1600)}
  return <button type="button" className="button button-secondary" onClick={copy} title={value}>{copied?<Check size={15}/>:<Copy size={15}/>} {copied?"Copied":label}</button>;
}
