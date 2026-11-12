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
export function phrasePresence({text='',audioTime=0,duration=0,speaking=false,reduced=false}={}){
 if(!speaking||reduced||duration<=0)return{gesture:0,nod:0,gaze:0};
 const h=phraseHash(text),p=Math.max(0,Math.min(1,audioTime/duration)),start=.12+(h%3)*.035,end=.72+(h%2)*.08;
 const stroke=smooth((p-start)/.19)*(1-smooth((p-end)/.19));
 return{gesture:h%4===0?0:stroke,nod:stroke*(/[?？]/.test(text)?-.65:.45),gaze:stroke};
}
export function conversationalPause(text,base,{beatChanged=false,pageChanged=false}={}){
 if(!base)return 0;if(pageChanged)return base*2.6;if(beatChanged)return base*1.8;
 if(/[?？]\s*$/.test(text))return base*1.35;
 if(/[:：]\s*$/.test(text))return base*.7;
 return base*(text.length>110?.85:text.length<55?.45:.6);
}
