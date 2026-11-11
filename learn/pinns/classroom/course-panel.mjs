export function installCoursePanel({getLesson,loadChapter,isBusy}){
 const panel=document.createElement('section');panel.className='course-pack-panel';panel.hidden=true;document.querySelector('.professor-description').after(panel);
 let manifest=null,index=0,holdingKey=null,timer=null,remaining=0,audioPoll=null;
 const activity=document.createElement('div');activity.className='course-activity';activity.hidden=true;document.querySelector('.playback').append(activity);
 return{
  setManifest(value,initialIndex=0){manifest=value;index=initialIndex;clearInterval(audioPoll);const poll=async()=>{try{const state=await fetch('/courses/pinns/audio-status.json').then(r=>r.json());const count=state.modules.reduce((n,m)=>n+(m.completed||0),0),total=manifest.modules.reduce((n,m)=>n+m.sentenceCount,0),en=getLesson()?.language==='en';const text=panel.querySelector('.course-audio-state');if(text)text.textContent=en?`English audio cached: ${count}/${total}`:`英文音频已缓存：${count}/${total}`;if(state.state==='ready')clearInterval(audioPoll);}catch{}};audioPoll=setInterval(poll,4000);poll();window.addEventListener('pagehide',()=>clearInterval(audioPoll),{once:true});},
  update(player){
   const lesson=getLesson(),en=lesson.language==='en',t=(a,b)=>en?a:b;
   panel.hidden=!manifest;if(!manifest)return;
   if(lesson.courseId===manifest.id)index=lesson.chapterIndex;
   const signature=`${index}/${en}/${isBusy()}`;
   if(panel.dataset.key!==signature){panel.dataset.key=signature;panel.innerHTML=`<strong>${t('PINNs · postgraduate course','PINNs · 研究生课程')}</strong><p>${t('120-minute teaching plan, including exercises and a 10-minute break.','120 分钟教学计划，包含练习和十分钟休息。')}</p><p class="course-audio-state"></p><label>${t('Chapter','章节')}<select aria-label="${t('Course chapter','课程章节')}">${manifest.modules.map((m,i)=>`<option value="${i}" ${i===index?'selected':''}>${i+1}. ${en?m.titleEn:m.title}</option>`).join('')}</select></label><div class="course-chapter-buttons"><button data-prev>${t('Previous','上一章')}</button><button data-next>${t('Next chapter','下一章')}</button></div><p>${manifest.modules[index].plannedMinutes} ${t('class minutes','课堂分钟')} · ${manifest.modules[index].pages} ${t('slides','页')}</p>${index===2?`<p>${t('Take a 10-minute break before chapter 4.','进入第四章前安排十分钟休息。')}</p>`:''}<a href="/courses/pinns/guide.html" target="_blank">${t('Teacher guide and full script','教师讲义与完整讲稿')}</a><a href="/courses/pinns/pinns-course.zip" download>${t('Download course and Python','下载课程与 Python 实验')}</a>`;
    const select=panel.querySelector('select');select.disabled=isBusy();select.onchange=()=>loadChapter(Number(select.value));
    const prev=panel.querySelector('[data-prev]'),next=panel.querySelector('[data-next]');prev.disabled=index===0||isBusy();next.disabled=index===manifest.modules.length-1||isBusy();prev.onclick=()=>loadChapter(index-1);next.onclick=()=>loadChapter(index+1);
   }
   const hold=player.activityHold;
   activity.hidden=!hold;
   if(hold){const key=`${lesson.id}/${hold.slide}/${hold.beat}`;if(holdingKey!==key){clearInterval(timer);holdingKey=key;remaining=hold.seconds;timer=setInterval(()=>{remaining=Math.max(0,remaining-1);const output=activity.querySelector('output');if(output)output.textContent=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;if(!remaining)clearInterval(timer);},1000);}
    activity.innerHTML=`<span>${t('Student reasoning time','学生思考时间')} <output>${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}</output></span><button>${t('Hear the explanation and continue','听取解释并继续')}</button>`;activity.querySelector('button').onclick=()=>player.play();
   }else{clearInterval(timer);holdingKey=null;}
  },
  manifest:()=>manifest
 };
}
