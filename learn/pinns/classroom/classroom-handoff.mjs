import{sentences}from'./player.mjs';
const validId=id=>/^(demo|[a-f0-9-]{36})$/.test(id||'');
const integer=(x,max)=>Number.isInteger(x)&&x>=0&&x<=max;
export function websiteClassroomUrl({courseKey='pinns',chapter=0,language='en',position={slide:0,beat:0,sentence:0}}){
 if(!/^[a-z0-9-]{1,60}$/.test(courseKey)||!['en','zh'].includes(language)||!integer(chapter,99))throw Error('Invalid classroom context');
 const u=new URL('https://qyang2025.github.io/learn/pinns/classroom/');if(courseKey!=='pinns')u.searchParams.set('paper',courseKey);u.searchParams.set('chapter',String(chapter+1));u.searchParams.set('language',language);for(const k of['slide','beat','sentence']){if(!integer(position[k],999))throw Error('Invalid lecture position');u.searchParams.set(k,String(position[k]));}return u.href;
}
export function createLocalClassroomUrl({lessonId,courseKey,chapter=0,language,position,question='',port=4317}){
 if(!validId(lessonId)||!['en','zh'].includes(language)||typeof question!=='string'||question.length>3000||!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local classroom request');
 const returnUrl=websiteClassroomUrl({courseKey,chapter,language,position});const u=new URL('http://127.0.0.1:'+port+'/');u.search=new URLSearchParams({lessonId,language,slide:String(position.slide)}).toString();u.hash=new URLSearchParams({classroomHandoff:JSON.stringify({version:1,lessonId,language,position,question,returnUrl})}).toString();return u.href;
}
export function readClassroomHandoff(hash){
 if(typeof hash!=='string'||hash.length>20000)return null;
 try{const s=new URLSearchParams(hash.replace(/^#/,'' )).get('classroomHandoff');if(!s)return null;const v=JSON.parse(s);if(v.version!==1||!validId(v.lessonId)||!['en','zh'].includes(v.language)||typeof v.question!=='string'||v.question.length>3000||!v.position||!['slide','beat','sentence'].every(k=>integer(v.position[k],999)))return null;const u=new URL(v.returnUrl);if(u.origin!=='https://qyang2025.github.io'||u.pathname!=='/learn/pinns/classroom/'||u.username||u.password||u.hash)return null;return v;}catch{return null;}
}
export function restoreLecturePosition(player,p){
 if(!p||!['slide','beat','sentence'].every(k=>integer(p[k],999)))return false;const slide=player.lesson?.slides[p.slide],beat=slide?.beats[p.beat];if(!beat||p.sentence>=sentences(beat.text,player.lesson.language).length)return false;player.seek(p.slide);player.beat=p.beat;player.sentence=p.sentence;player.syncPresentation();player.emit();return true;
}
