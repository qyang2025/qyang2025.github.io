import {professorAvoidance} from './board-placement.mjs';
export const SLIDE_WIDTH=960,SLIDE_HEIGHT=540;
export function fittedSlideSize(width,height){const scale=Math.max(.01,Math.min(width/SLIDE_WIDTH,height/SLIDE_HEIGHT));return{width:SLIDE_WIDTH*scale,height:SLIDE_HEIGHT*scale,scale};}
export class ClassroomViewport {
 constructor(){
  this.stage=document.getElementById('lecture-stage');this.canvas=document.getElementById('lecture-canvas');this.column=document.querySelector('.lecture-column');this.question=document.querySelector('.question-area');this.settings=document.querySelector('.professor-panel');
  this.placeholder=document.createComment('question panel on narrow screens');this.question.before(this.placeholder);
  this.panelButtons=document.createElement('div');this.panelButtons.className='classroom-panel-buttons';
  for(const [key,panel] of [['slides',document.querySelector('.outline-panel')],['resources',this.settings]]){
   panel.id ||= `classroom-${key}`;
   const button=document.createElement('button');button.type='button';button.dataset.panel=key;button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-expanded','false');
   button.addEventListener('click',()=>this.openPanel(document.documentElement.dataset.classroomPanel===key?'':key));this.panelButtons.append(button);
  }
  document.querySelector('.topbar').append(this.panelButtons);
  this.escape=event=>{if(event.key==='Escape'&&document.documentElement.dataset.classroomPanel){const key=document.documentElement.dataset.classroomPanel;this.openPanel('');this.panelButtons.querySelector(`[data-panel="${key}"]`).focus();}};
  document.addEventListener('keydown',this.escape);
  this.selectPanelItem=event=>{if(event.target.closest('#outline button')||event.type==='change')this.openPanel('');};
  document.getElementById('outline').addEventListener('click',this.selectPanelItem,true);document.getElementById('chapter-select')?.addEventListener('change',this.selectPanelItem);
  this.schedule=this.schedule.bind(this);this.fit=this.fit.bind(this);window.addEventListener('resize',this.schedule);
  this.resize=new ResizeObserver(this.schedule);for(const el of [this.column,document.getElementById('course-roadmap'),document.querySelector('.lecture-meta'),document.querySelector('.playback'),document.querySelector('.caption')])this.resize.observe(el);
  this.mutations=new MutationObserver(this.schedule);this.mutations.observe(document.getElementById('slide'),{childList:true,subtree:true});
  document.fonts?.ready.then(this.schedule);this.fit();
 }
 schedule(){if(this.closed||this.frame)return;this.frame=requestAnimationFrame(()=>{this.frame=null;this.fit();});}
 fit(){
  const fixed=innerWidth>=280&&innerHeight>=360,compact=fixed&&(innerWidth<900||innerHeight<600);
  document.documentElement.classList.toggle('classroom-fitted',fixed);document.documentElement.classList.toggle('classroom-compact',compact);
  if(!compact)this.openPanel('');
  const zh=document.documentElement.lang.startsWith('zh'),hasLiveQuestions=!!document.getElementById('live-question-form');for(const button of this.panelButtons.children)button.textContent=button.dataset.panel==='slides'?(zh?'课程目录':'Slides'):hasLiveQuestions?(zh?'提问与资料':'Ask / resources'):(zh?'资料与设置':'Resources');
  document.documentElement.style.setProperty('--classroom-header-height',`${document.querySelector('.topbar').getBoundingClientRect().height}px`);
  const controls=[document.getElementById('course-roadmap'),document.querySelector('.lecture-meta'),document.querySelector('.playback'),document.querySelector('.caption')];
  if(!fixed){if(this.question.parentNode!==this.column)this.placeholder.after(this.question);delete this.stage.dataset.fixedSlide;for(const el of [this.stage,...controls]){el.style.width='';el.style.height='';}this.canvas.style.transform='';return;}
  if(this.question.parentNode!==this.settings)this.settings.querySelector('.professor-description').after(this.question);
  this.stage.dataset.fixedSlide='true';
  const gap=parseFloat(getComputedStyle(this.column).rowGap)||0;
  const used=controls.reduce((sum,el)=>sum+el.getBoundingClientRect().height,0)+gap*4;
  const size=fittedSlideSize(this.column.clientWidth,Math.max(80,this.column.clientHeight-used));
  this.stage.style.width=`${size.width}px`;this.stage.style.height=`${size.height}px`;this.canvas.style.transform=`scale(${size.scale})`;
  for(const el of controls.slice(1))el.style.width=`${size.width}px`;
  this.stage.dataset.slideScale=size.scale.toFixed(4);
  const visual=document.querySelector('#slide .visual'),scene=visual?.querySelector('.scene-content');
  if(scene){layoutDiagram(scene);const nodes=[...scene.querySelectorAll('.schematic-node')];for(const node of nodes)node.style.minHeight='';const nodeHeight=Math.max(0,...nodes.map(node=>node.offsetHeight));for(const node of nodes)node.style.minHeight=`${nodeHeight}px`;scene.style.transform='none';scene.dataset.contentScale='1.0000';const chart=scene.querySelector('.plot-frame svg');if(chart){scene.style.setProperty('--axis-font-size',`${24/(chart.clientWidth/530)}px`)};}
  if(scene)scene.style.translate='none';
  if(visual&&scene){const free=Math.max(0,visual.clientHeight-scene.offsetHeight);visual.style.paddingTop=`${Math.min(free/2,Math.max(32,Math.min(64,free*.32)))}px`;}
  if(scene){
   const avatar=document.getElementById('avatar-stage'),slide=document.getElementById('slide'),p=avatar?.getBoundingClientRect(),s=slide.getBoundingClientRect();
   const rects=[...scene.querySelectorAll('.schematic-node:not([hidden]),.plot-frame,.formula-box,.board-equation,.inline-demo-columns,.paper-plot,.paper-code')].filter(e=>getComputedStyle(e).visibility!=='hidden'||e.classList.contains('reveal-pending')).map(e=>e.getBoundingClientRect()).filter(r=>r.width&&r.height);
   if(p?.width&&rects.length){const content={left:Math.min(...rects.map(r=>r.left)),right:Math.max(...rects.map(r=>r.right)),top:Math.min(...rects.map(r=>r.top)),bottom:Math.max(...rects.map(r=>r.bottom))};const scale=s.width/SLIDE_WIDTH;const shift=professorAvoidance(content,{left:p.left+p.width*.24,right:p.right,top:p.top+12*scale,bottom:p.bottom},{left:s.left+24*scale,bottom:slide.querySelector('footer').getBoundingClientRect().top-16*scale},16*scale);scene.style.translate=`${shift.x/scale}px ${shift.y/scale}px`;scene.dataset.placementReview=String(!!shift.needsReflow);}
  }

 }
 openPanel(key){document.documentElement.dataset.classroomPanel=key;for(const button of this.panelButtons.children)button.setAttribute('aria-expanded',String(button.dataset.panel===key));}
 close(){this.closed=true;cancelAnimationFrame(this.frame);this.resize.disconnect();this.mutations.disconnect();window.removeEventListener('resize',this.schedule);document.removeEventListener('keydown',this.escape);document.getElementById('outline').removeEventListener('click',this.selectPanelItem,true);document.getElementById('chapter-select')?.removeEventListener('change',this.selectPanelItem);this.panelButtons.remove();}
}

