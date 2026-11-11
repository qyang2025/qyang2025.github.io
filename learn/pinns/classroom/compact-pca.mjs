import {pcaNarration} from './pca-narration.mjs';
import { sentences } from './player.mjs';
import { fallbackTarget } from './attention.mjs';

const node=(label,labelEn,icon,revealAt=0)=>({label,labelEn,icon,revealAt,detail:'',detailEn:''});
const link=(label,labelEn)=>({label,labelEn});
const flow=(a,b,label,labelEn)=>({kind:'flow',nodes:[a,b],links:[link(label,labelEn)]});
const compare=(a,b)=>({kind:'compare',nodes:[a,b],links:[]});
export function compactPca(material) {
  // Explicit teaching boundaries, rather than splitting a dense page by character count.
  const plan=[
    ['motivation','motivation',[0,1],'两路读数，需要都保留吗？','Do we need both sensor readings?',
      ['相关读数可能重复记录信息','寻找共同变化的方向'],['Correlated readings may repeat information','Find their shared direction of variation']],
    ['projection','projection',[0,1],'投影后，怎样衡量保留的变化？','How much variation does a projection retain?',
      ['用一个坐标描述每个点','投影越分散，保留方差越大'],['Represent each point with one coordinate','More spread means more retained variance']],
    ['unit-direction','projection',[2],'为什么先固定方向的长度？','Why fix the direction vector length?',
      ['固定长度，才能公平比较'],['Fix length for a fair comparison'],
      compare(node('相同方向','Same direction','vector'),node('改变长度','Different length','vector'))],
    ['objective','objective',[0],'先把数据移到中心','First center the data',
      ['每列减去各自的均值'],['Subtract each column mean'],
      flow(node('原始数据','Raw data','database'),node('中心化数据','Centered data','database'),'减均值','Subtract mean')],
    ['covariance','objective',[1],'协方差整理了什么？','What does covariance summarize?',
      ['记录各变量及共同的变化'],['Summarize individual and shared variation'],
      flow(node('中心化数据','Centered data','database'),node('协方差矩阵','Covariance matrix','gear'),'整理变化','Summarize variation')],
    ['variance-objective','objective',[2],'现在，写下要优化的目标','Now write the objective',
      ['在单位方向上最大化方差'],['Maximize variance over unit directions'],
      flow(node('单位方向','Unit directions','vector'),node('最大方差','Largest variance','target'),'比较','Compare')],
    ['derive','derive',[0],'把目标与约束放在一起','Combine the objective and constraint',
      ['方差目标，加上长度约束'],['Combine variance and the length constraint'],
      compare(node('方差目标','Variance objective','target'),node('单位约束','Unit constraint','vector'))],
    ['stationary','derive',[1],'求导，找到候选方向','Differentiate to find candidate directions',
      ['让关于方向的梯度为零'],['Set the gradient with respect to direction to zero'],
      flow(node('拉格朗日函数','Lagrangian','gear'),node('驻点条件','Stationary condition','target'),'求导','Differentiate')],
    ['eigenvector','derive',[2],'候选方向为什么是特征向量？','Why are candidate directions eigenvectors?',
      ['选择最大特征值对应的方向'],['Choose a direction for the largest eigenvalue'],
      flow(node('候选方向','Candidate directions','vector'),node('第一主成分','First component','target'),'选最大特征值','Choose largest eigenvalue')],
    ['worked','worked',[0,2],'比较两个轴，检验答案','Compare two axes to check the answer',
      ['假设：横向方差 4，纵向 1','横轴保留更多方差'],['Assume horizontal variance 4, vertical variance 1','The horizontal axis retains more variance'],
      compare(node('横轴：方差 4','Horizontal: variance 4','vector'),node('纵轴：方差 1','Vertical: variance 1','vector'))],
    ['scales','limits',[0],'使用前，先检查变量尺度','Check variable scales before using PCA',
      ['单位差异可能主导结果'],['Measurement units can dominate the result'],
      flow(node('变量与单位','Variables and units','sensor'),node('检查尺度','Check scales','warning'),'先检查','Check first')],
    ['limits','limits',[1,2],'PCA 还不能回答什么？','What can PCA still not tell us?',
      ['直线不能展开所有弯曲结构','高方差不保证预测价值'],['A line cannot unfold every curved structure','High variance does not guarantee predictive value'],
      {kind:'tree',nodes:[node('PCA 的边界','PCA limitations','warning'),node('线性结构','Linear structure','vector'),node('预测价值','Predictive value','target',1)],links:[link('检查','Check'),link('检查','Check')]}]
  ];
  const lesson={...material,summary:'每页解决一个小问题：几何直觉、数学目标、逐步推导、数值检验与使用边界。',summaryEn:'One small question per page: intuition, formulation, derivation, a checkable example, and limitations.'};
  lesson.slides=plan.map(([id,source,indices,title,titleEn,bullets,bulletsEn,schematic],page)=>{
    const original=material.slides.find(s=>s.id===source);
    const slide={...structuredClone(original),id,title,titleEn,bullets,bulletsEn,
      eyebrow:`${String(page+1).padStart(2,'0')} / 一页一问`,eyebrowEn:`${String(page+1).padStart(2,'0')} / One question`,
      schematic:schematic || {kind:'none',nodes:[],links:[]}};
    slide.beats=indices.map((index,i)=>{
      const beat=structuredClone(original.beats[index]);beat.id=`${id}-b${i}`;beat.focus=i;
      beat.scene.caption='';beat.scene.captionEn='';
      if(id==='unit-direction') slide.visual='equation';
      if(id==='worked' && i===1) {
        beat.text='现在让 Python 来检验这个例子：先把数据中心化。看右边，theta 表示方向与横轴的夹角，单位是度，随着投影方向从横轴转到纵轴，投影点逐渐收拢，方差从四降到一。现在转回横轴，投影重新展开，方差又升到四。所以第一主成分沿横轴，最大方差四也就是最大的特征值。';
        beat.textEn='Let Python check this example: first, center the data. Watch the plot, where theta is the angle from the horizontal axis, measured in degrees, as we rotate from the horizontal axis to the vertical axis: the projected points gather together, and variance falls from four to one. Now rotate back to the horizontal axis: the projection spreads out, and variance rises back to four. So the first component is horizontal, and the maximum variance, four, is the largest eigenvalue.';
        beat.scene.formula=String.raw`\operatorname{Var}(z_x)=4>\operatorname{Var}(z_y)=1`;
        beat.scene.formulaEn=beat.scene.formula;
      }
      const narration=pcaNarration[id]?.[i];if(narration){[beat.text,beat.textEn]=narration;}
      return beat;
    });
    slide.formula=slide.beats.at(-1).scene.formula;slide.formulaEn=slide.beats.at(-1).scene.formulaEn;
    slide.beats.forEach((beat,i)=>{
      const tracks={
        'unit-direction':['n0','n1','f0','b0'],objective:['n0','n1','f0','f0','n1'],
        covariance:['n0','f0','n1','b0'],'variance-objective':['n0','f0','n1','b0'],
        derive:['n0','f0','n1','f0'],stationary:['n0','f0','n1','f0'],
        eigenvector:['f0','f0','n0','n1','b0'],scales:['n0','n1','n0','n1','b0']
      };
      const target=sentence=>{
        const track=tracks[id];if(track){const code=track[Math.min(sentence,track.length-1)];return {kind:{n:'node',f:'formula',b:'bullet'}[code[0]],index:Number(code.slice(1))};}

        if(['derive','variance-objective'].includes(id)) return {kind:'formula',index:i};
        if(id==='eigenvector') return sentence===0 ? {kind:'formula',index:i} : {kind:'node',index:sentence===1 ? 0 : 1};
        if(id==='limits') return {kind:'node',index:i===0&&sentence===0?0:i+1};
        if(id==='worked' && i===1)return sentence===3?{kind:'formula',index:1}:{kind:'node',index:sentence===0?0:1};
        if(id==='worked' && sentence===0) return i===0 ? {kind:'formula',index:0} : {kind:'node',index:0};
        if(id==='projection' && i===0 && sentence<=1) return {kind:'chart',index:0};
        if(['scatter','projection'].includes(slide.visual) && sentence===0) return {kind:'chart',index:0};
        return fallbackTarget(slide,i,sentence);
      };
      beat.scene.targets=sentences(beat.text,'zh').map((_,sentence)=>({sentence,...target(sentence)}));
      beat.scene.targetsEn=sentences(beat.textEn,'en').map((_,sentence)=>({sentence,...target(sentence)}));
    });
    return slide;
  });
  return lesson;
}
