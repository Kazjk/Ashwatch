export function roomFromSearch(search:string){
 const room=new URLSearchParams(search).get("room")?.trim().toUpperCase();
 return room&&/^[A-F0-9]{6}$/.test(room)?room:null;
}
export function inviteUrl(origin:string,room:string){
 if(!/^[A-F0-9]{6}$/.test(room))throw Error("Invalid company code");
 const url=new URL("/ashwatch",origin);url.searchParams.set("room",room);return url.toString();
}
