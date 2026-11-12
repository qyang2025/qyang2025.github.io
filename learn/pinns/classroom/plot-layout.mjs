export function reserveAxisGutter(svg){
 if(!svg)return;
 const labels=[...svg.querySelectorAll('[data-axis-label="y"]')];
 if(!labels.length)return;
 // Keep axis names in their own column, apart from even wide scientific ticks.
 svg.setAttribute('viewBox','-80 0 720 260');
 for(const label of labels){label.setAttribute('x','-68');label.setAttribute('width','64');}
}
