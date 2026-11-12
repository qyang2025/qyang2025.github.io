// Presentation focus is separate from reveal cues: speech can bridge ideas without a spotlight.
export function conceptFocus(slide,beat,sentence,language,cue){
 const role=slide.beats[beat].scene?.deliveryRole||(/(?:^|[-_])(bridge|next|limits)(?:$|[-_])/.test(slide.id)?'bridge':'explain');
 if(role==='bridge'||role==='reflect')return{kind:'none',index:0,conceptKey:slide.id+'/audience'};
 let focus=cue;
 if(slide.integratedEquation&&cue.kind==='formula'){
  const nodes=slide.schematic?.nodes||[];
  const field=language==='en'?'targetsEn':'targets';
  const introduced=slide.beats.slice(0,beat+1).flatMap((b,i)=>(b.scene?.[field]||[]).filter(c=>c.kind==='node'&&(i<beat||c.sentence<=sentence)));
  const index=nodes.length?(introduced.at(-1)?.index??0):0;focus={kind:'node',index};
 }else if(slide.paperDemo&&cue.kind==='node')focus={kind:'node',index:0};
 return{...focus,conceptKey:[slide.id,focus.kind,focus.index].join('/')};
}
export function phraseHash(text=''){let h=0;for(const c of text)h=(h*31+c.codePointAt(0))>>>0;return h;}
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
// One prepared gesture with a hold and a return, rather than a continuous hand oscillator.
export function isTeachingQuestion(text=''){return /[?？]\s*$/.test(text);}
export function speechRole(text=''){
 if(isTeachingQuestion(text))return 'question';
 if(/look|see|follow|notice|观察|看到|顺着|看这/i.test(text))return 'invite';
 if(/but |however|instead|却|但是|并非/i.test(text))return 'contrast';
 if(/therefore|that is why|so,|所以|因此/i.test(text))return 'conclude';
 return 'explain';
}
export function nextTurnState(state={},activity={},text=''){
 if(['paused','stepped'].includes(activity.reason))return{awaiting:false};
 if(activity.reason==='ended')return{awaiting:isTeachingQuestion(text)};
 if(activity.reason==='playing')return{awaiting:false};
 return state;
}
export function phrasePresence({text='',audioTime=0,duration=0,speaking=false,reduced=false,waitingForAnswer=false,waitingAge=0}={}){
 const role=speechRole(text);
 if(reduced)return{gesture:0,nod:0,gaze:0,audience:0,role:'rest'};
 if(waitingForAnswer&&!speaking)return{gesture:.12*Math.exp(-Math.max(0,waitingAge)/350),nod:.08,gaze:0,audience:1,role:'await-answer'};
 if(!speaking||duration<=0)return{gesture:0,nod:0,gaze:0,audience:0,role:'rest'};
 const h=phraseHash(text),p=Math.max(0,Math.min(1,audioTime/duration)),start=.12+(h%3)*.035,end=.70+(h%2)*.07;
 const stroke=smooth((p-start)/.19)*(1-smooth((p-end)/.20));
 const length=Math.max(0,Math.min(1,(duration-1.4)/3.2));
 const strength=({question:.55,invite:.9,contrast:.72,conclude:.65,explain:.58})[role];
 return{gesture:role==='explain'&&h%4===0?0:stroke*length*strength,nod:stroke*(role==='question'?-.22:role==='conclude'?.45:.2),gaze:stroke,audience:role==='question'?smooth((p-.08)/.5):0,role};
}
export function conversationalRate(text){const role=speechRole(text);return role==='question'?.97:role==='invite'?1.025:role==='conclude'?.985:1;}
export function conversationalPause(text,base,{beatChanged=false,pageChanged=false}={}){
 if(!base)return 0;if(pageChanged)return base*2.6;if(isTeachingQuestion(text))return base*2.8;if(beatChanged)return base*1.8;
 if(/[:：]\s*$/.test(text))return base*.7;
 return base*(text.length>110?.85:text.length<55?.45:.6);
}
