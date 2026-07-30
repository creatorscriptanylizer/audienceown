import { capabilities } from "../capabilities"; import { oauthProvider } from "../provider-factory";
import { bearerJson,identity } from "../base-oauth";
export const spotifyProvider=oauthProvider({displayName:"Spotify",availability:"implemented_credentials_required",
capabilities:capabilities({oauth:true,tokenRefresh:true,polling:true,contentDetection:true,automaticDrafts:true,automaticPublishing:true}),
config:{provider:"spotify",clientIdEnv:"SPOTIFY_CLIENT_ID",clientSecretEnv:"SPOTIFY_CLIENT_SECRET",redirectEnv:"SPOTIFY_REDIRECT_URI",authorizeUrl:"https://accounts.spotify.com/authorize",tokenUrl:"https://accounts.spotify.com/api/token",scopes:["user-read-private"]},
adapter:{async fetchIdentity({accessToken}){const data=await bearerJson("spotify","https://api.spotify.com/v1/me",accessToken);
return identity(String(data.id??""),String(data.display_name??"Spotify account"),String(((data.external_urls as Record<string,unknown>|undefined)?.spotify)??"https://open.spotify.com/"),{artist_selection_required:true});},
async pollContent({accessToken,cursor,metadata}){const artistId=String(metadata?.artist_id??"");if(!artistId)return{items:[],cursor:cursor??null};
 const body=await bearerJson("spotify",`https://api.spotify.com/v1/artists/${encodeURIComponent(artistId)}/albums?include_groups=album,single,compilation&limit=20`,accessToken);
 const albums=Array.isArray(body.items)?body.items as Record<string,unknown>[]:[];const unseen=cursor&&albums.some((x)=>x.id===cursor)?albums.slice(0,albums.findIndex((x)=>x.id===cursor)):albums;
 const items=unseen.flatMap((album)=>{const id=String(album.id??""),release=String(album.release_date??"");const precision=String(album.release_date_precision??"day");
  const timestamp=precision==="day"?`${release}T00:00:00.000Z`:precision==="month"?`${release}-01T00:00:00.000Z`:`${release}-01-01T00:00:00.000Z`;
  const url=String((album.external_urls as Record<string,unknown>|undefined)?.spotify??"");if(!id||!url||!Number.isFinite(Date.parse(timestamp)))return[];
  const images=Array.isArray(album.images)?album.images as Record<string,unknown>[]:[];return[{provider:"spotify" as const,externalObjectId:id,objectType:"audio_release" as const,
   eventType:"published" as const,title:String(album.name??"New release"),description:String(album.album_group??album.album_type??""),
   canonicalUrl:url,thumbnailUrl:typeof images[0]?.url==="string"?images[0].url:null,mediaUrls:[],sourcePublishedAt:timestamp,
   scheduledStartAt:null,liveStatus:null,rawMetadata:{spotify_attribution:true,release_group:album.album_group??null}}];});
 return{items,cursor:String(albums[0]?.id??cursor??"")||null};}}});
