// A normal embedded page has no audio grant, even if its host falsely reports visible/focused.
export class AudioWindowSession{
 constructor({token='',fetcher=globalThis.fetch.bind(globalThis),now=Date.now,onRevoked=()=>{}}={}){Object.assign(this,{token,fetcher,now,onRevoked});this.mode='embedded';this.validUntil=0;this.generation=0;}
 allowed(){return !!this.token&&this.mode==='browser'&&this.now()<this.validUntil;}
 async refresh({renew=false}={}){
  const generation=++this.generation,wasAllowed=this.allowed();
  try{if(!this.token)return;const response=await this.fetcher('/api/playback/window-config',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:this.token,renew})});if(!response.ok)throw Error('Audio window unavailable');const result=await response.json();if(generation!==this.generation)return;
   this.mode=result.mode==='browser'?'browser':'embedded';this.validUntil=this.mode==='browser'?this.now()+Math.min(5000,Math.max(0,Number(result.validForMs)||0)):0;
  }catch{if(generation!==this.generation)return;this.mode='embedded';this.validUntil=0;}
  finally{if(generation===this.generation&&wasAllowed&&!this.allowed())this.onRevoked();}
 }
}
