const node = (label,labelEn,icon,revealAt,detail='',detailEn='') => ({label,labelEn,icon,revealAt,detail,detailEn});
const link = (label,labelEn) => ({label,labelEn});
export function demoSchematic(id) {
  if (id === 'objective') return {kind:'flow',nodes:[
    node('中心化数据','Centered data','database',0),
    node('协方差矩阵','Covariance','gear',1),
    node('最优单位方向','Best unit direction','vector',2)
  ],links:[link('整理变化','Summarize'),link('最大化方差','Maximize variance')]};
  if (id === 'derive') return {kind:'flow',nodes:[
    node('约束优化','Constrained objective','target',0),
    node('梯度为零','Zero gradient','gear',1),
    node('特征方向','Eigenvector','vector',2)
  ],links:[link('求导','Differentiate'),link('整理','Rearrange')]};
  if (['worked','extra-example'].includes(id)) return {kind:'compare',nodes:[
    node('横轴方向','Horizontal direction','vector',0,'假设方差：4','Assumed variance: 4'),
    node('纵轴方向','Vertical direction','vector',0,'假设方差：1','Assumed variance: 1')
  ],links:[]};
  if (id === 'limits') return {kind:'tree',nodes:[
    node('使用 PCA 前','Before using PCA','warning',0),
    node('变量尺度','Variable scale','sensor',0),
    node('线性结构','Linear structure','vector',1),
    node('预测价值','Predictive value','target',2)
  ],links:[link('检查','Check'),link('检查','Check'),link('检查','Check')]};
  return {kind:'none',nodes:[],links:[]};
}
