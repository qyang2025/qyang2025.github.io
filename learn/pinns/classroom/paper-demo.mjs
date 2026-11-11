import {mathHtml} from './math.mjs';
import {sentences} from './player.mjs';
let trace;
if(typeof window!=='undefined')fetch(new URL('./courses/pinns-papers/01-raissi-2017/trace.json',import.meta.url),{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(value=>{trace=value;const host=document.querySelector('[data-paper-demo]');if(host)draw(host,Number(host.dataset.progress||0));}).catch(()=>{});
export function paperProgress(slide,position,activity={},language='en'){
 const counts=slide.beats.map(b=>sentences(language==='en'?b.textEn:b.text,language).length);
 if(['training','comparison'].includes(slide.paperDemo)){const fraction=activity.reason==='ended'?1:activity.duration>0?Math.min(1,activity.audioTime/activity.duration):0;return position.beat>0?1:Math.max(0,Math.min(1,(position.sentence-1+fraction)/Math.max(1,counts[0]-1)));}
 const prior=counts.slice(0,position.beat).reduce((a,b)=>a+b,0),fraction=activity.reason==='ended'?1:activity.duration>0?Math.min(1,activity.audioTime/activity.duration):0;
 return Math.max(0,Math.min(1,(prior+position.sentence+fraction)/counts.reduce((a,b)=>a+b,0)));
}
export function paperDemoHtml(slide,en){
 const kind=slide.paperDemo;
 const code=['q.requires_grad_(True)','u = net(q)','du = grad(u, q, create_graph=True)','uxx = grad(du[:, 0], q,','           create_graph=True)[:, 0]'];
 return `<div class="scene-content paper-scene" data-paper-demo="${kind}" data-progress="0"><div class="${kind==='code'?'paper-code':'paper-plot'} reveal-pending" data-diagram-node="0">${kind==='code'?`<pre><code>${code.join('\n').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</code></pre>`:`<svg viewBox="0 0 640 260" role="img" aria-label="${en?'Burgers field or training points':'Burgers 场或训练点'}"></svg>`}</div>${kind==='training'||kind==='comparison'?'<output class="paper-metrics reveal-pending" data-diagram-node="1"></output>':''}${slide.formula?`<div class="formula-box equation-step reveal-pending" data-formula-step="0">${mathHtml(slide.formula)}</div>`:''}</div>`;
}
export function syncPaperDemo(activity,position,slide,language){
 const host=document.querySelector('[data-paper-demo]');if(!host||activity.audioTime===undefined)return;
 const p=slide.id==='conditions'&&position.beat===0?0:paperProgress(slide,position,activity,language);host.dataset.progress=String(p);draw(host,p);
}
function draw(host,progress){
 if(!trace||host.dataset.paperDemo==='code')return;
 const kind=host.dataset.paperDemo,en=document.querySelector('#slide')?.lang==='en',svg=host.querySelector('svg');
 const axis=(symbol,x,y)=>`<foreignObject x="${x}" y="${y}" width="36" height="35"><div xmlns="http://www.w3.org/1999/xhtml" class="paper-axis">${mathHtml(symbol,false)}</div></foreignObject>`;
 if(kind==='samples'){
  const data=[...Array(13)].map((_,i)=>`<circle cx="${60+i*40}" cy="185" r="4" fill="#ffe071"/>`).join('')+[...Array(7)].flatMap((_,i)=>[60,540].map(x=>`<circle cx="${x}" cy="${185-i*22}" r="4" fill="#ffe071"/>`)).join('');
  const physics=[...Array(28)].map((_,i)=>`<circle cx="${80+(i*137)%440}" cy="${42+(i*47)%125}" r="3" fill="#79d4ef"/>`).join('');
  svg.innerHTML=`<path d="M60 30V185H555" fill="none" stroke="#ced8df" stroke-width="3"/>${data}${physics}${axis('x',565,170)}${axis('t',28,10)}<text x="300" y="217" text-anchor="middle">${en?'Gold: labelled edges · cyan: equation tests':'金色：边界标签 · 蓝色：方程检验点'}</text>`;return;
 }
 const frameIndex=Math.min(trace.runs.pinn.frames.length-1,Math.floor(progress*(trace.runs.pinn.frames.length-1))),frame=trace.runs.pinn.frames[frameIndex];
 const timeIndex=Math.min(trace.times.length-1,Math.floor(Math.min(1,progress*2)*(trace.times.length-1)));
 const physical=kind==='physical',truth=physical?trace.truth[timeIndex]:trace.truth.at(-1),initial=trace.truth[0];
 const points=values=>values.map((u,i)=>`${60+(trace.x[i]+1)*240},${105-70*u}`).join(' ');
 const path=(values,color,dash='')=>`<polyline points="${points(values)}" fill="none" stroke="${color}" stroke-width="3" ${dash?'stroke-dasharray="7 5"':''}/>`;
 const baseline=trace.runs['data-only'].frames.at(-1);
 svg.innerHTML=`<path d="M60 20V185H555M60 105H550" fill="none" stroke="#ced8df" stroke-width="2.8"/>${physical?path(initial,'#79d4ef',true):path(truth,'#79d4ef')}${path(physical?truth:frame.curve,'#ffe071')}${kind==='comparison'?path(baseline.curve,'#ff8e9e',true):''}${axis('x',565,172)}${axis('u',22,4)}<text x="60" y="209" text-anchor="middle">−1</text><text x="540" y="209" text-anchor="middle">1</text><text x="300" y="22" text-anchor="middle">${physical?`t = ${trace.times[timeIndex].toFixed(3)}`:en?'Final-time field':'终止时刻的场'}</text>${physical?`<path d="M125 244h30" stroke="#79d4ef" stroke-width="3" stroke-dasharray="6 4"/><text x="165" y="251">${en?'Initial':'初始'}</text><path d="M345 244h30" stroke="#ffe071" stroke-width="3"/><text x="385" y="251">${en?'Current':'当前'}</text>`:`<path d="M65 244h25" stroke="#79d4ef" stroke-width="3"/><text x="100" y="251">${en?'Reference':'参考'}</text><path d="M280 244h25" stroke="#ffe071" stroke-width="3"/><text x="315" y="251">PINN</text>${kind==='comparison'?`<path d="M425 244h25" stroke="#ff8e9e" stroke-width="3" stroke-dasharray="6 4"/><text x="460" y="251">${en?'Data only':'纯数据'}</text>`:''}`}`;
 const output=host.querySelector('output');if(output)output.textContent=en?`Adam ${frame.step}${frame.phase==='lbfgs'?' + L-BFGS':''} · relative error ${(frame.relativeL2*100).toFixed(2)}%`:`Adam ${frame.step}${frame.phase==='lbfgs'?' + L-BFGS':''} · 相对误差 ${(frame.relativeL2*100).toFixed(2)}%`;
 host.dataset.trainingStep=String(frame.step);host.dataset.physicalTime=String(trace.times[timeIndex]);
}
