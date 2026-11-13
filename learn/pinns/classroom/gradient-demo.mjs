import {mathHtml} from './math.mjs?v=seriesfocus1';
export const gradientKinds=['gradient-physical','gradient-training','gradient-norms','gradient-weight','gradient-error','gradient-code'];
const colours={unweighted:'#79d4ef',fixed100:'#c7b4ff',adaptive:'#ff8e9e',guarded:'#ffe071'};
const names={en:{unweighted:'Unit',fixed100:'Fixed 100',adaptive:'Ratio',guarded:'Guarded'},zh:{unweighted:'单位权重',fixed100:'固定100',adaptive:'比值法',guarded:'限幅法'}};
export function gradientFrame(trace,kind,progress,seed=11){const frames=trace.runs[`${kind}-${seed}`].frames;return frames[Math.min(frames.length-1,Math.floor(Math.max(0,Math.min(1,progress))*(frames.length-1)))];}
export function drawGradient(host,trace,progress,en){
 const svg=host.querySelector('svg'),kind=host.dataset.paperDemo,n=names[en?'en':'zh'];if(!svg)return;
 const axis=(s,x,y)=>`<foreignObject data-axis-label="${x<60?'y':x>=540&&y>=140?'x':''}" x="${x}" y="${y}" width="60" height="38"><div xmlns="http://www.w3.org/1999/xhtml" class="paper-axis">${mathHtml(s,false)}</div></foreignObject>`;
 const text=(x,y,s,anchor='middle')=>`<text x="${x}" y="${y}" text-anchor="${anchor}">${s}</text>`;
 const frame=m=>gradientFrame(trace,m,progress),output=host.querySelector('output');
 const modes=['unweighted','adaptive','guarded'];
 const legend=(entries,y=249)=>entries.map(([label,color],i)=>`<path d="M${75+i*180} ${y-7}h24" stroke="${color}" stroke-width="3"/>`+text(105+i*180,y,label,'start')).join('');
 if(kind==='gradient-physical'){
  const a=Math.min(1,progress*3),right=trace.reference.boundary[1],values=trace.x.map((x,i)=>right*x+a*(trace.truth[i]-right*x));
  const points=values.map((u,i)=>`${60+480*trace.x[i]},${115-u*50}`).join(' ');
  const loads=[...Array(9)].map((_,i)=>{const x=(i+1)/10,dy=Math.sin(trace.config.frequency*x)*a*33;return `<path d="M${60+480*x} ${68}v${-dy}" stroke="#79d4ef" stroke-width="2.5"/><circle cx="${60+480*x}" cy="${68-dy}" r="3" fill="#79d4ef"/>`;}).join('');
  svg.innerHTML=`<path d="M60 112v22M540 ${112-right*50}v22M60 115H540" stroke="#8b9ca3" stroke-width="2"/>${loads}<polyline points="${points}" fill="none" stroke="#ffe071" stroke-width="4"/>`+axis('u',20,78)+axis('x',558,147)+text(60,196,'0')+text(540,196,'1')+text(300,222,en?'Load ramp: equilibria, not time integration':'逐步加载：平衡形状，不是时间积分')+text(300,251,en?'Fixed end positions':'端点位置固定');host.dataset.loadFraction=String(a);return;
 }
 if(kind==='gradient-training'){
  const py=u=>135-u*52,points=curve=>curve.map((u,i)=>`${60+480*trace.x[i]},${py(u)}`).join(' ');
  svg.innerHTML=`<path d="M60 28V190H555" fill="none" stroke="#ced8df" stroke-width="2.8"/><polyline points="${points(trace.truth)}" fill="none" stroke="#d5dce0" stroke-width="2.5" stroke-dasharray="7 5"/>`+modes.map(m=>`<polyline points="${points(frame(m).curve)}" fill="none" stroke="${colours[m]}" stroke-width="3"/>`).join('')+axis('u',15,5)+axis('x',560,170)+text(300,22,en?'Seed 11 · dashed: reference':'种子11 · 虚线：参考')+text(60,213,'0')+text(540,213,'1')+legend(modes.map(m=>[n[m],colours[m]]));
  output.textContent=modes.map(m=>`${n[m]} ${(100*frame(m).relativeL2).toFixed(2)}%`).join(' · ');host.dataset.step=String(frame('adaptive').step);host.dataset.adaptiveError=String(frame('adaptive').relativeL2);host.dataset.guardedError=String(frame('guarded').relativeL2);return;
 }
 if(kind==='gradient-norms'){
  const f=frame('adaptive'),vals=[f.residualNorm,f.boundaryNorm,f.weightedBoundaryNorm],labels=[String.raw`\|g_r\|_2`,String.raw`\|g_b\|_2`,String.raw`\|w g_b\|_2`],logs=vals.map(v=>Math.log10(Math.max(1e-12,v))),low=Math.min(-5,...logs)-.2,high=Math.max(2,...logs)+.2;
  svg.innerHTML=`<path d="M60 32V190H570" fill="none" stroke="#ced8df" stroke-width="2.8"/>`+vals.map((v,i)=>{const top=185-(logs[i]-low)/(high-low)*135;return `<rect x="${115+155*i}" y="${top}" width="64" height="${185-top}" fill="${['#79d4ef','#d5dce0','#ff8e9e'][i]}"/>`+text(147+155*i,top-8,v.toExponential(1))+`<foreignObject x="${85+155*i}" y="194" width="124" height="38"><div xmlns="http://www.w3.org/1999/xhtml" class="paper-axis" style="text-align:center">${mathHtml(labels[i],false)}</div></foreignObject>`;}).join('')+text(300,22,en?'Gradient norms · log-height bars':'梯度范数 · 对数柱高')+text(300,252,en?'Ratio run: raw vs weighted boundary':'比值法：边界梯度加权前后');
  output.textContent=en?`Step ${f.step} · weight ${f.weight.toExponential(2)}`:`步数 ${f.step} · 权重 ${f.weight.toExponential(2)}`;host.dataset.step=String(f.step);return;
 }
 if(kind==='gradient-weight'){
  const upper=Math.ceil(Math.max(2,...modes.flatMap(m=>trace.runs[`${m}-11`].frames.map(f=>Math.log10(f.weight)))));
  const points=m=>{const all=trace.runs[`${m}-11`].frames,count=Math.floor(progress*(all.length-1))+1;return all.slice(0,count).map(f=>`${60+480*f.step/trace.config.steps},${185-150*Math.log10(f.weight)/upper}`).join(' ');};
  svg.innerHTML=`<path d="M60 28V185H555" fill="none" stroke="#ced8df" stroke-width="2.8"/>`+modes.map(m=>`<polyline points="${points(m)}" fill="none" stroke="${colours[m]}" stroke-width="3"/>`).join('')+text(48,190,'1','end')+`<foreignObject x="-5" y="22" width="54" height="36"><div xmlns="http://www.w3.org/1999/xhtml" class="paper-axis" style="text-align:right">${mathHtml(`10^{${upper}}`,false)}</div></foreignObject>`+axis('w',5,5)+text(60,214,'0')+text(300,214,en?'Adam step':'Adam 步数')+text(540,214,String(trace.config.steps))+legend(modes.map(m=>[n[m],colours[m]]));
  output.textContent=en?`Ratio ${frame('adaptive').weight.toExponential(2)} · guarded ${frame('guarded').weight.toFixed(1)}`:`比值 ${frame('adaptive').weight.toExponential(2)} · 限幅 ${frame('guarded').weight.toFixed(1)}`;host.dataset.step=String(frame('adaptive').step);return;
 }
 if(kind==='gradient-error'){
  const allModes=['unweighted','fixed100','adaptive','guarded'],errors=Object.values(trace.runs).map(r=>100*r.relativeL2),low=Math.floor(Math.log10(Math.min(...errors))),high=Math.ceil(Math.log10(Math.max(...errors))),py=v=>185-(Math.log10(v)-low)/(high-low)*145;
  svg.innerHTML=`<path d="M60 30V185H585" fill="none" stroke="#ced8df" stroke-width="2.8"/>`+[...Array(high-low+1)].map((_,i)=>text(48,py(10**(low+i))+6,`1e${low+i}`,'end')).join('')+allModes.map((m,i)=>trace.config.seeds.map((seed,j)=>`<circle cx="${125+i*130+(j-1)*12}" cy="${py(100*trace.runs[`${m}-${seed}`].relativeL2)}" r="5" fill="${colours[m]}"/>`).join('')+text(125+i*130,218,n[m])).join('')+text(300,20,en?'Field error (%) · log axis':'场误差（%）· 对数轴')+text(300,250,en?'Each dot: one seed · 4,000 Adam steps':'每点一个种子 · 4000 步 Adam');
  output.textContent=en?'All three seeds are shown; no universal ranking.':'显示全部三个种子，不作普适排名。';return;
 }
}
