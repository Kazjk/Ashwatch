export type Session={id:string;token:string;room?:string;host?:boolean};

export function readSavedSession(raw:string|null,invited:string|null=null):Session|null{
 try{
  const value=JSON.parse(raw??"null");
  if(!value||typeof value.id!=="string"||!value.id||typeof value.token!=="string"||!value.token)return null;
  if(value.room!==undefined&&(typeof value.room!=="string"||!/^([A-F0-9]{6})$/.test(value.room)))return null;
  if(invited&&value.room!==invited)return null;
  return {id:value.id,token:value.token,...(value.room?{room:value.room}:{}),...(typeof value.host==="boolean"?{host:value.host}:{})};
 }catch{return null;}
}

function pause(delay:number,signal:AbortSignal){
 return new Promise<void>((resolve,reject)=>{
  if(signal.aborted){reject(signal.reason);return;}
  const abort=()=>{clearTimeout(timer);reject(signal.reason);};
  const timer=setTimeout(()=>{signal.removeEventListener("abort",abort);resolve();},delay);
  signal.addEventListener("abort",abort,{once:true});
 });
}

// Transient outages must never discard the credential that permits a later resume.
// The caller clears browser storage only for the server's explicit expiry response.
export async function restoreSession<T>(session:Session,load:(session:Session,signal:AbortSignal)=>Promise<T>,signal:AbortSignal,onRetry:()=>void=()=>{},wait=pause):Promise<T>{
 let failures=0;
 for(;;){
  signal.throwIfAborted();
  try{const view=await load(session,signal);signal.throwIfAborted();return view;}
  catch(error){
   signal.throwIfAborted();
   if(error instanceof Error&&error.message==="SESSION_EXPIRED")throw error;
   onRetry();await wait(Math.min(2000,250*2**Math.min(failures++,3)),signal);
  }
 }
}