// Never fund long connectors by shrinking nodes below an unbreakable word.
export function diagramWidths(nodes,links,available=880,gap=12){
 const gaps=Math.max(0,nodes.length+links.length-1)*gap;
 const minimum=nodes.map(n=>Math.max(140,n.word+32));
 const arrows=links.map(l=>Math.max(54,l.word+16));
 const required=minimum.reduce((a,b)=>a+b,0)+arrows.reduce((a,b)=>a+b,0)+gaps;
 const desired=nodes.map((n,i)=>Math.max(minimum[i],n.full+32));
 const width=Math.min(available,Math.max(560,desired.reduce((a,b)=>a+b,0)+arrows.reduce((a,b)=>a+b,0)+gaps));
 let spare=Math.max(0,width-required),deficits=desired.map((v,i)=>v-minimum[i]),total=deficits.reduce((a,b)=>a+b,0);
 const result=minimum.map((v,i)=>v+(total?Math.min(spare,total)*deficits[i]/total:0));
 return{nodes:result,links:arrows,width,needsFold:required>available};
}
export function layoutDiagram(scene){
 const figure=scene.querySelector('.schematic');if(!figure)return;
 const nodes=[...figure.querySelectorAll('.schematic-node')],links=[...figure.querySelectorAll('.schematic-link')],tree=figure.classList.contains('schematic-tree');
 const canvas=document.createElement('canvas').getContext('2d');
 const measure=el=>{const font=getComputedStyle(el);canvas.font=`${font.fontWeight} ${font.fontSize} ${font.fontFamily}`;const clone=el.cloneNode(true);clone.querySelectorAll('.katex-mathml').forEach(x=>x.remove());const text=clone.textContent;const tokens=text.replace(/([\u3400-\u9fff])/g,' $1 ').split(/[ \t\r\n]+/).filter(Boolean);return{full:canvas.measureText(text).width,word:Math.max(0,...tokens.map(w=>canvas.measureText(w).width))};};
 const sizes=nodes.map(node=>{const m=[...node.querySelectorAll(':scope > strong,:scope > span')].map(measure);return{full:Math.max(0,...m.map(x=>x.full)),word:Math.max(0,...m.map(x=>x.word))};});
 const plan=diagramWidths(sizes,links.map(link=>measure(link.querySelector('span'))));
 const folded=!tree&&nodes.length===4&&plan.needsFold;figure.classList.toggle('schematic-folded',folded);
 nodes.forEach((node,i)=>{node.style.flexBasis=tree?'auto':`${plan.nodes[i]}px`;node.style.flexGrow='0';node.style.flexShrink='0';node.style.minWidth=tree?'0':`${plan.nodes[i]}px`;});
 links.forEach((link,i)=>{link.style.flexBasis=tree?'auto':`${plan.links[i]}px`;link.style.width=`${plan.links[i]}px`;});
 scene.style.width=`min(100%, ${plan.width}px)`;
}
