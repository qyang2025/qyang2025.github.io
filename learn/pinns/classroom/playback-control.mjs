// One audible classroom per origin. Web Locks provide exclusion, notifications request handover.
export class PlaybackControl {
 constructor({document=globalThis.document,window=globalThis.window,locks=globalThis.navigator?.locks,channelFactory=name=>new BroadcastChannel(name),storage=globalThis.localStorage,onStop=()=>{},hostAllowed=()=>true,timeoutMs=2000}={}){
  Object.assign(this,{document,window,locks,storage,onStop,hostAllowed,timeoutMs});this.id=globalThis.crypto.randomUUID();this.owner=false;this.epoch=0;this.closed=false;this.listeners=[];
  try{this.channel=channelFactory('professor-classroom-playback');this.channel.onmessage=e=>this.receive(e.data);}catch{}
  const listen=(target,type,fn)=>{target?.addEventListener(type,fn);this.listeners.push(()=>target?.removeEventListener(type,fn));};
  listen(document,'visibilitychange',()=>{if(document.visibilityState!=='visible')this.stop('hidden');});
  listen(document,'freeze',()=>this.stop('frozen'));
  for(const type of ['pagehide','beforeunload'])listen(window,type,()=>this.stop(type));
  listen(window,'storage',e=>{if(e.key==='professor.playback.claim')try{this.receive(JSON.parse(e.newValue));}catch{}});
 }
 visible(){return !this.closed&&this.hostAllowed()&&this.document.visibilityState==='visible';}
 canPlay(){return this.owner&&this.visible();}
 receive(message){if(message?.type==='claim'&&message.id!==this.id)this.stop('other-classroom');}
 release(){
  this.epoch++;this.owner=false;this.pending?.abort();this.pending=null;
  const unlock=this.unlock;this.unlock=null;unlock?.();
 }
 stop(reason){this.release();this.onStop(reason);}
 async acquire(){
  if(!this.visible())return false;if(this.owner)return true;
  // No non-atomic localStorage mutex: if the browser cannot guarantee exclusion, stay silent.
  if(!this.locks?.request)throw new Error('This browser cannot safely coordinate classroom audio (Web Locks unavailable).');
  this.release();const epoch=this.epoch,abort=new AbortController();this.pending=abort;
  const message={type:'claim',id:this.id,request:globalThis.crypto.randomUUID()};
  try{this.channel?.postMessage(message);}catch{}try{this.storage?.setItem('professor.playback.claim',JSON.stringify(message));}catch{}
  return new Promise(resolve=>{
   let settled=false;const finish=value=>{if(!settled){settled=true;clearTimeout(timer);resolve(value);}};
   const timer=setTimeout(()=>{abort.abort();finish(false);},this.timeoutMs);
   abort.signal.addEventListener('abort',()=>finish(false),{once:true});
   try{Promise.resolve(this.locks.request('professor-classroom-audio',{mode:'exclusive',signal:abort.signal},async()=>{
    if(epoch!==this.epoch||!this.visible()){finish(false);return;}
    this.pending=null;this.owner=true;
    let unlock;const held=new Promise(r=>{unlock=r;});this.unlock=unlock;finish(true);
    await held;
   })).catch(error=>{finish(false);if(error.name!=='AbortError')this.stop('lock-error');});}catch{finish(false);}
  });
 }
 dispose(){this.stop('disposed');this.closed=true;this.listeners.forEach(fn=>fn());this.channel?.close();}
}
