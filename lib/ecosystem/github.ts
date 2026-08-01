export type GitHubIdentity={id:number|string;login:string;name?:string|null;html_url:string;type?:string};
export function normalizeGitHubIdentity(value:GitHubIdentity){const id=String(value.id);if(!/^\d+$/.test(id))throw new Error("Invalid GitHub stable identity");const url=new URL(value.html_url);if(url.protocol!=="https:"||url.hostname!=="github.com")throw new Error("Invalid GitHub profile URL");return{stableExternalId:id,handle:value.login,displayName:value.name?.trim()||value.login,canonicalUrl:url.toString(),hostname:"github.com"};}
export function canVerifyGitHubOrganization(permission:string|undefined){return permission==="admin"||permission==="owner";}
export function publicGitHubRepositories<T extends{private:boolean;permissions?:{admin?:boolean};archived?:boolean}>(items:T[]){return items.filter(item=>!item.private&&item.permissions?.admin===true);}

