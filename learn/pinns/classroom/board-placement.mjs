// Coordinates are in screen pixels; translate the entire teaching group.
export function professorAvoidance(content,professor,bounds,gap=16){
 const overlaps=content.right+gap>professor.left&&content.left-gap<professor.right&&content.bottom+gap>professor.top&&content.top-gap<professor.bottom;
 if(!overlaps)return{x:0,y:0};
 const needed=professor.left-gap-content.right,available=bounds.left-content.left;
 if(needed<available)return{x:0,y:0,needsReflow:true};
 return{x:Math.min(0,needed),y:Math.max(0,Math.min(24,bounds.bottom-content.bottom))};
}
