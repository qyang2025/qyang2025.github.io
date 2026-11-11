import {paperDemoHtml,syncPaperDemo} from './paper-demo.mjs';
import {PlaybackControl} from './playback-control.mjs';
import {heatRodHtml,syncHeatRod} from './heat-rod.mjs';
import {pinnDemoHtml,syncPinnDemo} from './pinn-demo.mjs';
import {applyProgressiveReveal} from './progressive-reveal.mjs';
import {inlineDemoHtml} from './inline-demo.mjs';
import {ClassroomViewport} from './classroom-viewport.mjs';
import {lessonSections,isOutline} from './course-outline.mjs';
import {TeachingPointer,attentionTarget} from './attention.mjs';
import {schematicHtml} from './schematic.mjs';
import {mathHtml,proseHtml} from './math.mjs';
import {lectureChart} from './lecture-chart.mjs';
import {LecturePlayer,sentences} from './player.mjs';
import {currentScene,ProfessorStage} from './stage.mjs';
import {NeuralSpeech} from './neural-speech.mjs';
import {localizeLesson} from './languages.mjs';
const $=id=>document.getElementById(id),escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const requestedPaper=new URLSearchParams(location.search).get('paper')||'';let courseRoot='courses/pinns',courseKey='pinns';
const classroomSearch=(chapter,language)=>'?'+new URLSearchParams({...requestedPaper?{paper:requestedPaper}:{},chapter:String(chapter+1),language}).toString();
let manifest,audioPack,rawLesson,chapter=0,language=new URLSearchParams(location.search).get('language')==='zh'?'zh':'en',loading=true,loadEpoch=0;
const t=(en,zh)=>language==='en'?en:zh;
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,6500);}
const professor=new ProfessorStage($('avatar-stage')),pointer=new TeachingPointer($('lecture-stage'),professor);professor.onFrame=pointer.update;
const viewport=new ClassroomViewport();
const speech=new NeuralSpeech({fetcher:async(url,options)=>{
 if(url==='/api/speech/config')return Response.json({voices:audioPack.voices,provider:'kokoro-published',timingGranularity:'sentence'});
 const input=JSON.parse(options.body),key=[input.lessonId,input.language,input.slideId,input.beatId,input.sentenceIndex].join('/');
 const clip=audioPack.clips[key];return clip?Response.json(clip):Response.json({error:t('This sentence has no published audio. Read the transcript and use Next step.','这句话尚无已发布语音。请阅读讲稿并点击下一步。')},{status:404});
}});
const player=new LecturePlayer({speech,utterance:text=>({text}),onChange:()=>{if(player.lesson)render();},onError:toast,onActivity:activity=>{
 if(activity.reason==='paused')playback?.release();professor.activity(activity);pointer.activity(activity);
 if(player.lesson){const position=player.displayPosition(),slide=player.lesson.slides[position.slide];syncPaperDemo(activity,position,slide,language);syncHeatRod(activity,position,slide,language);syncPinnDemo(activity,position,slide,language);}
}});
const playback=new PlaybackControl({onStop:()=>player.pauseAtVisible()});speech.playback=playback;
function visual(slide, beat) {
  if(slide.paperDemo)return paperDemoHtml(slide,player.lesson.language==='en');
  const scene = currentScene(slide, beat);
  $('slide').lang = player.lesson.language || 'zh';
  if(['pinn-1-motivation','pinn-1-heat','pinn-1-conditions','pinn-1-exact'].includes(slide.id)&&player.lesson.courseId==='pinns')return heatRodHtml(slide,player.lesson.language==='en');
  if(slide.demo&&player.lesson.courseId==='pinns')return pinnDemoHtml(slide,player.lesson.language==='en');
  if(player.lesson.id==='demo' && slide.id==='worked' && slide.beats.indexOf(beat)===1)return inlineDemoHtml(player.lesson.language==='en');
  const graphic = slide.visual === 'scatter' || slide.visual === 'projection'
    ? `<div class="teaching-chart" data-stage="${scene.stage}">${lectureChart(slide.visual === 'projection', player.lesson.language)}${scene.formula ? `<div class="board-equation" data-formula-step="${slide.beats.indexOf(beat)}">${mathHtml(scene.formula)}</div>` : ''}</div>`
    : slide.beats.slice(0,slide.beats.indexOf(beat)+1).some(b=>b.scene?.formula) ? `<div class="derivation-steps">${slide.beats.map((b,index)=>({b,index})).filter(({b,index}) => index <= slide.beats.indexOf(beat) && b.scene?.formula).map(({b,index},i,a) => `<div data-formula-step="${index}" class="formula-box equation-step ${i === a.length-1 ? 'current-step' : 'prior-step'}">${mathHtml(b.scene.formula)}</div>`).join('')}</div>`
    : slide.schematic && slide.schematic.kind !== 'none' ? '' : `<div class="concept-card" data-focus="${beat.focus}"><span>${player.lesson.language === 'en' ? 'Focus on this idea' : '现在关注这个问题'}</span><strong>${proseHtml(slide.bullets[beat.focus])}</strong></div>`;
  return `<div class="scene-content">${schematicHtml(slide.schematic, slide.beats.indexOf(beat), player.lesson.language)}${graphic}${scene.caption && scene.caption !== slide.bullets[beat.focus] ? `<div class="scene-caption">${proseHtml(scene.caption)}</div>` : ''}</div>`;
}

