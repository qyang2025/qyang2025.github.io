export function demoAngle(sentence,progress){const p=Math.max(0,Math.min(1,progress));return sentence===1?Math.round(90*p):sentence===2?Math.round(90*(1-p)):0;}
