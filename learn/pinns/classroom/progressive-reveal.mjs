import {attentionTarget} from './attention.mjs';
import {sentences} from './player.mjs';
export function revealState(slide,beat,sentence,language='zh',{freshBeat=false}={}){
 const state={nodes:new Set(),formulas:new Set(),chart:false};
 for(let b=freshBeat?beat:0;b<=beat;b++){
  const text=language==='en'?(slide.beats[b].textEn||slide.beats[b].text):slide.beats[b].text;
  const end=b===beat?sentence:sentences(text,language).length-1;
  for(let s=0;s<=end;s++){const cue=attentionTarget(slide,b,s,language);if(cue.kind==='node')state.nodes.add(cue.index);if(cue.kind==='formula')state.formulas.add(cue.index);if(cue.kind==='chart')state.chart=true;}
 }
 if(slide.integratedEquation){if(state.nodes.has(0))state.formulas.add(0);if(state.formulas.has(0))state.nodes.add(0);}
 return state;
}
export function applyProgressiveReveal(host,slide,position,language){
 const inline=!!host.querySelector('[data-python-demo]');
 const state=revealState(slide,position.beat,position.sentence,language,{freshBeat:inline});
 const show=(element,visible)=>{element.hidden=false;const pending=element.classList.contains('reveal-pending');element.classList.toggle('reveal-pending',!visible);element.setAttribute('aria-hidden',String(!visible));if(pending&&visible)element.classList.add('reveal-enter');};
 host.querySelectorAll('[data-diagram-node]').forEach(e=>show(e,state.nodes.has(Number(e.dataset.diagramNode))));
 host.querySelectorAll('[data-formula-step]').forEach(e=>show(e,state.formulas.has(Number(e.dataset.formulaStep))));
 host.querySelectorAll('.schematic-link').forEach(e=>{const i=Number(e.dataset.diagramLink);const tree=slide.schematic?.kind==='tree';show(e,state.nodes.has(tree?0:i)&&state.nodes.has(i+1));});
 host.querySelectorAll('.schematic-branch').forEach(e=>{const node=e.querySelector('[data-diagram-node]');show(e,node&&state.nodes.has(Number(node.dataset.diagramNode)));});
 host.querySelectorAll('.schematic-return').forEach(e=>show(e,state.nodes.size===slide.schematic.nodes.length));
 host.querySelectorAll('.plot-frame').forEach(e=>show(e,state.chart));
 host.querySelectorAll('.principal-direction,.plot-legend').forEach(e=>show(e,state.chart&&(slide.id!=='motivation'||position.beat>0)));
 host.querySelectorAll('.projection-guide').forEach(e=>show(e,state.chart&&(position.beat>0||position.sentence>0)));
 if(inline)host.querySelectorAll('code span').forEach((e,i)=>show(e,i===0||position.sentence>=1&&i<=2||position.sentence>=3));
}
