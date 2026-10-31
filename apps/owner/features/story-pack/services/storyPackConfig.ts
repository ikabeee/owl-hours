export type StoryPackConfig = {mode:'demo'} | {mode:'unconfigured'} | {mode:'live';apiUrl:string;supabaseUrl:string;anonKey:string};
export function resolveStoryPackConfig(input:{mode?:string;apiUrl?:string;supabaseUrl?:string;anonKey?:string}):StoryPackConfig {
  if(input.mode==='demo') return {mode:'demo'};
  if(input.mode && input.mode!=='live') return {mode:'unconfigured'};
  if(!input.apiUrl || !input.supabaseUrl || !input.anonKey) return {mode:'unconfigured'};
  const isSafeUrl=(value:string)=>{
    try { const url=new URL(value);return url.protocol==='https:' || (url.protocol==='http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname)); }
    catch {return false;}
  };
  if(!isSafeUrl(input.apiUrl)||!isSafeUrl(input.supabaseUrl)) return {mode:'unconfigured'};
  return {mode:'live',apiUrl:input.apiUrl.replace(/\/$/,''),supabaseUrl:input.supabaseUrl.replace(/\/$/,''),anonKey:input.anonKey};
}
