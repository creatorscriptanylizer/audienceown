import{validateRemoteUrl}from"./network-security";
export function assertSafeFeedXml(xml:string){if(/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(xml))throw new Error("XML declarations with external resources are not allowed");if(!/<(?:rss|feed)(?:\s|>)/i.test(xml))throw new Error("RSS or Atom feed required");const title=xml.match(/<title(?:\s[^>]*)?>(?:<!\[CDATA\[)?([^<\]]+)/i)?.[1]?.trim();if(!title)throw new Error("Feed title required");return{title};}
export function validateFeedUrl(value:string,verifiedHosts:string[]){return validateRemoteUrl(value,verifiedHosts);}

