"use client";import{QRCodeSVG}from"qrcode.react";
export function VerificationQr({url,size=160}:{url:string;size?:number}){return <div className="inline-flex rounded-xl bg-white p-3" aria-label="QR code for canonical verification page"><QRCodeSVG value={url} size={size} level="M" marginSize={1}/></div>;}
