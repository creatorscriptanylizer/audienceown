"use client";
import{useEffect}from"react";
import type{PlatformContextEvent}from"@/lib/intelligence/platform-context-event";

export function PlatformContextBanner({event}:{event:PlatformContextEvent}){
 useEffect(()=>{const url=new URL(window.location.href);for(const key of["social","youtube","connectionId","networkIntent"])url.searchParams.delete(key);window.history.replaceState(window.history.state,"",`${url.pathname}${url.search}${url.hash}`);},[]);
 return <section className={`studio-focus-note platform-context-${event.tone}`} role="status" data-platform-event={event.type}><div><strong>{event.title}</strong><p>{event.description}</p>{event.guidance&&<p>{event.guidance}</p>}</div></section>;
}
