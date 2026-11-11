import {professorAvoidance} from './board-placement.mjs';
export const SLIDE_WIDTH=960,SLIDE_HEIGHT=540;
export function fittedSlideSize(width,height){const scale=Math.max(.01,Math.min(width/SLIDE_WIDTH,height/SLIDE_HEIGHT));return{width:SLIDE_WIDTH*scale,height:SLIDE_HEIGHT*scale,scale};}
export class ClassroomViewport {
 constructor(){
  this.stage=document.getElementById('lecture-stage');this.canvas=document.getElementById('lecture-canvas');this.column=document.querySelector('.lecture-column');this.question=document.querySelector('.question-area');this.settings=document.querySelector('.professor-panel');
  this.placeholder=document.createComment('question panel on narrow screens');this.question.before(this.placeholder);
  this.schedule=this.schedule.bind(this);this.fit=this.fit.bind(this);window.addEventListener('resize',this.schedule);
  this.resize=new ResizeObserver(this.schedule);for(const el of [this.column,document.getElementById('course-roadmap'),document.querySelector('.lecture-meta'),document.querySelector('.playback'),document.querySelector('.caption')])this.resize.observe(el);
  this.mutations=new MutationObserver(this.schedule);this.mutations.observe(document.getElementById('slide'),{childList:true,subtree:true});
  document.fonts?.ready.then(this.schedule);this.fit();
 }
 schedule(){if(this.closed||this.frame)return;this.frame=requestAnimationFrame(()=>{this.frame=null;this.fit();});}
 fit(){
  const fixed=innerWidth>=900&&innerHeight>=600;document.documentElement.classList.toggle('classroom-fitted',fixed);
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
   const rects=[...scene.querySelectorAll('.schematic-node:not([hidden]),.plot-frame,.formula-box,.board-equation,.inline-demo-columns')].filter(e=>getComputedStyle(e).visibility!=='hidden'||e.classList.contains('reveal-pending')).map(e=>e.getBoundingClientRect()).filter(r=>r.width&&r.height);
   if(p?.width&&rects.length){const content={left:Math.min(...rects.map(r=>r.left)),right:Math.max(...rects.map(r=>r.right)),top:Math.min(...rects.map(r=>r.top)),bottom:Math.max(...rects.map(r=>r.bottom))};const scale=s.width/SLIDE_WIDTH;const shift=professorAvoidance(content,{left:p.left+p.width*.24,right:p.right,top:p.top+12*scale,bottom:p.bottom},{left:s.left+24*scale,bottom:slide.querySelector('footer').getBoundingClientRect().top-16*scale},16*scale);scene.style.translate=`${shift.x/scale}px ${shift.y/scale}px`;scene.dataset.placementReview=String(!!shift.needsReflow);}
  }

 }
 close(){this.closed=true;cancelAnimationFrame(this.frame);this.resize.disconnect();this.mutations.disconnect();window.removeEventListener('resize',this.schedule);}
}

function layoutDiagram(scene){
 const figure=scene.querySelector('.schematic');if(!figure)return;
 const nodes=[...figure.querySelectorAll('.schematic-node')];
 // Measure in the logical canvas, before the viewport transform. Include future
 // nodes so progressive reveals do not cause existing boxes to jump sideways.
 const widths=nodes.map(node=>{let width=0;for(const text of node.querySelectorAll('strong,span')){const saved=text.style.cssText;Object.assign(text.style,{position:'absolute',width:'max-content',maxWidth:'none',whiteSpace:'nowrap',visibility:'hidden'});width=Math.max(width,text.offsetWidth);text.style.cssText=saved;}return Math.ceil(width+40);});
 const tree=figure.classList.contains('schematic-tree');
 nodes.forEach((node,i)=>{node.style.flexBasis=tree?'auto':`${Math.max(150,widths[i])}px`;node.style.flexGrow=tree?'0':String(Math.max(150,widths[i]));});
 const arrowLabels=[...figure.querySelectorAll('.schematic-link')];
 let linkWidth=0;
 const measure=document.createElement('canvas').getContext('2d');
 for(const link of arrowLabels){const text=link.querySelector('span'),font=getComputedStyle(text);measure.font=`${font.fontWeight} ${font.fontSize} ${font.fontFamily}`;const longest=Math.max(0,...text.textContent.split(/\s+/).map(word=>measure.measureText(word).width));const width=Math.ceil(Math.max(110,longest+24,Math.min(260,measure.measureText(text.textContent).width+24)));link.style.flexBasis=tree?'auto':`${width}px`;link.style.width=`${width}px`;linkWidth+=width;}
 const links=linkWidth;
 const desired=Math.min(880,Math.max(560,widths.reduce((a,b)=>a+b,0)+links+Math.max(0,nodes.length+arrowLabels.length-1)*12));
 scene.style.width=`min(100%, ${desired}px)`;
}
