import {mathHtml} from './math.mjs?v=seriesfocus1';
const kinds=['soft1','soft100','hard','distance'],colors=['#79d4ef','#c7b4ff','#ffe071','#ff8e9e'];
export function boundaryFrame(t,k,p,seed=11){const f=t.runs[`${k}-${seed}`].frames;return f[Math.floor(Math.max(0,Math.min(1,p))*(f.length-1))];}
export function drawBoundary(host,t,p,en){
 const svg=host.querySelector('svg'),out=host.querySelector('output'),kind=host.dataset.paperDemo;if(!svg)return;
 const text=(x,y,s,a='middle')=>`<text x="${x}" y="${y}" text-anchor="${a}">${s}</text>`,math=(s,x,y,w=80)=>`<foreignObject data-axis-label="${x<60?'y':x>=540&&y>=140?'x':''}" x="${x}" y="${y}" width="${w}" height="36"><div xmlns="http://www.w3.org/1999/xhtml" class="paper-axis">${mathHtml(s,false)}</div></foreignObject>`,px=x=>70+235*(x+1),line=(xs,ys,py,c)=>`<polyline points="${xs.map((x,i)=>`${px(x)},${py(ys[i])}`).join(' ')}" fill="none" stroke="${c}" stroke-width="3"/>`,axes=(label='u')=>`<path d="M70 36V191H555" fill="none" stroke="#d4dce2" stroke-width="2.8"/>`+math(label,15,20)+math('x',560,179)+text(70,218,'−1')+text(305,218,'0')+text(540,218,'1'),legend=()=>kinds.map((_,i)=>`<path d="M${55+i*145} 242h18" stroke="${colors[i]}" stroke-width="3"/>`+text(77+i*145,249,(en?['Soft 1','Soft 100','Smooth','Distance']:['软 1','软 100','光滑','距离'])[i],'start')).join('');
 if(kind==='boundary-physical'){
  const cx=205,cy=132,R=88,n=22,cells=[];
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){const x=-1+(i+.5)*2/n,y=-1+(j+.5)*2/n;if(x*x+y*y>1)continue;const u=.2*x+1-x*x-y*y,v=Math.max(0,Math.min(1,u));cells.push(`<rect x="${cx+(x-1/n)*R}" y="${cy+(y-1/n)*R}" width="${2*R/n+.4}" height="${2*R/n+.4}" fill="rgb(${Math.round(45+205*v)},${Math.round(100+40*v)},${Math.round(195-125*v)})"/>`);}
  const dots=Array.from({length:10},(_,i)=>{const a=i*2*Math.PI/10,r=.14+.7*((p*5+i/10)%1),x=.1+r*Math.cos(a),y=r*Math.sin(a);return `<circle cx="${cx+R*x}" cy="${cy+R*y}" r="3" fill="#fff5c6"/>`;}).join('');
  svg.innerHTML=`<defs><clipPath id="disk-clip"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath></defs><g clip-path="url(#disk-clip)">${cells.join('')}${dots}</g><circle cx="${cx}" cy="${cy}" r="${R}" stroke="#79d4ef" stroke-width="3" fill="none"/>`+text(320,25,en?'Steady heated disk · prescribed rim':'稳态受热圆盘 · 已知圆周温度')+`<path d="M${cx-R-8} ${cy+R+7}h${2*R+25}m-${2*R+25} 0V35" stroke="#d4dce2" stroke-width="2.5" fill="none"/>`+math('x',cx+R+20,cy+R-9)+math('y',cx-R-30,25)+text(456,91,en?'Interior source: 4':'内部热源：4')+math('g=0.2x',371,109,200)+text(452,174,en?'Rim values fixed':'圆周温度固定')+text(320,252,en?'Moving markers: heat flux, not transient time':'移动标记表示热流，不是瞬态时间');return;
 }
 if(kind==='boundary-distance'){
  const py=v=>187-135*v;
  svg.innerHTML=axes('d,\\varphi')+line(t.x,t.x.map(x=>1-Math.abs(x)),py,colors[3])+line(t.x,t.x.map(x=>(1-x*x)/2),py,colors[2])+text(305,23,en?'Diameter · smooth and nonsmooth distances':'直径截面 · 零点相同，光滑性不同')+text(58,191,'0','end')+text(58,56,'1','end')+math('d=1-|x|',95,226,200)+math('\\varphi=(1-x^2)/2',330,226,260);return;
 }
 if(kind==='boundary-curvature'){
  const radii=Array.from({length:150},(_,i)=>.025+i*.975/149),cx=r=>70+470*r,py=v=>188-135*Math.log10(v)/Math.log10(40),curve=(f,c)=>`<polyline points="${radii.map(r=>`${cx(r)},${py(f(r))}`).join(' ')}" fill="none" stroke="${c}" stroke-width="3"/>`;
  svg.innerHTML=`<path d="M70 35V190H555" stroke="#d4dce2" stroke-width="2.8" fill="none"/>`+curve(r=>1/r,colors[3])+curve(()=>2,colors[2])+text(320,23,en?'Curvature magnitude · logarithmic vertical scale':'曲率幅值 · 纵轴对数尺度')+text(57,192,'1','end')+text(57,57,'40','end')+text(70,219,'0')+text(540,219,'1')+math('r',562,178)+math('|\\Delta d|=1/r',90,226,230)+math('|\\Delta\\varphi|=2',350,226,230);return;
 }
 if(kind==='boundary-training'){
  const py=v=>183-111*v,frames=kinds.map(k=>boundaryFrame(t,k,p));
  host.dataset.trainingStep=String(frames[0].step);svg.innerHTML=axes()+line(t.x,t.truth,py,'#d4dce2')+kinds.map((k,i)=>line(t.x,frames[i].curve,py,colors[i])).join('')+text(305,23,en?`Diameter y = 0 · update ${frames[0].step}`:`直径 y = 0 · 更新 ${frames[0].step}`)+text(57,187,'0','end')+text(57,76,'1','end')+legend();
  if(out)out.textContent=(en?'Full-disk relative error: ':'全圆盘相对误差：')+frames.map((f,i)=>`${(en?['S1','S100','Smooth','Dist']:['软1','软100','光滑','距离'])[i]} ${(100*f.relativeL2).toFixed(2)}%`).join(' · ');return;
 }
 const boundary=kind==='boundary-error',values=kinds.map(k=>[11,22,33].map(seed=>{const r=t.runs[`${k}-${seed}`];return boundary?r.boundaryMax:r.relativeL2;})),y=v=>185-26*(Math.log10(Math.max(v,1e-16))+16)/3;
 // Identical log coordinates make exact boundary values and interior errors distinguishable.
 svg.innerHTML=`<path d="M70 35V190H570" stroke="#d4dce2" stroke-width="2.8" fill="none"/>`+[-16,-12,-8,-4,0].map(e=>text(60,y(10**e)+7,`1e${e}`,'end')).join('')+values.map((vs,i)=>vs.map((v,j)=>`<circle cx="${125+i*130+(j-1)*13}" cy="${y(v)}" r="4.5" fill="${colors[i]}"/>`).join('')).join('')+text(320,23,boundary?(en?'Held-out rim: maximum boundary error':'独立圆周：最大边界误差'):(en?'Full-disk relative field error':'全圆盘相对场误差'))+legend();
 if(out)out.textContent=boundary?(en?'Three seeds · exact ansatz at round-off level':'三个种子 · 精确构造达到舍入精度'):(en?'Three seeds · all final checkpoints retained':'三个种子 · 保留全部最终检查点');
}
