// The catalogue makes additional agent-prepared topics appear as separate series.
try {
 const response=await fetch('series.json');if(!response.ok)throw Error('Catalogue unavailable');
 const {series}=await response.json(),list=document.getElementById('series-list'),cards=[];
 for(const course of series){
  const url=new URL(course.url,location.href);if(url.origin!==location.origin)continue;
  const card=document.createElement('article');card.className='series-card';
  const content=document.createElement('div'),number=document.createElement('span');number.className='series-number';number.textContent=`Series ${String(course.number).padStart(2,'0')}`;
  const title=document.createElement('h2');title.textContent=course.title;const description=document.createElement('p');description.textContent=course.description||'';
  const meta=document.createElement('div');meta.className='series-meta';
  for(const text of [course.audience,course.paperCount?`${course.paperCount} ${course.paperCount===1?'paper':'papers'} implemented · ${course.slides} slides`:`${course.chapters} chapters · ${course.slides} slides`,course.paperCount?'Small CPU experiments':`${course.plannedMinutes}-minute class plan`]){const tag=document.createElement('span');tag.textContent=text;meta.append(tag);}
  const actions=document.createElement('div');actions.className='learning-actions';const link=document.createElement('a');link.className='learning-button primary';link.href=url.href;link.textContent='Explore this series →';actions.append(link);
  if(course.classroom){const classroom=new URL(course.classroom,location.href);if(classroom.origin===location.origin){const enter=document.createElement('a');enter.className='learning-button';if(!classroom.searchParams.has('chapter'))classroom.searchParams.set('chapter','1');if(!classroom.searchParams.has('language'))classroom.searchParams.set('language','en');enter.href=classroom.href;enter.textContent='Enter classroom';actions.append(enter);}}
  content.append(number,title,description,meta,actions);card.append(content);
  if(course.cover){const image=document.createElement('img');image.className='series-art';image.src=course.cover;image.alt=course.title+' — physical model and equations';card.append(image);}
  cards.push(card);
 }
 if(cards.length)list.replaceChildren(...cards);
}catch{/* Keep the first-series HTML fallback available without scripting. */}
