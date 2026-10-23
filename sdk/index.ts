export type AronEvent = { type:'agent'|'model'|'tool'|'policy'|'approval'|'error'; name:string; status:string; detail?:string };
export type AronTrace = { externalRunId:string; status:'succeeded'|'failed'|'blocked'; events:AronEvent[]; inputTokens:number; outputTokens:number; costMicros:number; costSource:'provider'|'estimated' };

/** Small server-side client. Keep the agent key outside browsers and source control. */
export class AronClient {
  constructor(private readonly endpoint:string,private readonly agentKey:string) {}
  async ingest(trace:AronTrace):Promise<{runId:string}> {
    const response=await fetch(`${this.endpoint.replace(/\/$/,'')}/api/v1/ingest`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${this.agentKey}`},body:JSON.stringify(trace)});
    const result=await response.json();
    if(!response.ok) throw new Error(result.error||`Aron ingestion failed (${response.status})`);
    return result;
  }
}
