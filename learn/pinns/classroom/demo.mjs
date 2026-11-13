import {planExpressions} from './expression.mjs';
import {withOutline} from './course-outline.mjs';
import { compactPca } from './compact-pca.mjs';
import { fallbackTarget } from './attention.mjs';
import { sentences } from './player.mjs';
import { normalizeFormula } from './math.mjs?v=paper20focus1';
import { demoSchematic } from './demo-schematics.mjs';
export const demoSource = {
  id: 'demo-pca', name: 'PCA 教学示例 · 内置讲义',
  text: '主成分分析 PCA：对中心化数据 X，协方差矩阵 C = XᵀX/(n−1)。在单位向量约束 wᵀw=1 下最大化投影方差 wᵀCw，拉格朗日驻点满足 Cw=λw；最大特征值对应第一主成分。当特征值并列时方向不唯一。PCA 对变量尺度敏感，只刻画线性方向；高方差并不等于高预测价值。此为合成教学示例，不代表任何上传论文或实验结果。'
};
const slide = (id, title, eyebrow, formula, visual, bullets, texts) => ({
  id, title, eyebrow, formula, visual, bullets,
  beats: texts.map((text, i) => ({ id: `${id}-b${i}`, text, focus: Math.min(i, bullets.length - 1), scene: {
    formula: ({
      objective: ['Xc = X − mean(X)', 'C = XcᵀXc / (n − 1)', 'max wᵀCw，wᵀw = 1'],
      derive: ['L = wᵀCw − λ(wᵀw − 1)', '∇wL = 2Cw − 2λw = 0', 'Cw = λw → 最大 λ 对应第一主成分'],
      projection: ['z = Xw', 'Var(z) = wᵀCw', 'wᵀw = 1'],
      worked: ['C = diag(4, 1)', 'Var(z) = 4cos²θ + sin²θ', 'θ = 0 → Var(z) = 4；θ = π/2 → Var(z) = 1'],
      'extra-example': ['C = diag(4, 1)', 'Var(z) = 4cos²θ + sin²θ', 'max Var(z) = 4，w = (1, 0)']
    }[id] || [formula, formula, formula])[i] || formula,
    caption: bullets[Math.min(i, bullets.length - 1)],
    gesture: i === 0 ? 'question' : visual === 'equation' ? 'write' : 'point',
    stage: visual === 'projection' ? Math.max(1, i) : i
  } })),
  sourceIds: ['demo-pca']
});
export const teachingMaterial = {
  id: 'demo', title: '从一团数据，到一个方向',
  summary: '先问为什么要降维，再看几何、推导，最后用一个可手算的例子检验。', origin: 'demo',
  sources: [demoSource],
  slides: [
    slide('motivation', '数据很多，信息藏在哪里？', '01 / 从问题出发', '', 'scatter',
      ['两路相关的传感器，是否重复记录了信息？', '用一个方向描述最明显的变化', '今天回答：怎样压缩，又怎样检查损失？'],
      ['设想你有两路传感器，它们常常一起升高、一起降低。我们真的需要把两个读数全部留下吗？图里是合成的二维点云，每个点代表一次观测，用它来研究这个问题。', '现在看斜着的虚线。点云主要沿这个方向伸展，说明两路读数里有共同变化。我们想找到这个方向，把它作为新的坐标。', '今天先弄清三件事：为什么选这个方向，怎样把它写成数学，以及怎样用一个小例子检查答案。先记住目标：少存几个坐标，尽可能保留变化。']),
    slide('projection', '换一个方向，看见更多变化', '02 / 建立几何直觉', 'z = Xw', 'projection',
      ['把点投影到一条直线上', '投影越分散，保留的方差越大', '方向必须归一化，比较才公平'],
      ['好，把这条线当成尺子。看那些短虚线：我们把每个点垂直落到尺子上，就用一个数描述它的位置。屏幕上的 z，就是这个新坐标。', '接下来问一句：怎样算这把尺子放得好？看投影是不是足够分散。这里我们用方差来衡量保留的变化，它不直接等于预测能力。', '但有个小陷阱。如果把尺子的读数全部乘十，方差也会放大。方向没变，得分却变了！所以我们先约定，方向向量的长度必须等于一。']),
    slide('objective', '把“最分散”写成数学', '03 / 从直觉到目标', 'max  wᵀCw     s.t.  wᵀw = 1', 'equation',
      ['先对每一列数据减去均值', 'C 是中心化数据的协方差矩阵', '在单位方向上，最大化投影方差'],
      ['我们已经知道要找一把合适的尺子，现在才把问题写下来。第一步先减去每一列的均值，得到屏幕上的中心化数据 Xc。这样衡量的是围绕中心的变化，而不是离原点有多远。', '接下来，把这些变化整理进协方差矩阵 C。对角线告诉我们各个变量有多分散，其他位置记录变量怎样一起变化。屏幕上给出了它的样本计算式。', '最后看目标函数：我们只允许长度为一的方向，再挑投影方差最大的那个。先把这句话理解清楚，下一页才解释为什么解会变成特征向量。']),
    slide('derive', '为什么会出现特征向量？', '04 / 走进推导', 'Cw = λw', 'equation',
      ['把方差目标与单位长度约束写在一起', '对方向向量求导，让梯度等于零', '比较特征值，选择最大的一个'],
      ['现在只看屏幕上的第一行。前半项是我们想增大的方差，后半项负责限制向量长度。这就是拉格朗日函数，先不用急着记它的名字。', '往下走一步：对方向向量求导，再让梯度等于零。协方差矩阵是对称的，所以得到屏幕上的二倍 C 乘 w，减去二倍 λ 乘 w，等于零。', '两边消去二，关键关系就出现了：C 乘 w 等于 λ 乘 w。也就是说，候选方向是特征向量。最后挑最大的特征值；如果最大值并列，方向就不唯一。']),
    slide('worked', '先猜一个答案，再算一遍', '05 / 用小例子检验', '', 'equation',
      ['假设横向方差为 4，纵向为 1，协方差为 0', '转动一把单位尺子，比较投影方差', '横轴保留 4，纵轴保留 1：第一主成分沿横轴'],
      ['推导完了，先别急着说懂了。给你一个能手算的例子：横向方差是四，纵向是一，两者的协方差为零。你先猜一下，第一主成分应该朝哪边？', '我们用角度描述单位方向，代入刚才的目标函数。屏幕上得到四乘余弦平方，加上正弦平方。现在数学已经变成了比较不同角度。', '沿横轴，角度是零，方差就是四。沿纵轴，方差只有一。结果和直觉一致，而且四正是这个矩阵的最大特征值。这就是从直觉到公式，再回到检验。']),
    slide('limits', '一个好方向，不是所有答案', '06 / 边界与迁移', '', 'steps',
      ['尺度会改变结果：是否需要标准化？', '线性投影无法展开所有弯曲结构', '高方差方向不一定有利于预测'],
      ['使用前先检查变量尺度。如果一个变量按毫米记录，另一个按公里记录，单位差异就可能主导结果。是否标准化，需要根据研究目标决定。', 'PCA 找的是线性方向。遇到弯曲的低维结构，一条直线可能无法保留你真正关心的关系。', '最后记住，方差大不等于预测能力强。你现在可以提问，也可以回到前面的公式，让我们用一个更具体的例子解释。'])
  ]
};
export function demoSupplement() {
  return attachEnglish({
    title: '补充课堂：从投影到特征向量', summary: '固定的 PCA 演示补充课；没有调用模型，不针对任意问题生成。', origin: 'demo',
    slides: [
      slide('extra-intuition', '先把问题缩到二维', '补充 01 / 直觉', 'w = (cos θ, sin θ)', 'projection',
        ['转动单位方向，比较投影的分散程度', '归一化排除了任意放大向量的影响'],
        ['这是固定的 PCA 演示补充课，用来测试插入讲解和返回主线。要获得针对具体问题的回答，请选择真实 Codex 模式。', '在二维空间中，我们可以用角度表示单位方向。转动这个方向，就能比较不同角度上的投影方差。']),
      slide('extra-example', '一个可以手算的例子', '补充 02 / 数值', 'C = diag(4, 1)     wᵀCw = 4cos²θ + sin²θ', 'equation',
        ['假设协方差矩阵为对角矩阵 $\\operatorname{diag}(4,1)$', '沿横轴的方差为 4，沿纵轴的方差为 1', '最大值是 4，对应横轴方向'],
        ['考虑一个明确标记为假设的数值例子。协方差矩阵对角线上的数分别为四和一，其他位置为零。', '代入角度表示之后，投影方差等于四乘余弦平方，加上正弦平方。它的最大值是四，在横轴方向达到。', '这也恰好是最大特征值对应的方向。补充讲解结束后，你可以点击返回主线，继续之前暂停的片段。'])
    ]
  });
}

