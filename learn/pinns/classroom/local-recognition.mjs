// SpeechRecognition-shaped adapter backed by real MediaRecorder audio and offline STT.
export class LocalRecognition {
  constructor(){this.lang='zh-CN';this.generation=0;this.state='idle';this.provider='faster-whisper-local-cpu';}
  start(audioTrack){
    if(this.state!=='idle')throw new Error('已有录音正在处理');
    this.state='starting';const token=++this.generation;
    (async()=>{
      const stream=audioTrack ? new MediaStream([audioTrack]) : await navigator.mediaDevices.getUserMedia({audio:true});
      if(token!==this.generation){if(!audioTrack)stream.getTracks().forEach(t=>t.stop());return;}
      this.stream=stream;this.owned=!audioTrack;this.parts=[];
      const recorder=new MediaRecorder(stream);this.recorder=recorder;
      recorder.ondataavailable=e=>{if(e.data.size)this.parts.push(e.data);};
      recorder.onstart=()=>{if(token===this.generation){this.state='recording';this.onstart?.();}};
      recorder.onerror=e=>this.fail(e.error?.message||'recording-error',token);
      recorder.onstop=async()=>{
        if(token!==this.generation)return;
        this.state='transcribing';if(this.owned)stream.getTracks().forEach(t=>t.stop());
        try{
          this.controller=new AbortController();
          const response=await fetch(`/api/transcribe?language=${this.lang.startsWith('en')?'en':'zh'}`,{method:'POST',body:new Blob(this.parts,{type:recorder.mimeType}),signal:this.controller.signal});
          const result=await response.json();if(!response.ok)throw new Error(result.error||'transcription-error');
          if(token!==this.generation)return;
          const item=[{transcript:result.text}];item.isFinal=true;
          this.onresult?.({results:[item],provider:result.provider});this.state='idle';this.onend?.();
        }catch(error){this.fail(error.message,token);}
      };
      recorder.start();this.limit=setTimeout(()=>this.stop(),55000);
    })().catch(error=>this.fail(error.message,token));
  }
  stop(){clearTimeout(this.limit);if(this.recorder?.state==='recording')this.recorder.stop();}
  abort(){
    ++this.generation;clearTimeout(this.limit);this.controller?.abort();
    if(this.recorder?.state==='recording')this.recorder.stop();
    if(this.owned)this.stream?.getTracks().forEach(t=>t.stop());
    const active=this.state!=='idle';this.state='idle';if(active)this.onend?.();
  }
  fail(error,token){if(token!==this.generation)return;this.abort();this.onerror?.({error});}
}
