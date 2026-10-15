export class WorldResponseError extends Error {
 readonly status:number;
 readonly transient:boolean;
 constructor(message:string,status:number,transient=false){super(message);this.name="WorldResponseError";this.status=status;this.transient=transient;}
}

// A proxy's empty/HTML response is a connection failure, never credential expiry.
// Keep its contents out of the UI and logs: a response may contain private data.
export async function readWorldResponse<T>(response:Pick<Response,"ok"|"status"|"text">):Promise<T>{
 let value:unknown;
 try{value=JSON.parse(await response.text());}catch{throw new WorldResponseError("Connection interrupted. Please try again.",response.status,true);}
 if(!value||typeof value!=="object"||Array.isArray(value))throw new WorldResponseError("Connection interrupted. Please try again.",response.status,true);
 if(!response.ok){
  const error=(value as {error?:unknown}).error;
  throw new WorldResponseError(typeof error==="string"?error:"Connection interrupted. Please try again.",response.status,response.status===408||response.status===429||response.status>=500);
 }
 return value as T;
}

type WorldBody=object;
type Transport=(body:WorldBody,signal?:AbortSignal)=>Promise<Response>;
const replaySafe=new Set(["snapshot","resume","input"]);

// Input replay uses the identical sequence and payload, which the server deduplicates.
// Never replay enter/start/restart/leave or a service purchase after an uncertain result.
export async function worldRequest<T>(body:WorldBody,transport:Transport,signal?:AbortSignal,onRetry:()=>void=()=>{}):Promise<T>{
 for(let attempt=0;;attempt++){
  signal?.throwIfAborted();
  try{const value=await readWorldResponse<T>(await transport(body,signal));signal?.throwIfAborted();return value;}
  catch(error){
   signal?.throwIfAborted();
   const transient=error instanceof WorldResponseError?error.transient:error instanceof TypeError||error instanceof Error&&error.name==="TimeoutError";
   if(attempt||!replaySafe.has((body as {action?:string}).action??"")||!transient)throw error;
   onRetry();
  }
 }
}