const english = {
  motivation: ['Where is the information hiding?', '01 / Start with a problem',
    ['Do two correlated sensors repeat the same information?', 'Find the direction of greatest variation', 'Compress the data, then check what is lost'],
    ['Imagine two sensors whose readings tend to rise and fall together. Do we really need to keep both readings? Each point in this synthetic diagram represents one observation.', 'Look at the diagonal dashed line. The cloud stretches along that direction, revealing shared variation between the sensors. We want to use that direction as a new coordinate.', 'Today we will connect three things: a geometric direction, a mathematical objective, and a small example we can check by hand. The goal is fewer coordinates while retaining variation.']],
  projection: ['A new direction reveals more variation', '02 / Build geometric intuition',
    ['Project each point onto a line', 'More spread means greater retained variance', 'Use unit directions for a fair comparison'],
    ['Think of the line as a ruler. The short dashed lines show perpendicular projections onto it. The coordinate z records each point using just one number.', 'What makes a good direction? Here we measure the spread of the projected values using variance. Retained variance is not the same as predictive accuracy.', 'There is a trap: multiplying every reading by ten increases the variance without changing the direction. We therefore fix the direction vector to unit length.']],
  objective: ['Turn the intuition into an objective', '03 / From geometry to mathematics',
    ['Subtract each column mean', 'C is the covariance matrix of centered data', 'Maximize projected variance over unit directions'],
    ['First subtract each column mean to obtain the centered data, X c. This measures variation around the center rather than distance from the origin.', 'The covariance matrix C summarizes these variations. Its diagonal records individual variances, while its other entries record how variables vary together.', 'We now search over unit directions and maximize projected variance. Keep that meaning in mind before we derive the eigenvector relationship.']],
  derive: ['Why does an eigenvector appear?', '04 / Follow the derivation',
    ['Form the Lagrangian with a unit-length constraint', 'Set its gradient with respect to w to zero', 'Choose an eigenvector for the largest eigenvalue'],
    ['The first term is the variance we want to increase. The second term enforces unit length. Together they form the Lagrangian shown on the board.', 'Differentiate with respect to w and set the gradient to zero. Because the covariance matrix is symmetric, we obtain two C w minus two lambda w equals zero.', 'Cancel the common factor of two. The candidate directions are eigenvectors of C. Choose a largest eigenvalue; when that value is repeated, the optimal direction need not be unique.']],
  worked: ['Predict the answer, then calculate', '05 / Check a small example',
    ['Assume variances 4 and 1, with zero covariance', 'Rotate a unit direction and compare variance', 'The horizontal direction retains variance 4'],
    ['Suppose the horizontal variance is four, the vertical variance is one, and the covariance is zero. Which direction would you predict for the first principal component?', 'Describe a unit direction using an angle. Substitution gives four times cosine squared plus sine squared, so we can compare different angles.', 'Along the horizontal axis the variance is four; along the vertical axis it is one. Four is also the largest eigenvalue. The calculation agrees with our geometric prediction.']],
  limits: ['A useful direction has limitations', '06 / Return to the application',
    ['Check units and whether to standardize', 'A linear projection cannot unfold every curved structure', 'High variance does not guarantee predictive value'],
    ['Check the scales of your variables. A difference in measurement units can dominate the result. Whether to standardize depends on the scientific question.', 'Principal component analysis finds linear directions. A curved low-dimensional structure may not be well represented by a straight line.', 'Finally, large variance does not guarantee good predictions. You can now ask a question, or return to an equation for a more concrete explanation.']],
  'extra-intuition': ['Reduce the question to two dimensions', 'Supplement 01 / Intuition',
    ['Rotate a unit direction and compare projected variance', 'Normalization rules out arbitrary rescaling'],
    ['This is a fixed demonstration supplement for testing classroom navigation. Select real Codex mode to generate an answer to your specific question.', 'In two dimensions we can describe a unit direction using an angle, then compare the projected variance as that angle changes.']],
  'extra-example': ['An example we can calculate by hand', 'Supplement 02 / Calculation',
    ['Assume covariance matrix $\\operatorname{diag}(4,1)$', 'Horizontal variance is 4; vertical variance is 1', 'The maximum is 4, along the horizontal axis'],
    ['Consider a hypothetical covariance matrix with diagonal entries four and one, and zero off-diagonal entries.', 'Using an angle for the unit direction gives four times cosine squared plus sine squared. The maximum is four, reached along the horizontal axis.', 'That direction is also an eigenvector for the largest eigenvalue. Return to the main lesson to continue the explanation you paused.']]
};
function attachEnglish(lesson) {
  lesson.titleEn = lesson.id === 'demo' ? 'From a cloud of data to a useful direction' : 'Supplement: from projection to eigenvectors';
  lesson.summaryEn = 'Connect a concrete problem, geometric intuition, a derivation, and a worked example.';
  for (const slide of lesson.slides) {
    slide.schematic = demoSchematic(slide.id);
    const [title, eyebrow, bullets, texts] = english[slide.id];
    slide.formula = normalizeFormula(slide.formula);
    Object.assign(slide, { titleEn: title, eyebrowEn: eyebrow, bulletsEn: bullets, formulaEn: slide.formula });
    for (const [i, beat] of slide.beats.entries()) {
      beat.textEn = texts[i]; beat.scene.captionEn = bullets[beat.focus];
      beat.scene.formula = normalizeFormula(beat.scene.formula);
      beat.scene.formulaEn = beat.scene.formula;
      const cue = (sentence) => {
        if (slide.id === 'derive' && i === 0) return {kind:'formula',index:i};
        if (slide.id === 'derive' && i === 2 && sentence === 0) return {kind:'formula',index:i};
        if (slide.id === 'limits') return {kind:'node',index:i+1};
        if (['scatter','projection'].includes(slide.visual) && sentence === 0) return {kind:'chart',index:0};
        if (['worked','extra-example'].includes(slide.id) && i === 0 && sentence === 1) return {kind:'node',index:1};
        return fallbackTarget(slide,i,sentence);
      };
      beat.scene.targets = sentences(beat.text,'zh').map((_,sentence)=>({sentence,...cue(sentence)}));
      beat.scene.targetsEn = sentences(beat.textEn,'en').map((_,sentence)=>({sentence,...cue(sentence)}));
    }
  }
  return lesson;
}
attachEnglish(teachingMaterial);
export const demoLesson = planExpressions(withOutline(compactPca(teachingMaterial)));
