import {mathHtml} from './math.mjs?v=seriesfocus1';
export function installPythonDemo({pause,language}){
 const button=document.createElement('button');button.id='python-demo';button.className='button secondary';document.querySelector('.playback').append(button);
 const dialog=document.createElement('dialog');dialog.className='python-demo';document.body.append(dialog);
 let timer;
 function stop(){clearInterval(timer);timer=null;}
 dialog.addEventListener('close',stop);
 button.addEventListener('click',async()=>{
  pause();const en=language()==='en';
  const trace=await fetch('/learn/pinns/classroom/demos/pca-trace.json').then(r=>r.json());
  const t=(a,b)=>en?a:b;
  dialog.replaceChildren();
  dialog.innerHTML=`<div class="dialog-heading"><h2>${t('Python lab: rotate a projection','Python 实验：旋转投影方向')}</h2><button class="icon-button" data-dismiss>×</button></div><p>${t('Replay of locally executed Python results. Drag the angle or play the experiment.','本机 Python 已执行结果的回放。拖动角度或播放实验。')}</p><div class="demo-columns"><div><svg viewBox="0 0 500 330" aria-label="${t('Data cloud and projection','数据点与投影')}"></svg><div class="demo-equation"></div><output></output></div><pre><code></code></pre></div><label>${t('Direction angle','方向角度')} <input type="range" min="0" max="180" value="0" aria-label="${t('Direction angle','方向角度')}"></label><div class="demo-tools"><button class="button" data-run>${t('▶ Play demo','▶ 播放演示')}</button><button class="button secondary" data-reset>${t('Reset','重置')}</button><a href="/learn/pinns/classroom/demos/pca_demo.py" download>${t('Download runnable Python','下载可运行 Python')}</a><button class="button secondary" data-dismiss>${t('Return to slides','返回课件')}</button></div><p>${t('Uses sample covariance (divide by n−1). The lesson resumes only when you press Continue.','使用样本协方差（除以 n−1）。返回后点击继续讲解才恢复课堂。')}</p>`;
  dialog.querySelectorAll('[data-dismiss]').forEach(b=>b.onclick=()=>dialog.close());
  const code=dialog.querySelector('code');
  const lines=['Xc = center(X)','theta = degrees*pi/180','w = direction(theta)','z = project(Xc, w)','variance = sample_variance(z)'];
  for(const line of lines){const span=document.createElement('span');span.textContent=line;code.append(span);}
  const slider=dialog.querySelector('input');
  function draw(){const f=trace.frames[Number(slider.value)],scale=48,cx=250,cy=165;
   const point=(x,y)=>`${cx+x*scale},${cy-y*scale}`;
   let svg='<path d="M25 165H475 M250 15V315" stroke="#58636c"/>';
   svg+=`<line x1="${cx-f.w[0]*210}" y1="${cy+f.w[1]*210}" x2="${cx+f.w[0]*210}" y2="${cy-f.w[1]*210}" stroke="#ffe071" stroke-width="3"/>`;
   trace.Xc.forEach((p,i)=>{const q=[f.z[i]*f.w[0],f.z[i]*f.w[1]];svg+=`<polyline points="${point(...p)} ${point(...q)}" fill="none" stroke="#79d4ef" opacity=".23"/><circle cx="${cx+p[0]*scale}" cy="${cy-p[1]*scale}" r="4" fill="#79d4ef"/><circle cx="${cx+q[0]*scale}" cy="${cy-q[1]*scale}" r="3" fill="#ffe071"/>`;});
   dialog.querySelector('svg').innerHTML=svg;
   dialog.querySelector('.demo-equation').innerHTML=mathHtml(String.raw`\operatorname{Var}(z)=w^\mathsf{T}Cw=4\cos^2\theta+\sin^2\theta`);
   dialog.querySelector('output').textContent=`θ = ${f.degrees}°   ·   ${t('Variance','方差')} = ${f.variance.toFixed(3)}   ·   ${t('Maximum: 4 at 0° / 180°','最大值：0° / 180° 时为 4')}`;
   [...code.children].forEach((line,i)=>line.classList.toggle('active',i>=2));
  }
  slider.oninput=()=>{stop();draw();};dialog.querySelector('[data-reset]').onclick=()=>{stop();slider.value=0;draw();};
  dialog.querySelector('[data-run]').onclick=()=>{if(timer){stop();return;}if(Number(slider.value)>=180)slider.value=0;timer=setInterval(()=>{slider.value=Number(slider.value)+1;draw();if(Number(slider.value)>=180)stop();},80);};
  draw();dialog.showModal();
 });
 return {update(slide){button.hidden=!['worked','projection','variance-objective'].includes(slide.id);button.textContent=language()==='en'?'Python demo ↗':'Python 交互演示 ↗';}};
}
