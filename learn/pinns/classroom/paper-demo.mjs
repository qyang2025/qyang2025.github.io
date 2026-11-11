import {drawSampling} from './sampling-demo.mjs?v=night-07a';
import {drawGPinn} from './gpinn-demo.mjs?v=night-06a';
import {paperTraceFiles as traceFiles,paperDemoMeta} from './paper-demo-contract.mjs';
import {drawCausal,causalKinds} from './causal-demo.mjs?v=night-05a';
import {drawTransport,transportKinds} from './transport-demo.mjs?v=night-04b';
import {drawGradient,gradientKinds} from './gradient-demo.mjs?v=night-03b';
import {mathHtml} from './math.mjs';
import {sentences} from './player.mjs';
const traces=new Map(),traceLoads=new Map();
function loadTrace(key){
 if(traceLoads.has(key)||typeof window==='undefined')return;
 traceLoads.set(key,fetch(new URL(traceFiles[key],import.meta.url),{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(value=>{if(!value)return;traces.set(key,value);for(const host of document.querySelectorAll(`[data-paper-trace="${key}"]`))draw(host,Number(host.dataset.progress||0));}).catch(()=>{}));
}
export function paperProgress(slide,position,activity={},language='en'){
 const counts=slide.beats.map(b=>sentences(language==='en'?b.textEn:b.text,language).length);
 if(paperDemoMeta[slide.paperDemo]?.replay){const fraction=activity.reason==='ended'?1:activity.duration>0?Math.min(1,activity.audioTime/activity.duration):0;return position.beat>0?1:Math.max(0,Math.min(1,(position.sentence-1+fraction)/Math.max(1,counts[0]-1)));}
 const prior=counts.slice(0,position.beat).reduce((a,b)=>a+b,0),fraction=activity.reason==='ended'?1:activity.duration>0?Math.min(1,activity.audioTime/activity.duration):0;
 return Math.max(0,Math.min(1,(prior+position.sentence+fraction)/counts.reduce((a,b)=>a+b,0)));
}
export function paperDemoHtml(slide,en){
 const kind=slide.paperDemo,key=Object.hasOwn(traceFiles,slide.paperTrace)?slide.paperTrace:'paper01';loadTrace(key);
 const isCode=!!paperDemoMeta[kind]?.code,hasMetrics=paperDemoMeta[kind]?.nodes===2;
 let code=['q.requires_grad_(True)','u = net(q)','du = grad(u, q, create_graph=True)','uxx = grad(du[:, 0], q,','           create_graph=True)[:, 0]'];
 if(kind==='inverse-code')code=['model.lambda1 = nn.Parameter(tensor(0.5))','model.beta = nn.Parameter(tensor(beta0))','lambda2 = softplus(model.beta)','opt = Adam(model.parameters())'];
 if(kind==='inverse-loss-code')code=['pred, ut, ux, uxx = derivatives(model, q)','f = ut + model.lambda1*pred*ux','f = f - model.lambda2*uxx','loss = mse(pred, y) + mean(f*f)'];
 if(paperDemoMeta[kind]?.customCode)code=slide.demoCode;
 return `<div class="scene-content paper-scene" data-paper-demo="${kind}" data-paper-trace="${key}" data-progress="0"><div class="${isCode?'paper-code':'paper-plot'} reveal-pending" data-diagram-node="0">${isCode?`<pre><code>${code.join('\n').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</code></pre>`:`<svg viewBox="0 0 640 260" role="img" aria-label="${en?'Physical field or recorded experiment':'物理场或已记录实验'}"></svg>`}</div>${hasMetrics?'<output class="paper-metrics reveal-pending" data-diagram-node="1"></output>':''}${slide.formula?`<div class="formula-box equation-step reveal-pending" data-formula-step="0">${mathHtml(slide.formula)}</div>`:''}</div>`;
}
export function syncPaperDemo(activity,position,slide,language){
 const host=document.querySelector('[data-paper-demo]');if(!host||activity.audioTime===undefined)return;
 const p=slide.id==='conditions'&&position.beat===0?0:paperProgress(slide,position,activity,language);host.dataset.progress=String(p);draw(host,p);
}
function draw(host,progress){
 const trace=traces.get(host.dataset.paperTrace||'paper01');if(!trace||paperDemoMeta[host.dataset.paperDemo]?.code)return;
 const kind=host.dataset.paperDemo,en=document.querySelector('#slide')?.lang==='en',svg=host.querySelector('svg');
 if(paperDemoMeta[kind]?.renderer==='sampling'){drawSampling(host,trace,progress,en);return;}
 if(paperDemoMeta[kind]?.renderer==='gpinn'){drawGPinn(host,trace,progress,en);return;}
 if(causalKinds.includes(kind)){drawCausal(host,trace,progress,en);return;}
 if(transportKinds.includes(kind)){drawTransport(host,trace,progress,en);return;}
 if(gradientKinds.includes(kind)){drawGradient(host,trace,progress,en);return;}
 if(kind.startsWith('inverse-')){drawInverse(host,trace,progress,en);return;}
 const axis=(symbol,x,y)=>`<foreignObject x="${x}" y="${y}" width="36" height="35"><div xmlns="http://www.w3.org/1999/xhtml" class="paper-axis">${mathHtml(symbol,false)}</div></foreignObject>`;
 if(kind==='samples'){
  const data=[...Array(13)].map((_,i)=>`<circle cx="${60+i*40}" cy="185" r="4" fill="#ffe071"/>`).join('')+[...Array(7)].flatMap((_,i)=>[60,540].map(x=>`<circle cx="${x}" cy="${185-i*22}" r="4" fill="#ffe071"/>`)).join('');
  const physics=[...Array(28)].map((_,i)=>`<circle cx="${80+(i*137)%440}" cy="${42+(i*47)%125}" r="3" fill="#79d4ef"/>`).join('');
  svg.innerHTML=`<path d="M60 30V185H555" fill="none" stroke="#ced8df" stroke-width="3"/>${data}${physics}${axis('x',565,170)}${axis('t',28,10)}<text x="300" y="217" text-anchor="middle">${en?'Gold: labelled edges · cyan: equation tests':'金色：边界标签 · 蓝色：方程检验点'}</text>`;return;
 }
 const mainRun=trace.runs.pinn||trace.runs.clean;const frameIndex=Math.min(mainRun.frames.length-1,Math.floor(progress*(mainRun.frames.length-1))),frame=mainRun.frames[frameIndex];
 const timeIndex=Math.min(trace.times.length-1,Math.floor(Math.min(1,progress*2)*(trace.times.length-1)));
 const physical=kind==='physical',truth=physical?trace.truth[timeIndex]:trace.truth.at(-1),initial=trace.truth[0];
 const points=values=>values.map((u,i)=>`${60+(trace.x[i]+1)*240},${105-70*u}`).join(' ');
 const path=(values,color,dash='')=>`<polyline points="${points(values)}" fill="none" stroke="${color}" stroke-width="3" ${dash?'stroke-dasharray="7 5"':''}/>`;
 const baseline=trace.runs['data-only'].frames.at(-1);
 svg.innerHTML=`<path d="M60 20V185H555M60 105H550" fill="none" stroke="#ced8df" stroke-width="2.8"/>${physical?path(initial,'#79d4ef',true):path(truth,'#79d4ef')}${path(physical?truth:frame.curve,'#ffe071')}${kind==='comparison'?path(baseline.curve,'#ff8e9e',true):''}${axis('x',565,172)}${axis('u',22,4)}<text x="60" y="209" text-anchor="middle">−1</text><text x="540" y="209" text-anchor="middle">1</text><text x="300" y="22" text-anchor="middle">${physical?`t = ${trace.times[timeIndex].toFixed(3)}`:en?'Final-time field':'终止时刻的场'}</text>${physical?`<path d="M125 244h30" stroke="#79d4ef" stroke-width="3" stroke-dasharray="6 4"/><text x="165" y="251">${en?'Initial':'初始'}</text><path d="M345 244h30" stroke="#ffe071" stroke-width="3"/><text x="385" y="251">${en?'Current':'当前'}</text>`:`<path d="M65 244h25" stroke="#79d4ef" stroke-width="3"/><text x="100" y="251">${en?'Reference':'参考'}</text><path d="M280 244h25" stroke="#ffe071" stroke-width="3"/><text x="315" y="251">PINN</text>${kind==='comparison'?`<path d="M425 244h25" stroke="#ff8e9e" stroke-width="3" stroke-dasharray="6 4"/><text x="460" y="251">${en?'Data only':'纯数据'}</text>`:''}`}`;
 const output=host.querySelector('output');if(output)output.textContent=en?`Adam ${frame.step}${frame.phase==='lbfgs'?' + L-BFGS':''} · relative error ${(frame.relativeL2*100).toFixed(2)}%`:`Adam ${frame.step}${frame.phase==='lbfgs'?' + L-BFGS':''} · 相对误差 ${(frame.relativeL2*100).toFixed(2)}%`;
 host.dataset.trainingStep=String(frame.step);host.dataset.physicalTime=String(trace.times[timeIndex]);
}
function drawInverse(host,trace,progress,en){
 const kind=host.dataset.paperDemo,svg=host.querySelector('svg');
 const axis=(symbol,x,y)=>`<foreignObject x="${x}" y="${y}" width="65" height="38"><div xmlns="http://www.w3.org/1999/xhtml" class="paper-axis">${mathHtml(symbol,false)}</div></foreignObject>`;
 const base=`<path d="M60 24V185H555" fill="none" stroke="#ced8df" stroke-width="2.8"/>`;
 if(kind==='inverse-observations'){
  const o=trace.observations,dots=o.x.map((x,i)=>`<circle cx="${60+(x+1)*240}" cy="${185-o.t[i]/trace.config.timeEnd*150}" r="2.9" fill="${o.clean[i]>=0?'#ffe071':'#79d4ef'}" opacity=".88"/>`).join('');
  svg.innerHTML=base+dots+axis('x',565,172)+axis('t',20,4)+`<text x="60" y="209" text-anchor="middle">−1</text><text x="540" y="209" text-anchor="middle">1</text><text x="300" y="25" text-anchor="middle">${en?'Actual observation locations':'实际观测位置'}</text><text x="300" y="249" text-anchor="middle">${en?'Gold: positive u · cyan: negative u':'金色：正值 · 蓝色：负值'}</text>`;return;
 }
 if(kind==='inverse-identifiability'){
  const colors=['#79d4ef','#ffe071','#ff8e9e'],points=values=>values.map((u,i)=>`${60+(trace.x[i]+1)*240},${105-70*u}`).join(' ');
  svg.innerHTML=base+`<path d="M60 105H550" fill="none" stroke="#8798a3" stroke-width="2"/>`+trace.alternatives.map((a,i)=>`<polyline points="${points(a.curve)}" fill="none" stroke="${colors[i]}" stroke-width="3"/>`).join('')+`<circle cx="300" cy="105" r="6" fill="#fff"/><text x="310" y="82">${en?'Sensor':'传感器'}</text>`+axis('x',565,172)+axis('u',22,4)+`<text x="300" y="25" text-anchor="middle">${en?'Different coefficients, same centre reading':'不同系数，相同中心读数'}</text><text x="60" y="209" text-anchor="middle">−1</text><text x="300" y="209" text-anchor="middle">0</text><text x="540" y="209" text-anchor="middle">1</text>`+colors.map((c,i)=>`<path d="M${100+i*170} 244h25" stroke="${c}" stroke-width="3"/><text x="${135+i*170}" y="251">${String.fromCharCode(65+i)}</text>`).join('');return;
 }
 const key=kind==='inverse-a'?'lambda1':'lambda2',truth=key==='lambda1'?trace.config.trueLambda1:trace.config.trueLambda2;
 const clean=trace.runs.clean.frames,noisy=trace.runs.noisy.frames,all=[truth,...clean.map(f=>f[key]),...noisy.map(f=>f[key])];
 const lower=Math.min(0,...all),upper=Math.max(...all)*1.1,py=v=>185-(v-lower)/(upper-lower)*150;
 const trajectory=frames=>frames.slice(0,Math.floor(progress*(frames.length-1))+1).map((f,i)=>`${60+i/(frames.length-1)*480},${py(f[key])}`).join(' ');
 svg.innerHTML=base+`<path d="M60 ${py(truth)}H540" fill="none" stroke="#d5dce0" stroke-width="2" stroke-dasharray="7 5"/><polyline points="${trajectory(clean)}" fill="none" stroke="#79d4ef" stroke-width="3"/><polyline points="${trajectory(noisy)}" fill="none" stroke="#ffe071" stroke-width="3"/>`+axis(key==='lambda1'?'\\lambda_1':'\\lambda_2',4,2)+`<text x="300" y="25" text-anchor="middle">${en?'Coefficient identification':'系数识别'}</text><text x="50" y="185" text-anchor="end">0</text><text x="50" y="45" text-anchor="end">${upper.toFixed(key==='lambda1'?1:2)}</text><text x="60" y="211" text-anchor="middle">0</text><text x="300" y="211" text-anchor="middle">${en?'Checkpoint':'检查点'}</text><text x="540" y="211" text-anchor="middle">${en?'Final':'最终'}</text><path d="M65 244h25" stroke="#79d4ef" stroke-width="3"/><text x="100" y="251">${en?'Clean':'干净'}</text><path d="M255 244h25" stroke="#ffe071" stroke-width="3"/><text x="290" y="251">${en?'1% noise':'1% 噪声'}</text><path d="M460 244h25" stroke="#d5dce0" stroke-width="2" stroke-dasharray="7 5"/><text x="495" y="251">${en?'Truth':'真值'}</text>`;
 const f=frames=>frames[Math.floor(progress*(frames.length-1))],digits=key==='lambda1'?5:6;
 host.querySelector('output').textContent=en?`Clean ${f(clean)[key].toFixed(digits)} · noise ${f(noisy)[key].toFixed(digits)}`:`干净 ${f(clean)[key].toFixed(digits)} · 噪声 ${f(noisy)[key].toFixed(digits)}`;
 host.dataset.parameter=key;host.dataset.coefficient=String(f(clean)[key]);host.dataset.noisyCoefficient=String(f(noisy)[key]);host.dataset.trainingStep=String(f(clean).step);
}
