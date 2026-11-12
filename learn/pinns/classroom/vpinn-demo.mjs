import {mathHtml} from './math.mjs';
const modes=['strong','weak-k1','weak-k8','weak-q4'],colours=['#79d4ef','#c7b4ff','#ffe071','#ff8e9e'];
const labels=en=>en?['Strong','K1 Q32','K8 Q32','K8 Q4']:['强形式','K1 Q32','K8 Q32','K8 Q4'];
export function legendre(k,x){if(k===0)return 1;if(k===1)return x;let a=1,b=x;for(let n=2;n<=k;n++){const c=((2*n-1)*x*b-(n-1)*a)/n;a=b;b=c;}return b;}
export function vpinnFrame(trace,kind,progress,seed=11){const frames=trace.runs[`${kind}-${seed}`].frames;return frames[Math.floor(Math.max(0,Math.min(1,progress))*(frames.length-1))];}
export function drawVpinn(host,trace,progress,en){
 const svg=host.querySelector('svg'),output=host.querySelector('output'),kind=host.dataset.paperDemo;if(!svg)return;
 const tx=(x,y,s,anchor='middle')=>`<text x="${x}" y="${y}" text-anchor="${anchor}">${s}</text>`,mx=(s,x,y,w=65)=>`<foreignObject x="${x}" y="${y}" width="${w}" height="36"><div xmlns="http://www.w3.org/1999/xhtml" class="paper-axis">${mathHtml(s,false)}</div></foreignObject>`,px=x=>60+240*(x+1),path=(values,py,c,dash=false)=>`<polyline points="${values.map((v,i)=>`${px(trace.x[i])},${py(v)}`).join(' ')}" fill="none" stroke="${c}" stroke-width="3"${dash?' stroke-dasharray="7 5"':''}/>`;
 const base=(py,axis='u')=>`<path d="M60 37V188H555" fill="none" stroke="#ced8df" stroke-width="2.8"/>`+mx(axis,12,16)+mx('x',562,176)+tx(60,214,'−1')+tx(300,214,'0')+tx(540,214,'1');
 const legend=()=>modes.map((_,i)=>`<path d="M${64+i*139} 242h18" stroke="${colours[i]}" stroke-width="3"/>`+tx(86+i*139,249,labels(en)[i],'start')).join('');
 if(kind==='vpinn-physical'){
  const peak=Math.max(...trace.truth),py=u=>190-78*u/peak;
  const cells=Array.from({length:30},(_,i)=>{const u=trace.truth[Math.round(i/29*300)]/peak;return `<rect x="${60+i*16}" y="44" width="16.4" height="32" fill="rgb(${Math.round(45+205*u)},${Math.round(110+35*u)},${Math.round(195-125*u)})"/>`;}).join('');
  const dots=Array.from({length:8},(_,i)=>{const x=-.92+i*.26,q=2*x-.2*Math.PI*Math.cos(Math.PI*x),direction=Math.sign(q),phase=(progress*10+i/8)%1,z=Math.max(-.98,Math.min(.98,x+direction*.18*phase));return `<circle cx="${px(z)}" cy="60" r="3.2" fill="#fff1c0"/>`;}).join('');
  svg.innerHTML=cells+dots+`<rect x="60" y="44" width="480" height="32" rx="4" fill="none" stroke="#ced8df" stroke-width="2.8"/><path d="M60 103V190H555" fill="none" stroke="#ced8df" stroke-width="2.8"/>`+path(trace.truth,py,'#ffe071')+mx('u',12,95)+mx('x',562,177)+tx(48,195,'0','end')+tx(48,118,peak.toFixed(1),'end')+tx(60,215,'−1')+tx(300,215,'0')+tx(540,215,'1')+tx(300,24,en?'Distributed heating · cold ends':'分布热源 · 两端冷却')+tx(300,250,en?'Steady temperature · moving heat-flow markers':'稳态温度 · 移动标记示意热流');return;
 }
 if(kind==='vpinn-tests'){
  const py=v=>117-48*v,v1=trace.x.map(x=>legendre(2,x)-1),v2=trace.x.map(x=>legendre(3,x)-x),x=-1+2*((progress*2)%1),a=legendre(2,x)-1,b=legendre(3,x)-x;
  svg.innerHTML=base(py,'v_k')+`<path d="M60 117H540" stroke="#7a8b95" stroke-width="1.5"/>`+path(v1,py,colours[0])+path(v2,py,colours[2])+`<circle cx="${px(x)}" cy="${py(a)}" r="4" fill="${colours[0]}"/><circle cx="${px(x)}" cy="${py(b)}" r="4" fill="${colours[2]}"/>`+tx(48,122,'0','end')+tx(300,23,en?'Weighting shapes, not temperature':'加权形状，不是温度')+`<path d="M170 242h25" stroke="${colours[0]}" stroke-width="3"/><path d="M325 242h25" stroke="${colours[2]}" stroke-width="3"/>`+mx('v_1',210,227)+mx('v_2',365,227);return;
 }
 if(kind==='vpinn-projection'){
  const values=trace.x.map(x=>3*x*(legendre(2,x)-1)),py=v=>119-43*v,stop=Math.floor(progress*(trace.x.length-1));
  const fill=points=>`<polygon points="${px(points[0][0])},119 ${points.map(([x,y])=>`${px(x)},${py(y)}`).join(' ')} ${px(points.at(-1)[0])},119" fill="${points[0][0]<0?colours[0]:colours[3]}" opacity=".24"/>`;
  const left=trace.x.flatMap((x,i)=>i<=stop&&x<=0?[[x,values[i]]]:[]),right=trace.x.flatMap((x,i)=>i<=stop&&x>=0?[[x,values[i]]]:[]);
  svg.innerHTML=base(py,'r v_1')+`<path d="M60 119H540" stroke="#aebec7" stroke-width="2"/>`+(left.length>1?fill(left):'')+(right.length>1?fill(right):'')+path(values,py,'#ffe071')+tx(300,23,en?'Illustrative odd residual × even test':'示意：奇残差乘偶测试函数')+tx(300,249,en?'Signed areas cancel · residual is not zero':'正负面积抵消 · 残差并不为零');return;
 }
 if(kind==='vpinn-quadrature'){
  const q=4,nodes=trace.quadratureNodes[String(q)],py=v=>185-135*v,values=trace.x.map(x=>x**8);
  svg.innerHTML=base(py,'g')+path(values,py,colours[2])+nodes.x.map((x,i)=>`<path d="M${px(x)} 185V${py(x**8)}" stroke="${colours[0]}" stroke-width="2"/><circle cx="${px(x)}" cy="${py(x**8)}" r="${2.5+5*nodes.weights[i]}" fill="${colours[0]}"/>`).join('')+tx(48,190,'0','end')+tx(48,55,'1','end')+tx(300,23,en?`Quadrature nodes Q = ${q}`:`积分节点 Q = ${q}`)+mx('g=x^8',68,226,120)+tx(370,249,en?'Larger dots: larger weights':'圆点越大，权重越大');host.dataset.quadrature=String(q);return;
 }
 if(kind==='vpinn-blind'){
  const py=u=>183-100*u,other=trace.truth.map((u,i)=>u+.3*trace.blindExample.w[i]);
  svg.innerHTML=base(py)+path(trace.truth,py,colours[0])+path(other,py,colours[2])+tx(300,23,en?'Add a mode invisible to the first test':'添加第一个测试看不见的模式')+`<path d="M65 242h20" stroke="${colours[0]}" stroke-width="3"/><path d="M230 242h20" stroke="${colours[2]}" stroke-width="3"/>`+tx(95,249,en?'Reference':'参考','start')+tx(260,249,en?'Perturbed':'扰动后','start')+mx('w=P_3-P_1',410,227,220);return;
 }
 if(kind==='vpinn-training'){
  const frames=modes.map(m=>vpinnFrame(trace,m,progress)),all=[...trace.truth,...modes.flatMap(m=>trace.runs[`${m}-11`].frames.flatMap(f=>f.curve))],lo=Math.min(0,...all),hi=Math.max(...all),py=u=>183-135*(u-lo)/Math.max(.1,hi-lo);
  svg.innerHTML=base(py)+path(trace.truth,py,'#d4e1e8',true)+frames.map((f,i)=>path(f.curve,py,colours[i])).join('')+tx(48,py(lo)+5,lo.toFixed(1),'end')+tx(48,py(hi)+5,hi.toFixed(1),'end')+tx(300,23,en?'Field replay · dashed analytic reference':'温度回放 · 虚线为解析参考')+legend();output.textContent=modes.map((m,i)=>`${labels(en)[i]} ${(100*frames[i].relativeL2).toFixed(2)}%`).join(' · ');host.dataset.step=String(frames[2].step);return;
 }
 if(kind==='vpinn-moments'){
  const fs=modes.map(m=>vpinnFrame(trace,m,progress)),low=-7,high=2,py=v=>185-140*(Math.log10(Math.max(1e-7,Math.abs(v)))-low)/(high-low);
  svg.innerHTML=`<path d="M60 30V185H565" fill="none" stroke="#ced8df" stroke-width="2.8"/>`+[-6,-3,0].map(e=>tx(48,py(10**e)+5,`1e${e}`,'end')).join('')+fs.map((f,i)=>`<polyline points="${f.auditMoments.map((v,k)=>`${75+k*30},${py(v)}`).join(' ')}" fill="none" stroke="${colours[i]}" stroke-width="2.5"/>`).join('')+[1,4,8,12,16].map(k=>tx(75+(k-1)*30,214,String(k))).join('')+tx(300,23,en?'Audit moments · Q=128 · absolute/log':'审计矩 · Q=128 · 绝对值/对数')+legend();output.textContent=en?'Independent tests k=1…16 · floor 1e−7':'独立测试 k=1…16 · 绘图下限1e−7';host.dataset.step=String(fs[2].step);return;
 }
 if(kind==='vpinn-error'){
  const all=Object.values(trace.runs).map(r=>100*r.relativeL2),lo=Math.floor(Math.log10(Math.min(...all))),hi=Math.ceil(Math.log10(Math.max(...all))),py=v=>185-145*(Math.log10(v)-lo)/(hi-lo);
  svg.innerHTML=`<path d="M60 30V185H590" fill="none" stroke="#ced8df" stroke-width="2.8"/>`+Array.from({length:hi-lo+1},(_,i)=>tx(48,py(10**(lo+i))+5,`1e${lo+i}`,'end')).join('')+modes.map((m,i)=>trace.config.seeds.map((seed,j)=>`<circle cx="${110+i*140+(j-1)*12}" cy="${py(100*trace.runs[`${m}-${seed}`].relativeL2)}" r="5" fill="${colours[i]}"/>`).join('')+tx(110+i*140,214,labels(en)[i])).join('')+tx(300,23,en?'Field error (%) · all three seeds':'场误差（%）· 全部三个种子')+tx(300,249,en?'Same network and updates · different constraints':'相同网络与更新数 · 不同约束');output.textContent=en?'Strong form is already accurate here; no universal winner.':'本例强形式已很准确；不作普遍优劣结论。';return;
 }
}
