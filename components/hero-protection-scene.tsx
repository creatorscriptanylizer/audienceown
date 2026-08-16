"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { PlatformBrandIcon } from "@/components/dashboard/platform-brand-icon";

const planets = [
  ["youtube","YouTube",0,18,36],["instagram","Instagram",33,24,43],["tiktok","TikTok",68,20,50],
  ["x","X",102,27,38],["twitch","Twitch",137,22,47],["facebook","Facebook",171,29,53],
  ["discord","Discord",238,26,49],["linkedin","LinkedIn",270,19,55],
  ["website","Website",304,28,44],["newsletter","Newsletter",336,23,51],
] as const;

export function HeroProtectionScene(){
  const scene=useRef<HTMLDivElement>(null),reduced=useReducedMotion(),[rippling,setRippling]=useState<string|null>(null);
  useEffect(()=>{
    if(reduced||!scene.current)return;
    const context=gsap.context(()=>{
      gsap.timeline({repeat:-1,repeatDelay:2.8}).fromTo(".shield-energy-sweep",{rotation:-25,opacity:0},{rotation:210,opacity:.8,duration:1.35,ease:"power2.inOut"}).to(".shield-energy-sweep",{opacity:0,duration:.45});
      gsap.to(".shield-reflection",{xPercent:260,duration:4.8,repeat:-1,repeatDelay:2.2,ease:"power1.inOut"});
      gsap.to(".network-line",{strokeDashoffset:-80,duration:7,repeat:-1,ease:"none",stagger:.35});
    },scene);
    const visibility=()=>document.hidden?gsap.globalTimeline.pause():gsap.globalTimeline.resume();
    document.addEventListener("visibilitychange",visibility);
    return()=>{document.removeEventListener("visibilitychange",visibility);context.revert()};
  },[reduced]);
  return <div ref={scene} className={`protection-scene ${reduced?"scene-reduced":""}`} aria-label="AudienceOwn protection shield surrounded by connected platforms">
    <div className="scene-world" aria-hidden><i/><i/><i/><i/><i/></div>
    <svg className="scene-network" viewBox="0 0 600 600" aria-hidden><path className="network-line" d="M95 205 Q300 35 508 188"/><path className="network-line" d="M70 377 Q300 545 535 355"/><path className="network-line" d="M145 105 Q510 300 155 505"/></svg>
    <div className="scene-orbit orbit-a" aria-hidden/><div className="scene-orbit orbit-b" aria-hidden/><div className="scene-orbit orbit-c" aria-hidden/>
    <motion.div className="shield-float" animate={reduced?undefined:{y:[-7,7,-7],rotateY:[-4,4,-4]}} transition={{duration:7,repeat:Infinity,ease:"easeInOut"}}>
      <div className="shield-pulse"/><div className="shield-energy-sweep"/>
      <div className="hero-shield"><div className="shield-panel shield-panel-back"/><div className="shield-panel shield-panel-front"><span className="shield-reflection"/><div className="shield-core"><b>AO</b><small>AudienceOwn</small></div></div></div>
    </motion.div>
    {planets.map(([provider,label,start,duration,radius],index)=><button type="button" key={provider} aria-label={`${label}, protected platform`} onClick={()=>{setRippling(provider);window.setTimeout(()=>setRippling(null),650)}} className={`orbit-node orbit-node-${index} ${rippling===provider?"is-rippling":""}`} style={{"--orbit-start":`${start}deg`,"--orbit-duration":`${duration}s`,"--orbit-radius":`${radius*5}px`} as React.CSSProperties}><span className="orbit-bob"><PlatformBrandIcon provider={provider} label={label} animated={!reduced}/><em>{label}</em></span></button>)}
    {Array.from({length:14},(_,index)=><i aria-hidden className="scene-particle" style={{left:`${8+(index*17)%84}%`,top:`${6+(index*23)%88}%`,"--particle-delay":`${-index*.47}s`,"--particle-size":`${2+(index%3)}px`} as React.CSSProperties} key={index}/>)}
  </div>
}
