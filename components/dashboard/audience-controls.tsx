"use client";
import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { AudienceFilter, AudienceRange } from "@/lib/audience-dashboard";

export function AudienceControls({filter,range,filters,labels}:{filter:AudienceFilter;range:AudienceRange;filters:readonly AudienceFilter[];labels:Record<AudienceFilter,string>}){
  const searchParams=useSearchParams(),appliedSearch=searchParams.get("search")??searchParams.get("q")??"";
  return <AudienceControlsForm key={`${appliedSearch}:${filter}:${range}`} initialSearch={appliedSearch} initialFilter={filter} range={range} filters={filters} labels={labels}/>;
}

function AudienceControlsForm({initialSearch,initialFilter,range,filters,labels}:{initialSearch:string;initialFilter:AudienceFilter;range:AudienceRange;filters:readonly AudienceFilter[];labels:Record<AudienceFilter,string>}){
  const router=useRouter(),[draftSearch,setDraftSearch]=useState(initialSearch),[draftFilter,setDraftFilter]=useState<AudienceFilter>(initialFilter);
  const navigate=(nextSearch:string,nextFilter:AudienceFilter)=>{const params=new URLSearchParams();if(nextSearch.trim())params.set("search",nextSearch.trim());if(nextFilter!=="all")params.set("filter",nextFilter);if(range!=="30d")params.set("range",range);router.push(params.size?`/dashboard/audience?${params}`:"/dashboard/audience");};
  const apply=(event:FormEvent)=>{event.preventDefault();navigate(draftSearch,draftFilter);};
  const clearSearch=()=>{setDraftSearch("");navigate("",draftFilter);};
  return <form className="audience-controls" onSubmit={apply}><label><Search/><span className="sr-only">Search protected followers</span><input name="search" value={draftSearch} onChange={event=>setDraftSearch(event.target.value)} placeholder="Search masked identity or email"/>{draftSearch&&<button type="button" className="grid size-7 shrink-0 place-items-center rounded-lg text-zinc-500 hover:bg-white/[.06] hover:text-zinc-200" aria-label="Clear search" onClick={clearSearch}><X/></button>}</label><select name="filter" value={draftFilter} onChange={event=>setDraftFilter(event.target.value as AudienceFilter)} aria-label="Filter protected followers">{filters.map(value=><option value={value} key={value}>{labels[value]}</option>)}</select><button className="button button-secondary" type="submit">Apply</button></form>;
}
