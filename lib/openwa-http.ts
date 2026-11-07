/** Server-to-server requests retain API-key authentication through ngrok free tunnels. */
export function openwaRequestHeaders(key:string,extra:Record<string,string>={}){
  return {...extra,Accept:"application/json","X-API-Key":key,"ngrok-skip-browser-warning":"1"};
}
