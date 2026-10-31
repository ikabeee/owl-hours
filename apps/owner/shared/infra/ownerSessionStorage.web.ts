// Supabase's browser session persistence. Access is deferred for SSR/builds.
export const ownerSessionStorage = {
  getItem: async (key:string) => typeof window==='undefined' ? null : window.localStorage.getItem(key),
  setItem: async (key:string,value:string) => { if(typeof window!=='undefined') window.localStorage.setItem(key,value); },
  removeItem: async (key:string) => { if(typeof window!=='undefined') window.localStorage.removeItem(key); },
};