function render(){
 const lesson=player.lesson,p=player.displayPosition(),slide=lesson.slides[p.slide],beat=slide.beats[p.beat],en=language==='en',scene=currentScene(slide,beat);
 document.documentElement.lang=en?'en':'zh-CN';document.title=manifest.paper?t('Paper 01 · Raissi 2017 · Professor Vee','论文 01 · Raissi 2017 · 维教授'):`${en?'PINNs · Professor Vee':'PINNs · 维教授'} · ${chapter+1}`;
 $('brand-name').innerHTML=t('Professor Vee<small>QIANHONG YANG · LEARNING SERIES</small>','维教授<small>杨千鸿 · 系列课程</small>');
 for(const [id,enText,zhText]of [['series-link','PINNs series','PINNs 系列'],['home-link','Personal homepage','个人主页'],['language-label','Language','语言'],['series-label','SERIES 01 · PINNs','系列 01 · PINNs'],['chapter-label','Chapter','章节'],['guide-link','Full teacher guide','完整教师讲义'],['download-link','Download materials & Python','下载课件与 Python 实验'],['caption-label','Transcript','讲解字幕'],['sources-title','Primary sources','原始文献'],['professor-name','Professor Vee','维教授'],['professor-description','From physical intuition to equations.','从物理直觉走向方程。'],['chapter-prev','Previous chapter','上一章'],['chapter-next','Next chapter','下一章'],['next-step','Next step','下一步']])$(id).textContent=t(enText,zhText);
 $('publication-note').textContent=manifest.paper?t('One paper, one presentation. Small CPU experiments; recorded trace replay, not browser training.','一篇论文，一套课件。小型 CPU 实验，网页回放真实训练轨迹，不在浏览器训练。'):t('A 120-minute teaching plan including exercises and a ten-minute break. Python demos replay recorded experiments.','120 分钟教学计划，包含练习和十分钟休息。Python 演示回放已执行实验。');
 $('course-note').textContent=t('Narration stops when this page is hidden; clicking elsewhere does not stop it. Live AI questions and new slides require the local classroom app.','隐藏本页时停止讲解，点击其他位置不受影响。实时 AI 提问和生成新课件需要本地课堂应用。');
 if(manifest.paper){$('series-label').textContent=t('PAPER 01 · PINNs','论文 01 · PINNs');$('chapter-label').textContent=t('Presentation','本篇课件');$('chapter-select').hidden=true;$('chapter-prev').hidden=true;$('chapter-next').hidden=true;}
 $('guide-link').href=courseRoot+'/guide.html';$('download-link').href=courseRoot+'/'+(manifest.download||'pinns-course.zip');
 $('course-title').textContent=lesson.title;$('course-summary').textContent=lesson.summary;$('language-select').value=language;
 $('chapter-select').innerHTML=manifest.modules.map((m,i)=>`<option value="${i}" ${chapter===i?'selected':''}>${i+1}. ${escape(en?m.titleEn:m.title)}</option>`).join('');
 $('outline').ariaLabel=t('Slides','幻灯片');$('outline').innerHTML=lesson.slides.map((s,i)=>`<button class="outline-item ${i===p.slide?'active':''}" data-index="${i}" ${i===p.slide?'aria-current="step"':''}><span class="outline-number">${String(i+1).padStart(2,'0')}</span><span>${escape(s.title)}</span></button>`).join('');
 $('outline').querySelectorAll('button').forEach(b=>b.onclick=()=>player.seek(Number(b.dataset.index)));
 const sections=lessonSections(lesson),section=sections.find(s=>s.ids.includes(slide.id));
 $('course-roadmap').innerHTML=`<button data-page="0" ${isOutline(slide)?'aria-current="step"':''}>${t('Outline','课程提纲')}</button>`+sections.map(s=>`<button data-page="${s.startIndex}" ${s===section?'aria-current="step"':''}>${s.index+1}. ${escape(en?s.titleEn:s.title)}</button>`).join('');
 $('course-roadmap').querySelectorAll('button').forEach(b=>b.onclick=()=>player.seek(Number(b.dataset.page)));
 const key=[lesson.id,lesson.language,language,slide.id,beat.id].join('/');
 if($('slide').dataset.key!==key){$('slide').dataset.key=key;$('slide').lang=language;$('slide').dataset.integratedEquation=String(!!slide.integratedEquation);
 $('slide').innerHTML=`<div class="slide-eyebrow">${escape(slide.eyebrow)}${section?' / '+escape(en?section.titleEn:section.title):''}</div><h2>${proseHtml(slide.title)}</h2><div class="visual">${visual(slide,beat)}</div><ul class="slide-bullets">${slide.bullets.map((text,i)=>`<li data-focus="${i}" class="${i>beat.focus?'upcoming':''}">${proseHtml(text)}</li>`).join('')}</ul><footer class="slide-footer"><span>${t('Vee Classroom','维教授课堂')}</span><span>${escape(isOutline(slide)?t('Course roadmap','课程路线'):slide.sourceIds.join(' · '))}</span></footer>`;
 syncPaperDemo({audioTime:0,duration:1},p,slide,language);syncHeatRod({audioTime:0,duration:1},p,slide,language);syncPinnDemo({audioTime:0,duration:1},p,slide,language);
 }
 applyProgressiveReveal($('slide'),slide,p,language);$('slide').querySelectorAll('[data-focus]').forEach(node=>node.classList.toggle('focus',Number(node.dataset.focus)===beat.focus));
 $('caption-text').textContent=player.displayText();document.querySelector('#avatar-stage canvas')?.setAttribute('aria-label',t('3D Professor Vee','三维维教授'));professor.setScene(scene,{text:player.displayText(),thinking:!!player.activityHold,buffering:player.buffering,playing:player.playing,speaking:player.speaking});pointer.setTarget(attentionTarget(slide,p.beat,p.sentence,language));viewport.schedule();
 $('page-count').textContent=`${String(p.slide+1).padStart(2,'0')} / ${lesson.slides.length}`;$('lesson-kind').textContent=manifest.paper?t('PINNs · Paper 01 · Raissi et al. (2017)','PINNs · 论文 01 · Raissi 等（2017）'):t('PINNs primer · Chapter ','PINNs 先修课 · 第 ')+(chapter+1)+(en?'':' 章');$('beat-label').textContent=t('Segment ','片段 ')+`${p.beat+1} / ${slide.beats.length}`;
 const counts=lesson.slides.map(s=>s.beats.length);$('timeline-fill').style.width=`${100*(counts.slice(0,p.slide).reduce((a,b)=>a+b,0)+p.beat+1)/counts.reduce((a,b)=>a+b,0)}%`;
 const coverage=(audioPack.courseCoverage?.[courseKey]||audioPack.coverage)[chapter][language],complete=coverage.ready===coverage.total;
 $('audio-status').textContent=complete?t('Recorded Kokoro narration · British English · ','Kokoro 已生成语音 · ')+`${coverage.ready}/${coverage.total}`:t('Chinese text is available. This chapter has incomplete recorded audio; use Next step to read it.','本章可阅读中文课件和讲稿；录音尚未完整发布，请点击下一步逐步学习。');
 $('play').disabled=loading||!complete;$('play').textContent=player.buffering?t('Preparing audio…','正在准备语音…'):player.playing?t('Ⅱ Pause','Ⅱ 暂停'):t('▶ Continue lesson','▶ 继续讲解');
 $('previous').disabled=loading||p.slide===0;$('previous').ariaLabel=t('Previous slide','上一页');$('next').disabled=loading||p.slide===lesson.slides.length-1;$('next').ariaLabel=t('Next slide','下一页');
 $('chapter-prev').disabled=loading||chapter===0;$('chapter-next').disabled=loading||chapter===manifest.modules.length-1;$('language-select').disabled=loading;$('chapter-select').disabled=loading;$('next-step').disabled=loading;$('rate').ariaLabel=t('Narration speed','讲解速度');
 $('activity-hold').hidden=!player.activityHold;if(player.activityHold)$('activity-hold').textContent=t('Pause for reflection. Click Continue lesson when ready.','请先思考，准备好后点击继续讲解。');
 $('sources').innerHTML=lesson.sources.map(s=>`<li><a href="${escape(s.url.startsWith('/')?new URL('.'+s.url,import.meta.url).href:s.url)}" rel="noopener">${escape(s.name)}</a></li>`).join('');
}
async function loadChapter(index){const epoch=++loadEpoch;loading=true;player.pauseAtVisible();try{const response=await fetch(`${courseRoot}/${manifest.modules[index].file}`);if(!response.ok)throw Error('Course unavailable');const lesson=await response.json();if(epoch!==loadEpoch)return;rawLesson=lesson;chapter=index;loading=false;player.voiceURI=language==='en'?'bm_george':'zm_010';player.load(localizeLesson(rawLesson,language));history.replaceState(null,'',classroomSearch(chapter,language));}catch(error){if(epoch===loadEpoch){loading=false;toast(error.message);if(player.lesson)render();}}}
$('play').onclick=()=>player.playing?player.pauseAtVisible():player.play();$('previous').onclick=()=>player.seek(player.displayPosition().slide-1);$('next').onclick=()=>player.seek(player.displayPosition().slide+1);
$('next-step').onclick=()=>{const p=player.displayPosition();player.pauseAtVisible();const slide=player.lesson.slides[p.slide];let beat=p.beat,sentence=p.sentence+1;if(sentence>=sentences(slide.beats[beat].text,language).length){sentence=0;beat++;}if(beat>=slide.beats.length){if(p.slide+1<player.lesson.slides.length)player.seek(p.slide+1);return;}Object.assign(player,{beat,sentence,activityHold:null});player.syncPresentation();player.emit();const next=player.displayPosition(),current=player.lesson.slides[next.slide];syncPaperDemo({audioTime:0,duration:1},next,current,language);syncHeatRod({audioTime:0,duration:1},next,current,language);syncPinnDemo({audioTime:0,duration:1},next,current,language);};
$('rate').onchange=()=>{player.rate=Number($('rate').value);if(player.playing)player.play();};
$('chapter-select').onchange=()=>loadChapter(Number($('chapter-select').value));$('chapter-prev').onclick=()=>loadChapter(chapter-1);$('chapter-next').onclick=()=>loadChapter(chapter+1);
$('language-select').onchange=()=>{const nextLanguage=$('language-select').value;player.pauseAtVisible();language=nextLanguage;player.voiceURI=language==='en'?'bm_george':'zm_010';player.setLanguage(localizeLesson(rawLesson,language));history.replaceState(null,'',classroomSearch(chapter,language));};
try{if(requestedPaper){const catalog=await(await fetch('courses/pinns-papers/catalog.json')).json();const entry=catalog.papers.find(p=>p.id===requestedPaper);if(!entry)throw Error('Paper not available');courseRoot=entry.courseRoot;courseKey=entry.id;}[manifest,audioPack]=await Promise.all([courseRoot+'/manifest.json','published-audio.json'].map(async url=>{const r=await fetch(url);if(!r.ok)throw Error('Course files unavailable');return r.json();}));await speech.configure();await loadChapter(Math.max(0,Math.min(manifest.modules.length-1,(Number(new URLSearchParams(location.search).get('chapter'))||1)-1)));}catch(error){$('play').textContent=t('Course unavailable','课程暂不可用');toast(error.message);}
