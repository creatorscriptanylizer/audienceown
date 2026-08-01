export type DiscordGuild={id:string;name:string;owner?:boolean;permissions?:string};
const MANAGE_GUILD=BigInt(1<<5),ADMINISTRATOR=BigInt(1<<3);
export function normalizeDiscordGuild(guild:DiscordGuild){if(!/^\d{5,25}$/.test(guild.id))throw new Error("Invalid Discord guild ID");return{stableExternalId:guild.id,displayName:guild.name.trim(),canonicalUrl:`https://discord.com/channels/${guild.id}`,hostname:"discord.com"};}
export function hasDiscordGuildAuthority(guild:DiscordGuild){if(guild.owner)return true;try{const p=BigInt(guild.permissions??"0"),zero=BigInt(0);return(p&MANAGE_GUILD)!==zero||(p&ADMINISTRATOR)!==zero;}catch{return false;}}
