import {mathHtml} from './math.mjs?v=paper20focus1';
const colours={pinn16:'#79d4ef',gpinn001:'#ffe071',gpinn1:'#ff8e9e',pinn32:'#c7b4ff'};
const names={en:{pinn16:'PINN 16',pinn32:'PINN 32',gpinn001:'gPINN .01',gpinn1:'gPINN 1'},zh:{pinn16:'PINN 16点',pinn32:'PINN 32点',gpinn001:'gPINN .01',gpinn1:'gPINN 1'}};
export function gpinnFrame(trace,mode,progress,seed=11){const frames=trace.runs[`${mode}-${seed}`].frames;return frames[Math.min(frames.length-1,Math.floor(Math.max(0,Math.min(1,progress))*(frames.length-1)))];}
export function sourceRamp(trace,fraction){return trace.x.map((x,i)=>x+fraction*(trace.truth[i]-x));}
export function drawGPinn(host,trace,progress,en){
 const svg=host.querySelector('svg'),kind=host.dataset.paperDemo,n=names[en?'en':'zh'];if(!svg)return;
 const text=(x,y,s,anchor='middle')=>`<text x="${x}" y="${y}" text-anchor="${anchor}">${s}</text>`,axis=(s,x,y,width=60)=>`<foreignObject data-axis-label="${x<60?'y':x>=540&&y>=140?'x':''}" x="${x}" y="${y}" width="${width}" height="38"><div xmlns="http://www.w3.org/1999/xhtml" class="paper-axis">${mathHtml(s,false)}</div></foreignObject>`;
 const modes=['pinn16','gpinn001','gpinn1'],legend=(y=249)=>modes.map((m,i)=>`<path d="M${60+i*185} ${y-7}h24" stroke="${colours[m]}" stroke-width="3"/>`+text(90+i*185,y,n[m],'start')).join('');
 const px=x=>60+480*x/Math.PI,frame=m=>gpinnFrame(trace,m,progress),output=host.querySelector('output');
 if(kind==='gpinn-physical'){
  const a=Math.min(1,progress*2),u=sourceRamp(trace,a),max=Math.max(...trace.truth)*1.05,points=u.map((v,i)=>`${px(trace.x[i])},${190-110*v/max}`).join(' ');
  const cells=[...Array(24)].map((_,i)=>{const value=u[Math.round(i*(u.length-1)/23)]/max;return `<rect x="${60+i*20}" y="38" width="20.4" height="28" fill="rgb(${Math.round(45+210*value)},${Math.round(110+35*value)},${Math.round(190-130*value)})"/>`;}).join('');
  svg.innerHTML=cells+`<rect x="60" y="38" width="480" height="28" rx="3" fill="none" stroke="#ced8df" stroke-width="2.8"/><path d="M60 78V190H555" fill="none" stroke="#ced8df" stroke-width="2.8"/><polyline points="${points}" fill="none" stroke="#ffe071" stroke-width="3"/>`+axis('u',15,70)+axis('x',560,172)+text(60,216,'0')+axis(String.raw`\pi`,527,192)+text(300,22,en?'Source ramp through equilibrium states':'热源逐步变化的平衡状态')+text(300,249,en?'Temperature u · fixed endpoint values':'温度 u · 端点值固定');host.dataset.sourceFraction=String(a);return;
 }
 if(kind==='gpinn-tangent'){
  const x0=Math.PI/6,h=.35,r=x=>Math.sin(2*x),slope=2*Math.cos(2*x0),py=v=>125-65*v,curve=trace.x.map(x=>`${px(x)},${py(r(x))}`).join(' ');
  svg.innerHTML=`<path d="M60 30V195H555" fill="none" stroke="#ced8df" stroke-width="2.8"/><polyline points="${curve}" fill="none" stroke="#ffe071" stroke-width="3"/><path d="M${px(x0-.35)} ${py(r(x0)-.35*slope)}L${px(x0+.55)} ${py(r(x0)+.55*slope)}" stroke="#d5dce0" stroke-width="3" stroke-dasharray="7 5"/><circle cx="${px(x0)}" cy="${py(r(x0))}" r="5" fill="#79d4ef"/><circle cx="${px(x0+h)}" cy="${py(r(x0+h))}" r="5" fill="#79d4ef"/>`+axis('r',17,5)+axis('x',560,178)+text(300,22,en?'Illustration: local residual and slope':'示意：局部残差及其斜率')+text(300,249,en?'Dashed: tangent · not a saved prediction':'虚线：切线 · 非训练预测');return;
 }
 if(kind==='gpinn-training'||kind==='gpinn-slope'){
  const slope=kind==='gpinn-slope',truth=slope?trace.truthSlope:trace.truth,all=[...truth,...modes.flatMap(m=>trace.runs[`${m}-11`].frames.flatMap(f=>slope?f.slope:f.curve))],low=Math.min(0,...all),high=Math.max(...all)*1.08,py=v=>185-145*(v-low)/(high-low),points=curve=>curve.map((v,i)=>`${px(trace.x[i])},${py(v)}`).join(' ');
  svg.innerHTML=`<path d="M60 25V185H555" fill="none" stroke="#ced8df" stroke-width="2.8"/><polyline points="${points(truth)}" fill="none" stroke="#d5dce0" stroke-width="2.5" stroke-dasharray="7 5"/>`+modes.map(m=>`<polyline points="${points(slope?frame(m).slope:frame(m).curve)}" fill="none" stroke="${colours[m]}" stroke-width="3"/>`).join('')+axis(slope?String.raw`u_x`:'u',7,2)+axis('x',560,170)+text(45,190,low.toFixed(1),'end')+text(45,47,high.toFixed(1),'end')+text(60,212,'0')+axis(String.raw`\pi`,527,190)+text(300,22,en?(slope?'Spatial slope · dashed reference':'Temperature · dashed reference'):(slope?'空间斜率 · 虚线参考':'温度 · 虚线参考'))+legend();
  const key=slope?'derivativeError':'fieldError';output.textContent=modes.map(m=>`${n[m]} ${(100*frame(m)[key]).toFixed(2)}%`).join(' · ');host.dataset.step=String(frame('gpinn001').step);host.dataset.gpinnError=String(frame('gpinn001')[key]);return;
 }
 if(kind==='gpinn-residual'){
  const all=modes.flatMap(m=>trace.runs[`${m}-11`].residual),bound=Math.max(.1,...all.map(Math.abs))*1.1,py=v=>112-65*v/bound,points=curve=>curve.map((v,i)=>`${px(trace.x[i])},${py(v)}`).join(' ');
  svg.innerHTML=`<path d="M60 25V185H555M60 112H540" fill="none" stroke="#ced8df" stroke-width="2.8"/>`+modes.map(m=>`<polyline points="${points(trace.runs[`${m}-11`].residual)}" fill="none" stroke="${colours[m]}" stroke-width="3"/>`).join('')+[...Array(16)].map((_,i)=>`<circle cx="${60+480*(i+.5)/16}" cy="185" r="3" fill="#d5dce0"/>`).join('')+axis('r',10,2)+axis('x',560,170)+text(300,22,en?'Residual between enforcement points':'测试点之间的残差')+text(300,215,en?'Marks: 16 enforcement locations':'标记：16个约束位置')+legend();
  output.textContent=en?`Held-out MSE: PINN ${trace.runs['pinn16-11'].heldoutResidualMSE.toExponential(1)} · gPINN ${trace.runs['gpinn001-11'].heldoutResidualMSE.toExponential(1)}`:`独立残差均方：PINN ${trace.runs['pinn16-11'].heldoutResidualMSE.toExponential(1)} · gPINN ${trace.runs['gpinn001-11'].heldoutResidualMSE.toExponential(1)}`;return;
 }
 if(kind==='gpinn-error'){
  const allModes=['pinn16','pinn32','gpinn001','gpinn1'],values=Object.values(trace.runs).map(r=>100*r.derivativeError),low=Math.floor(Math.log10(Math.min(...values))),high=Math.max(low+1,Math.ceil(Math.log10(Math.max(...values)))),py=v=>185-(Math.log10(v)-low)/(high-low)*145;
  svg.innerHTML=`<path d="M60 30V185H585" fill="none" stroke="#ced8df" stroke-width="2.8"/>`+[...Array(high-low+1)].map((_,i)=>text(48,py(10**(low+i))+6,`1e${low+i}`,'end')).join('')+allModes.map((m,i)=>trace.config.seeds.map((seed,j)=>`<circle cx="${125+i*130+(j-1)*12}" cy="${py(100*trace.runs[`${m}-${seed}`].derivativeError)}" r="5" fill="${colours[m]}"/>`).join('')+text(125+i*130,218,n[m])).join('')+text(300,20,en?'Spatial-slope error (%) · log axis':'空间斜率误差（%）· 对数轴')+text(300,249,en?'Three seeds · dense PINN uses twice the points':'三个种子 · 稠密PINN使用两倍点数');output.textContent=en?'Check both field and derivative errors before ranking.':'排名之前，同时检查场与导数误差。';return;
 }
}
