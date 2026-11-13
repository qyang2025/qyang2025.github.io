import {mathHtml} from './math.mjs?v=paper20focus1';
export const causalKinds=['causal-physical','causal-training','causal-weights','causal-energy','causal-phase','causal-error','causal-code'];
const colours={uniform:'#79d4ef',fixed:'#ffe071',annealed:'#ff8e9e'};
const names={en:{uniform:'Uniform',fixed:'Fixed ε',annealed:'Annealed'},zh:{uniform:'均匀权重',fixed:'固定ε',annealed:'退火ε'}};
export function causalFrame(trace,mode,progress,seed=11){const f=trace.runs[`${mode}-${seed}`].frames;return f[Math.min(f.length-1,Math.floor(Math.max(0,Math.min(1,progress))*(f.length-1)))];}
export function prefixWeights(losses,epsilon){let prefix=0;return losses.map(v=>{const weight=Math.exp(-epsilon*prefix);prefix+=v;return weight;});}
export function drawCausal(host,trace,progress,en){
 const svg=host.querySelector('svg'),kind=host.dataset.paperDemo,n=names[en?'en':'zh'];if(!svg)return;
 const text=(x,y,s,anchor='middle')=>`<text x="${x}" y="${y}" text-anchor="${anchor}">${s}</text>`,axis=(s,x,y)=>`<foreignObject data-axis-label="${x<60?'y':x>=540&&y>=140?'x':''}" x="${x}" y="${y}" width="60" height="38"><div xmlns="http://www.w3.org/1999/xhtml" class="paper-axis">${mathHtml(s,false)}</div></foreignObject>`;
 const modes=['uniform','fixed','annealed'],legend=(y=249)=>modes.map((m,i)=>`<path d="M${70+i*180} ${y-7}h24" stroke="${colours[m]}" stroke-width="3"/>`+text(100+i*180,y,n[m],'start')).join('');
 const frame=m=>causalFrame(trace,m,progress),output=host.querySelector('output');
 if(kind==='causal-physical'){
  const time=Math.min(1,progress*2),u=Math.cos(trace.config.omega*time),v=-Math.sin(trace.config.omega*time),cx=320+u*100,left=cx-28,points=[[70,115],...[...Array(17)].map((_,i)=>[85+(left-100)*i/16,115+(i%2?12:-12)]),[left,115]].map(p=>p.join(',')).join(' ');
  svg.innerHTML=`<path d="M60 68V165M60 165H555M320 155v18" stroke="#a3b2ba" stroke-width="3"/><polyline points="${points}" fill="none" stroke="#79d4ef" stroke-width="3"/><rect x="${left}" y="88" width="56" height="60" rx="5" fill="#d1ad47" stroke="#ffe071" stroke-width="2.5"/>`+text(cx,127,'m')+text(320,205,en?'Equilibrium position':'平衡位置')+text(320,25,`t = ${time.toFixed(2)}`)+text(320,249,en?'Analytic motion: no damping':'解析运动：无阻尼');host.dataset.physicalTime=String(time);host.dataset.position=String(u);host.dataset.scaledVelocity=String(v);return;
 }
 if(kind==='causal-training'){
  const points=row=>row.map((u,i)=>`${60+480*trace.times[i]},${110-65*u}`).join(' ');
  svg.innerHTML=`<path d="M60 25V185H555" fill="none" stroke="#ced8df" stroke-width="2.8"/><polyline points="${points(trace.truth.map(p=>p[0]))}" fill="none" stroke="#d5dce0" stroke-width="2" stroke-dasharray="7 5"/>`+modes.map(m=>`<polyline points="${points(frame(m).curve)}" fill="none" stroke="${colours[m]}" stroke-width="3"/>`).join('')+axis('u',15,5)+axis('t',560,170)+text(60,213,'0')+text(540,213,'1')+text(300,22,en?'Displacement · dashed reference':'位移 · 虚线参考')+legend();output.textContent=modes.map(m=>`${n[m]} ${(100*frame(m).relativeL2).toFixed(2)}%`).join(' · ');host.dataset.annealedError=String(frame('annealed').relativeL2);host.dataset.step=String(frame('annealed').step);return;
 }
 if(kind==='causal-weights'){
  const f=frame('annealed');svg.innerHTML=`<path d="M60 30V185H560" fill="none" stroke="#ced8df" stroke-width="2.8"/>`+f.weights.map((w,i)=>`<rect x="${88+i*57}" y="${185-140*w}" width="35" height="${140*w}" rx="2" fill="#ffe071"/>`+text(105+i*57,213,String(i+1))).join('')+text(40,190,'0')+text(40,50,'1')+axis('w_i',8,0)+text(300,25,en?'Temporal residual gates':'时间残差门控')+text(300,249,en?'Earlier bin → later bin':'较早时间格 → 较晚时间格');output.textContent=en?`ε=${f.epsilon} · minimum weight ${Math.min(...f.weights).toFixed(3)}`:`ε=${f.epsilon} · 最小权重 ${Math.min(...f.weights).toFixed(3)}`;host.dataset.epsilon=String(f.epsilon);host.dataset.minimumWeight=String(Math.min(...f.weights));return;
 }
 if(kind==='causal-phase'){
  const points=row=>row.map(p=>`${300+90*p[0]},${120-90*p[1]}`).join(' ');
  svg.innerHTML=`<path d="M150 120H455M300 24V214" stroke="#899ba5" stroke-width="2"/><polyline points="${points(trace.truth)}" fill="none" stroke="#d5dce0" stroke-width="2.5" stroke-dasharray="7 5"/>`+modes.map(m=>`<polyline points="${points(trace.runs[`${m}-11`].field)}" fill="none" stroke="${colours[m]}" stroke-width="3"/>`).join('')+axis('u',458,103)+axis('v',280,0)+legend();output.textContent=en?'Frequency-normalised velocity · seed 11':'按频率归一化的速度 · 种子11';return;
 }
 if(kind==='causal-energy'){
  const rows=modes.map(m=>trace.runs[`${m}-11`].field.map(p=>p[0]**2+p[1]**2)),low=Math.min(.98,...rows.flat()),high=Math.max(1.02,...rows.flat()),py=v=>185-(v-low)/(high-low)*150,points=row=>row.map((u,i)=>`${60+480*trace.times[i]},${py(u)}`).join(' ');
  svg.innerHTML=`<path d="M60 25V185H555M60 ${py(1)}H540" fill="none" stroke="#ced8df" stroke-width="2.8" stroke-dasharray="0"/>`+rows.map((row,i)=>`<polyline points="${points(row)}" fill="none" stroke="${colours[modes[i]]}" stroke-width="3"/>`).join('')+text(36,190,low.toFixed(2))+text(36,42,high.toFixed(2))+text(60,213,'0')+text(540,213,'1')+axis('t',565,170)+text(300,22,en?'Normalised energy · reference 1':'归一化能量 · 参考值1')+legend();output.textContent=en?'Energy is validation only, not a training penalty.':'能量只用于验证，不作为训练惩罚。';return;
 }
 if(kind==='causal-error'){
  const values=Object.values(trace.runs).map(r=>100*r.relativeL2),low=Math.floor(Math.log10(Math.min(...values))),high=Math.max(low+1,Math.ceil(Math.log10(Math.max(...values)))),py=v=>185-(Math.log10(v)-low)/(high-low)*145;
  svg.innerHTML=`<path d="M60 30V185H585" fill="none" stroke="#ced8df" stroke-width="2.8"/>`+[...Array(high-low+1)].map((_,i)=>text(48,py(10**(low+i))+6,`1e${low+i}`,'end')).join('')+modes.map((m,i)=>trace.config.seeds.map((seed,j)=>`<circle cx="${145+i*165+(j-1)*12}" cy="${py(100*trace.runs[`${m}-${seed}`].relativeL2)}" r="5" fill="${colours[m]}"/>`).join('')+text(145+i*165,218,n[m])).join('')+text(300,20,en?'Full-state error (%) · log axis':'全状态误差（%）· 对数轴')+text(300,249,en?'Three seeds · capped runs disclosed':'三个种子 · 披露触发上限的运行');output.textContent=en?'Same step ceiling and time cap; actual updates may differ.':'相同步数上限与时间上限，实际更新次数可能不同。';return;
 }
}
