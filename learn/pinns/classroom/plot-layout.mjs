export function reserveAxisGutter(svg){
 if(!svg)return;
 const labels=[...svg.querySelectorAll('[data-axis-label="y"]')];if(!labels.length)return;
 // Put the variable beside the upper axis end, above the tick-label column.
 // A separate far-left column needlessly separated short names from their axis.
 const path=[...svg.querySelectorAll('path')].map(p=>p.getAttribute('d')||'').find(d=>/^M\s*[\d.]+[ ,]+[\d.]+\s*V/.test(d));
 const axisX=path?Number(path.match(/^M\s*([\d.]+)/)[1]):70;
 svg.setAttribute('viewBox','-28 -28 668 288');
 for(const label of labels){label.setAttribute('x',String(axisX-76));label.setAttribute('y','-18');label.setAttribute('width','64');label.setAttribute('style','text-align:right;overflow:visible');}
}
