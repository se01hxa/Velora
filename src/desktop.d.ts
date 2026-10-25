export interface AgentStatus {
  enabled:boolean; readOnly:boolean; port?:number; clients?:number; endpoint?:string;
  config?:{claude:string;claudeCode:string;codex:string;antigravity:string};
  launcher?:string;
}
export interface AgentRequest {requestId:string;command:string;args:Record<string,any>}
declare global {
 interface Window {
  desktop?: {
   saveProject(content:string):Promise<{ok:boolean;path?:string}>;
   openProject():Promise<{ok:boolean;content?:string;path?:string}>;
   exportFiles(files:{name:string;content:string}[]):Promise<{ok:boolean;path?:string}>;
   saveBinary(name:string,data:number[]):Promise<{ok:boolean;path?:string}>;
   minimize():void;maximize():void;close():void;
   getAgentStatus?():Promise<AgentStatus>;
   setAgentOptions?(options:{enabled?:boolean;readOnly?:boolean}):Promise<AgentStatus>;
   onAgentStatus?(handler:(status:AgentStatus)=>void):()=>void;
   onAgentRequest?(handler:(request:AgentRequest)=>void):()=>void;
   replyAgent?(reply:{requestId:string;ok:boolean;result?:any;error?:string}):void;
   agentReady?():void;
  }
 }
}
