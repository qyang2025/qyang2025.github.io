import {conceptFocus} from './teaching-presence.mjs?v=seriesfocus1';
import { attentionTarget } from './attention.mjs';

// Opt-in diagnostics for real classroom media. This never advances or simulates audio.
export class SyncAudit {
  constructor(enabled=false) {
    this.enabled=enabled;this.clips=new Map();this.events=[];this.violations=[];this.lastSample=0;
    if(enabled){this.output=document.createElement('script');this.output.type='application/json';this.output.id='sync-audit-data';document.body.append(this.output);this.flush();}
  }
  event(type,detail={}) { if(!this.enabled)return;this.events.push({type,time:new Date().toISOString(),...detail});this.flush(); }
  render(player) {
    if(!this.enabled)return;
    const p=player.displayPosition();
    this.state={lessonId:player.lesson.id,title:player.lesson.title,language:player.lesson.language||'zh',...p,playing:player.playing,speaking:player.speaking,buffering:player.buffering,depth:player.stack.length,pageCount:player.lesson.slides.length};
    this.flush();
  }
  activity(player,activity) {
    if(!this.enabled)return;
    if(['playing','ended','buffering','paused'].includes(activity.reason)){
      const overlay=document.querySelector('.teaching-pointer'),beam=document.querySelector('.laser-beam');
      const spotlight=!!overlay&&getComputedStyle(overlay).display!=='none';
      this.events.push({type:'laser-state',reason:activity.reason,time:new Date().toISOString(),spotlight,beam:spotlight&&!!beam&&getComputedStyle(beam).display!=='none',highlightCount:document.querySelectorAll('.teaching-target').length,slide:player.displayPosition().slide,sentence:player.displayPosition().sentence});
      this.flush();
    }
    if(activity.reason==='ended' && this.lastKey){Object.assign(this.clips.get(this.lastKey),{ended:true,endTime:activity.audioTime,endDuration:activity.duration});this.flush();}
    if(activity.reason==='paused'){
      const ray=document.querySelector('.teaching-pointer');
      if(document.querySelectorAll('.teaching-target').length || (ray && getComputedStyle(ray).display!=='none')) this.violations.push({type:'pointer-active-during-stop',reason:activity.reason});
      this.flush();
    }
    if(!activity.speaking || !Number.isFinite(activity.audioTime) || activity.audioTime<.02 || performance.now()-this.lastSample<200)return;
    this.lastSample=performance.now();
    const p=player.displayPosition(),slide=player.lesson.slides[p.slide],beat=slide.beats[p.beat];
    const key=[player.lesson.id,player.lesson.language||'zh',slide.id,beat.id,p.sentence].join('/');this.lastKey=key;
    const cue=conceptFocus(slide,p.beat,p.sentence,player.lesson.language,attentionTarget(slide,p.beat,p.sentence,player.lesson.language));
    const target=document.querySelector('.teaching-target'),audio=document.querySelector('#narration-audio');
    const matched=cue.kind==='none' ? !target : !!target && (cue.kind==='node' ? Number(target.dataset.diagramNode)===cue.index : cue.kind==='formula' ? Number(target.dataset.formulaStep)===cue.index : cue.kind==='detail' ? target.dataset.teachingDetail===cue.detail||target.classList.contains('teaching-term-'+cue.detail) : cue.kind==='chart' ? target.classList.contains('plot-frame') : Number(target.dataset.focus)===cue.index);
    const caption=document.querySelector('#caption-text').textContent;
    const errors=[];
    if(caption!==player.displayText()) errors.push('caption-mismatch');
    if(!matched)errors.push('highlight-target-mismatch');
    if(!document.querySelector('.lecture-stage').classList.contains('narration-active'))errors.push('animation-not-active');
    if(document.querySelector('#avatar-stage').dataset.speaking!=='true')errors.push('professor-not-active');
    if([...document.querySelectorAll('.schematic-node')].some(n=>!n.hidden&&n.getAttribute('aria-hidden')!=='true'&&getComputedStyle(n).visibility!=='hidden'&&Number(n.dataset.reveal)>p.beat))errors.push('future-node-visible');
    if(document.querySelector('.math-error'))errors.push('math-render-error');
    const clip=this.clips.get(key)||{key,lessonId:player.lesson.id,language:player.lesson.language||'zh',page:p.slide+1,slideId:slide.id,beat:p.beat,sentence:p.sentence,text:player.displayText(),samples:0,ended:false,maxTime:0,maxRms:0,targets:[]};
    clip.samples++;clip.maxTime=Math.max(clip.maxTime,activity.audioTime);clip.maxRms=Math.max(clip.maxRms,activity.amplitude||0);
    clip.duration=audio?.duration;clip.rate=audio?.playbackRate;clip.startupMs=Number(audio?.dataset.startupMs);clip.preparationMs=Number(audio?.dataset.preparationMs);clip.mediaStartMs=Number(audio?.dataset.mediaStartMs);clip.waitingEvents=Number(audio?.dataset.waitingEvents);clip.rebufferingEvents=Number(audio?.dataset.rebufferingEvents);clip.audioContextState=audio?.dataset.contextState;clip.maxMouthOpening=Math.max(clip.maxMouthOpening||0,Number(document.querySelector('.professor-3d')?.dataset.mouthOpening||0));
    if(!clip.targets.some(t=>t.kind===cue.kind&&t.index===cue.index))clip.targets.push({kind:cue.kind,index:cue.index,...cue.detail?{detail:cue.detail}:{}});
    clip.armMoved ||= !!document.querySelector('.pointing-arm').style.transform;
    clip.animationStates=[...document.querySelectorAll('.current-step,.node-current')].map(e=>getComputedStyle(e).animationPlayState);
    const demo=document.querySelector('[data-paper-demo]');
    if(demo){const progress=Number(demo.dataset.progress||0);clip.demoKind=demo.dataset.paperDemo;clip.minDemoProgress=Math.min(clip.minDemoProgress??1,progress);clip.maxDemoProgress=Math.max(clip.maxDemoProgress??0,progress);clip.demoCheckpoints||=[];const checkpoint={progress:Number(progress.toFixed(3)),step:demo.dataset.trainingStep||null,physicalTime:demo.dataset.physicalTime||null};if(clip.demoCheckpoints.length<64&&JSON.stringify(clip.demoCheckpoints.at(-1))!==JSON.stringify(checkpoint))clip.demoCheckpoints.push(checkpoint);}
    this.clips.set(key,clip);
    if(errors.length && !this.violations.some(v=>v.key===key&&v.errors?.join()===errors.join()))this.violations.push({key,errors,time:activity.audioTime});
    if(clip.samples===1 || clip.samples%5===0)this.flush();
  }
  flush(){if(this.enabled)this.output.textContent=JSON.stringify({startedAt:this.startedAt||=(new Date().toISOString()),state:this.state,clips:[...this.clips.values()],events:this.events,violations:this.violations});}
}
