export function isOutline(slide){return /^(course-outline|supplement-outline|outline|agenda)$/i.test(slide?.id||'');}
export function lessonSections(lesson){
 const content=lesson.slides.filter(s=>!isOutline(s)),n=content.length;
 const physicalChapter=lesson.courseId==='pinns'&&content.some(s=>s.id==='pinn-1-network')&&content.some(s=>s.id==='pinn-1-residual');
 const cuts=physicalChapter?[content.findIndex(s=>s.id==='pinn-1-network'),content.findIndex(s=>s.id==='pinn-1-residual'),n]:n>=8?[Math.ceil(n/4),Math.ceil(n*3/4),n]:n>=3?[Math.ceil(n/3),Math.ceil(n*2/3),n]:n===2?[1,2]:[n];
 const pca=content.some(s=>s.id==='eigenvector')&&content.some(s=>s.id==='projection');
 const labels=lesson.sectionLabels|| (pca?[['数据与投影','Data and projection'],['方差与特征向量','Variance and eigenvectors'],['例子与适用边界','Examples and limits']]:[['问题与直觉','Question and intuition'],['核心原理','Core explanation'],['例子与边界','Examples and limits']]);let start=0;
 return cuts.filter((end,i,a)=>end>0&&(i===0||end>a[i-1])).map((end,i)=>{const slides=content.slice(start,end);start=end;return{index:i,title:labels[i][0],titleEn:labels[i][1],ids:slides.map(s=>s.id),startIndex:lesson.slides.findIndex(s=>s.id===slides[0].id)};});
}
export function withOutline(lesson){
 if(!lesson.slides?.length||isOutline(lesson.slides[0]))return lesson;
 const sections=lessonSections(lesson),nodes=sections.map((s,i)=>({label:s.title,labelEn:s.titleEn,detail:'',detailEn:'',icon:['target','gear','check'][i],revealAt:0}));
 const zh=['先看问题和直觉，弄清楚这节课要解决什么。','接着逐步建立核心解释，理解每一步为什么成立。','最后用例子检验理解，并说明结论的适用边界。'].slice(0,nodes.length).join('');
 const en=['First, we will frame the question and build some intuition.','Then, we will work through the core explanation, one step at a time.','Finally, we will test the idea with examples and discuss its limits.'].slice(0,nodes.length).join(' ');
 const cues=nodes.map((_,i)=>({sentence:i,kind:'node',index:i}));
 const pca=sections[0]?.title==='数据与投影';
 const slide={id:'course-outline',title:'这节课的学习路线',titleEn:"Today's learning route",eyebrow:'OUTLINE / 先看路线',eyebrowEn:'OUTLINE / Start here',visual:'steps',formula:'',formulaEn:'',bullets:pca?['理解 PCA 如何选择保留信息的方向','连起几何直觉、数学推导与数值检验']:['先知道要解决什么，再进入细节','沿着路线，逐步建立理解'],bulletsEn:pca?['Understand how PCA chooses a useful direction','Connect geometry, derivation and a checkable example']:['Know the question before the details','Build understanding one step at a time'],sourceIds:[],schematic:{kind:'flow',nodes,links:nodes.slice(1).map(()=>({label:'然后',labelEn:'Then'}))},beats:[{id:'course-outline-b0',text:zh,textEn:en,focus:0,scene:{formula:'',formulaEn:'',caption:'',captionEn:'',gesture:'question',stage:0,targets:cues,targetsEn:cues}}]};
 return{...lesson,slides:[slide,...lesson.slides]};
}
