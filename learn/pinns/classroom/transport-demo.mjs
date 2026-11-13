import {mathHtml} from './math.mjs?v=seriesfocus1';
export const transportKinds=['transport-physical','transport-characteristic','transport-training','transport-error','transport-time-error','transport-code'];
const colours={direct:'#79d4ef',curriculum:'#ff8e9e','curriculum-extra':'#ffe071'};
const labels={en:{direct:'Direct',curriculum:'Curriculum','curriculum-extra':'Extra budget'},zh:{direct:'直接训练',curriculum:'课程式','curriculum-extra':'额外预算'}};
export function transportFrame(trace,mode,progress,seed=11){const f=trace.runs[`${mode}-${seed}`].frames;return f[Math.min(f.length-1,Math.floor(Math.max(0,Math.min(1,progress))*(f.length-1)))];}
export function fieldErrorsByTime(trace,mode,seed=11){const run=trace.runs[`${mode}-${seed}`];return trace.truth.map((row,t)=>Math.sqrt(row.reduce((sum,u,x)=>sum+(run.field[t][x]-u)**2,0)/row.reduce((sum,u)=>sum+u*u,0)));}
export function characteristicSegments(beta,progress,x0=Math.PI/2){const segments=[[]];for(let i=0;i<=100;i++){const t=progress*i/100,x=((x0+beta*t)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);if(i&&x<segments.at(-1).at(-1).x)segments.push([]);segments.at(-1).push({x,t});}return segments;}
export function drawTransport(host,trace,progress,en){
 const svg=host.querySelector('svg'),kind=host.dataset.paperDemo,n=labels[en?'en':'zh'];if(!svg)return;
 const beta=trace.config.targetBeta,axis=(s,x,y)=>`<foreignObject data-axis-label="${x<60?'y':x>=540&&y>=140?'x':''}" x="${x}" y="${y}" width="60" height="38"><div xmlns="http://www.w3.org/1999/xhtml" class="paper-axis">${mathHtml(s,false)}</div></foreignObject>`,text=(x,y,s,anchor='middle')=>`<text x="${x}" y="${y}" text-anchor="${anchor}">${s}</text>`;
 const modes=['direct','curriculum','curriculum-extra'],legend=(y=249)=>modes.map((m,i)=>`<path d="M${55+i*185} ${y-7}h24" stroke="${colours[m]}" stroke-width="3"/>`+text(85+i*185,y,n[m],'start')).join('');
 const line=(curve,col,dash='')=>`<polyline points="${curve.map((u,i)=>`${60+480*trace.x[i]/(2*Math.PI)},${110-65*u}`).join(' ')}" fill="none" stroke="${col}" stroke-width="3" ${dash?'stroke-dasharray="7 5"':''}/>`;
 if(kind==='transport-physical'){
  const time=Math.min(1,progress*2),values=trace.x.map(x=>Math.sin(x-beta*time)),marker=((Math.PI/2+beta*time)%(2*Math.PI))/(2*Math.PI);
  svg.innerHTML=`<path d="M60 25V185H555M60 110H545" fill="none" stroke="#ced8df" stroke-width="2.8"/>`+line(trace.x.map(x=>Math.sin(x)),'#8b9ca3',true)+line(values,'#ffe071')+`<circle cx="${60+480*marker}" cy="45" r="5" fill="#ff8e9e"/>`+axis('u',15,5)+axis('x',560,170)+text(60,211,'0')+axis(String.raw`2\pi`,520,190)+text(300,22,`t = ${time.toFixed(2)}`)+text(300,249,en?'Translation: shape preserved, periodic wrap':'平移：形状不变，周期回绕');host.dataset.physicalTime=String(time);host.dataset.beta=String(beta);return;
 }
 if(kind==='transport-characteristic'){
  const time=Math.min(1,progress*2),parts=characteristicSegments(beta,time),point=parts.at(-1).at(-1),px=x=>60+480*x/(2*Math.PI),py=t=>185-t*150;
  svg.innerHTML=`<path d="M60 25V185H555" fill="none" stroke="#ced8df" stroke-width="2.8"/>`+parts.map(s=>`<polyline points="${s.map(p=>`${px(p.x)},${py(p.t)}`).join(' ')}" fill="none" stroke="#ffe071" stroke-width="3"/>`).join('')+`<circle cx="${px(point.x)}" cy="${py(point.t)}" r="5" fill="#ff8e9e"/>`+axis('t',20,3)+axis('x',560,170)+text(60,211,'0')+axis(String.raw`2\pi`,520,190)+text(300,249,en?'Follow a crest: value stays constant':'跟随波峰：数值沿路径不变');host.dataset.physicalTime=String(time);return;
 }
 const output=host.querySelector('output');
 if(kind==='transport-training'){
  const frame=m=>transportFrame(trace,m,progress);
  svg.innerHTML=`<path d="M60 25V185H555" fill="none" stroke="#ced8df" stroke-width="2.8"/>`+line(trace.truth.at(-1),'#d5dce0',true)+modes.map(m=>line(frame(m).curve,colours[m])).join('')+axis('u',15,5)+axis('x',560,170)+text(60,211,'0')+axis(String.raw`2\pi`,520,190)+text(300,22,en?'Final-time field · target reference':'终止时刻场 · 目标参考')+legend();
  const f=frame('curriculum');output.textContent=en?`Curriculum β=${f.beta} · target error ${(100*f.targetRelativeL2).toFixed(1)}%`:`课程式 β=${f.beta} · 目标误差 ${(100*f.targetRelativeL2).toFixed(1)}%`;host.dataset.curriculumBeta=String(f.beta);host.dataset.curriculumError=String(f.targetRelativeL2);host.dataset.step=String(f.step);return;
 }
 if(kind==='transport-time-error'){
  const values=modes.map(m=>fieldErrorsByTime(trace,m)),upper=Math.max(...values.flat())*1.12,points=row=>row.map((u,i)=>`${60+480*trace.times[i]},${185-150*u/upper}`).join(' ');
  svg.innerHTML=`<path d="M60 25V185H555" fill="none" stroke="#ced8df" stroke-width="2.8"/>`+values.map((v,i)=>`<polyline points="${points(v)}" fill="none" stroke="${colours[modes[i]]}" stroke-width="3"/>`).join('')+text(38,190,'0')+text(38,42,upper.toFixed(1))+text(60,211,'0')+text(540,211,'1')+axis('t',565,170)+text(300,22,en?'Relative field error at each physical time':'各物理时刻的相对场误差')+legend();output.textContent=en?'Same target β=10 · seed 11':'相同目标 β=10 · 种子11';return;
 }
 if(kind==='transport-error'){
  const vals=modes.flatMap(m=>trace.config.seeds.map(seed=>100*trace.runs[`${m}-${seed}`].relativeL2)),low=Math.floor(Math.log10(Math.min(...vals))),high=Math.max(low+1,Math.ceil(Math.log10(Math.max(...vals)))),py=v=>185-(Math.log10(v)-low)/(high-low)*145;
  svg.innerHTML=`<path d="M60 30V185H585" fill="none" stroke="#ced8df" stroke-width="2.8"/>`+[...Array(high-low+1)].map((_,i)=>text(48,py(10**(low+i))+6,`1e${low+i}`,'end')).join('')+modes.map((m,i)=>trace.config.seeds.map((seed,j)=>`<circle cx="${145+i*165+(j-1)*12}" cy="${py(100*trace.runs[`${m}-${seed}`].relativeL2)}" r="5" fill="${colours[m]}"/>`).join('')+text(145+i*165,218,n[m])).join('')+text(300,20,en?'Target field error (%) · log axis':'目标场误差（%）· 对数轴')+text(300,250,en?'Extra budget has more training steps':'额外预算组使用更多训练步数');output.textContent=en?'All paired seeds · compare budgets before ranking':'全部配对种子 · 排名之前先比较预算';return;
 }
}
