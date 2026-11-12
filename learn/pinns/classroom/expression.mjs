export const poses={smile:[-3,3,0,.95,157,0],curious:[-12,5,-3,1.12,151,-3],focused:[7,-7,1,.88,150,1],encouraging:[-5,5,-1,.8,160,0],thinking:[-13,7,-2,.86,148,-3],listening:[-5,5,-2,1.08,153,3],concerned:[10,-10,1,.94,148,-1]};
export function chooseExpression(scene={},context={}) {
 if(context.thinking||context.buffering)return 'thinking';
 if(context.listening)return 'listening';
 const text=context.text||scene.caption||'';
 if(scene.conversational&&context.playing){if(/[?？]/.test(text))return 'curious';if(/careful|mistake|not guarantee|注意|错误|不保证/i.test(text))return 'concerned';if(/therefore|so |that is why|因此|所以/i.test(text))return 'encouraging';return scene.gesture==='write'?'focused':'smile';}
 if(poses[scene.expression])return scene.expression;
 if(/[?？]/.test(text))return 'curious';
 if(/陷阱|注意|不一定|不保证|trap|cannot|limitation|unbounded/i.test(text))return 'concerned';
 if(/答案|一致|因此|therefore|agrees|well done|result matches/i.test(text))return 'encouraging';
 if(scene.gesture==='write'&&(context.playing||context.speaking))return 'focused';
 return scene.gesture==='question'?'curious':'smile';
}
export function easeToward(current,target,deltaMs,tau=180){return current+(target-current)*(1-Math.exp(-Math.max(0,Math.min(1500,deltaMs))/tau));}

// Store a content-aware expression plan in the deck; old decks receive one on load.
export function planExpressions(lesson){
 return{...lesson,slides:lesson.slides.map(slide=>({...slide,beats:slide.beats.map(beat=>({...beat,scene:{...beat.scene,expression:poses[beat.scene?.expression]?beat.scene.expression:slide.id==='course-outline'?'smile':chooseExpression(beat.scene,{text:beat.textEn||beat.text,playing:true})}}))}))};
}
