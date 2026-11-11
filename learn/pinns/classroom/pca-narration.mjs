// Each segment names its visible elements, explains their relationship, and bridges forward.
export const pcaNarration={
 motivation:[[
 '先从两路传感器开始：横轴 x 一和纵轴 x 二分别记录第一路和第二路变量，每个蓝点或橙点代表一次观测，颜色只用于区分点。两路读数常常一起升降，所以点云沿斜向展开，而不是铺满整个平面。这就提出了左下角的问题：两个坐标是否重复记录了部分信息？接下来，我们沿点云伸展的方向，寻找一个更简洁的坐标。',
 'Start with two sensors: the horizontal axis, x one, records the first variable, and the vertical axis, x two, records the second, and each blue or orange dot is one observation, the colours simply distinguish points. The readings tend to rise together, so the cloud stretches diagonally rather than filling the plane. That explains the question below: do the two coordinates repeat some information? Next, we will look along the cloud to find a simpler coordinate.'
 ],[
 '看斜着的虚线，它标出了变化最明显的方向，图下的 w 就表示方向向量。若沿这个方向读数，我们可以用一个坐标概括两路读数共同的变化。这里展示的是合成示意数据，不是论文中的实验结果。方向有了，但怎样把每个点变成一个数？下一页用投影回答。',
 'Look at the diagonal dashed line: it marks the direction of greatest variation, and w in the legend denotes that direction vector. Reading along it could summarise the shared variation with one coordinate. These are synthetic teaching points, not experimental results from a paper. We have a direction, but how do we turn each point into one number? Projection gives us the next step.'
 ]],
 projection:[[
 '接着上一页，把黄色方向当成一把尺子。蓝色短虚线把每个观测点垂直送到尺子上，落点在尺子上的位置就是新坐标 z。公式 z 等于 X 乘 w，是把所有观测沿同一个方向读数：X 是数据矩阵，每行是一条观测、每列是一个变量，w 是方向向量，z 收集投影值。这样从两个坐标压成一个坐标后，我们还需要衡量保留了多少变化。',
 'Following the previous page, treat the yellow direction as a ruler. The short blue dashed lines project each observation perpendicularly onto it, and the position on that ruler is the new coordinate z. In z equals X times w, X is the data matrix with one observation per row and one variable per column, w is the direction vector, and z collects the projected values. After reducing two coordinates to one, we still need to measure how much variation remains.'
 ],[
 '图里的投影越分散，保留的变化就越多，我们用方差来量化这种分散。下面的 Var 括号 z 表示投影值的方差，C 表示协方差矩阵，它概括变量各自及共同的变化，右上角的 T 表示转置，也就是交换矩阵的行和列，这里把列向量变成行向量，公式把这些量组合起来计算投影方差。这里保留的是数据变化，不是预测准确率。比较方向之前还有一个条件：不能通过放大 w 的长度来提高得分，下一页先解决这个公平性问题。',
 'More spread among the projected values means more retained variation, variance measures that spread. In the formula, Var of z denotes projected variance, C is the covariance matrix summarising individual and shared variation, and the superscript T denotes transpose, which swaps rows and columns and turns our column vector into a row vector. Retained variation is not predictive accuracy. Before comparing directions, we must prevent a longer w from artificially increasing the score, that is our next question.'
 ]],
 'unit-direction':[[
 '左框和右框比较的是同一方向的两种长度，而不是两个不同朝向。若把方向向量乘十，投影值也乘十，方差就乘一百，这个提高只是读数尺度变了。公式 w 转置乘 w 等于一，规定方向向量的长度为一，让所有候选方向公平比较。长度固定后，我们回到数据本身，先说明为什么要中心化。',
 'The two boxes compare different lengths along the same direction, rather than different orientations. Multiplying the direction vector by ten multiplies projected values by ten and variance by a hundred, only the scale of the readings has changed. The equation w transpose w equals one fixes the vector length to one, giving every candidate direction a fair comparison. With length fixed, let us return to the data and explain centering.'
 ]],
 objective:[[
 '前面已经固定了方向长度，现在处理数据的位置。左框是原始数据，箭头表示每一列减去这一列的均值，右框就是中心化数据。公式里的 X c 表示这个结果：数据云移到中心，但点之间的相对关系不变。这样我们衡量的是围绕中心的变化，下一步把这些变化整理进协方差矩阵。',
 'We have fixed the direction length, now consider the position of the data. The left box is the raw data, the arrow subtracts each column mean, and the right box is the centred data. X c in the formula denotes that result: the cloud moves to the centre while relative positions are preserved. We can now describe variation around the centre, which leads to the covariance matrix.'
 ]],
 covariance:[[
 '沿着箭头，从左边的中心化数据得到右边的协方差矩阵 C。公式先用 X c 的转置乘 X c，汇总每对变量共同的变化，其中 n 表示观测的样本数，再除以 n 减一，得到样本协方差。矩阵对角线是各变量的方差，其他位置说明变量怎样一起变化。有了 C 和前面固定的单位方向，下一页就能写出完整的优化目标。',
 'Follow the arrow from the centred data on the left to the covariance matrix C on the right. The formula multiplies X c transpose by X c to aggregate how pairs of variables vary together, where n denotes the number of observations, then divides by n minus one to obtain sample covariance. Diagonal entries are individual variances, the other entries describe shared variation. With C and our unit directions defined, we can now write the complete optimisation problem.'
 ]],
 'variance-objective':[[
 '把前两步合起来：左框给出所有允许的单位方向，箭头表示逐个比较，右框是我们要找的最大方差。公式中 w 转置 C w 是投影方差，要让它尽可能大，旁边的约束要求 w 转置 w 等于一。目标负责保留变化，约束负责公平比较。现在问题定义完整了，下一页把目标和约束放进同一个函数。',
 'Bring the previous steps together: the left box contains allowed unit directions, the arrow compares them, and the right box is the largest retained variance. In the formula, w transpose C w is the projected variance we want to maximise, subject to w transpose w equalling one. The objective retains variation, the constraint keeps the comparison fair. The problem is now fully defined, so next we combine its objective and constraint in one function.'
 ]],
 derive:[[
 '左框提醒我们保留方差目标，右框提醒我们保留单位长度约束，两者都不能丢。公式左边的 L 是拉格朗日函数的名称，第一项 w 转置 C w 是目标，括号内 w 转置 w 减一在满足约束时等于零，lambda 是用来施加约束的乘子。把这两部分组成拉格朗日函数，目的不是增加一个新目标，而是方便寻找满足约束的候选方向。下一页对方向变量求导。',
 'The left box keeps the variance objective in view, the right box keeps the unit-length constraint, and we need both. In the equation, L names the Lagrangian, and the first term is the objective, while w transpose w minus one is zero when the constraint holds, lambda is the multiplier used to impose it. This Lagrangian helps us find constrained candidate directions rather than introducing a new objective. Next we differentiate with respect to the direction.'
 ]],
 stationary:[[
 '左框是刚才构造的拉格朗日函数，求导箭头把它连接到右边的驻点条件。公式左边的倒三角带下标 w 表示对方向变量 w 求梯度，因为协方差矩阵对称，方差项对 w 求导得到二倍 C w，约束项得到负二倍 lambda w。公式让这两个部分的和等于零，表示候选最优点必须满足的条件，还不是最终答案。下一页消去共同的因子，看看它为什么变成特征向量关系。',
 'The left box is the Lagrangian we just constructed, the differentiation arrow leads to the stationary condition on the right. The nabla symbol with subscript w means the gradient with respect to w, and because the covariance matrix is symmetric, differentiating the variance term gives two C w, and the constraint term gives minus two lambda w. Setting their sum to zero gives a necessary condition for a candidate optimum, rather than the final answer. Next we cancel the common factor and identify the eigenvector relationship.'
 ]],
 eigenvector:[[
 '上一页的等式消去二并移项，就得到 C w 等于 lambda w。它说 C 作用在候选方向 w 上，只改变长度，不改变所在的直线，这正是特征向量的定义。左框包含这些候选方向，中间箭头要求比较它们的特征值，右框才是第一主成分。由于 w 长度为一，把这个等式代入方差目标，得分就等于 lambda，所以选最大的特征值，若最大值并列，方向可以不唯一。下一页用数值和 Python 检验这个结论。',
 'Cancel the factor of two in the previous equation and rearrange to obtain C w equals lambda w. Acting with C changes the scale along the candidate line, which is the eigenvector relationship. The left box contains candidate directions, the arrow compares their eigenvalues, and the right box is the first component. Since w has unit length, substituting this relationship into the variance objective makes the score equal to lambda, choose a largest eigenvalue, with possible non-uniqueness when the largest value is repeated. Next we check the conclusion with numbers and Python.'
 ]],
 worked:[[
 '用一个可以检验的例子接住刚才的推导：左框的横向方差是四，右框的纵向方差是一。公式的对角线上分别放四和一，非对角项为零，表示两路变量没有协方差。我们预测横向能保留更多变化，但先不要只相信猜测。接下来让 Python 旋转方向，看看投影方差是否真的在横轴达到最大。',
 'Let us check the derivation with a concrete example: the left box has horizontal variance four, and the right box has vertical variance one. The matrix puts four and one on its diagonal, with zero off-diagonal entries indicating zero covariance. We predict that the horizontal direction retains more variation, but a prediction needs checking. Next Python will rotate the direction to test whether projected variance really is largest along the horizontal axis.'
 ]],
 scales:[[
 '刚才的数值检验使用了明确给定的方差，实际数据还要先检查单位。左框代表变量及其测量单位，中间箭头提醒先检查，右框才是尺度判断。若一个变量换成更小的计量单位，它的数值和方差都会增大，可能改变第一主成分。是否标准化要由研究问题决定，而不是默认总要做。即使尺度处理好了，下一页还要说明 PCA 本身的边界。',
 'Our numerical check used specified variances, but real data also requires a units check. The left box represents variables and their units, the arrow says to check first, and the right box is the scale assessment. Changing to a smaller measurement unit increases numerical values and variance, which can change the first component. Whether to standardise depends on the research question. Even after handling scales, we must consider the limits of PCA itself.'
 ]],
 limits:[[
 '沿着刚才的尺度提醒，再看 PCA 本身能回答什么。上面的框列出方法边界，左边分支检查线性结构：PCA 只能寻找直线方向，不能用一条直线展开所有弯曲关系。所以压缩后仍要检查，重要结构是否被保留。还有一个独立的问题留在右边：保留的变化是否对你的预测任务有用。',
 'Following the units check, consider what PCA itself can answer. The upper box marks the method limits, and the left branch checks linear structure: a straight projection cannot unfold every curved relationship. After compression, check whether the structure you care about remains. A separate question awaits on the right: is the retained variation useful for your prediction task?'
 ],[
 '现在看右边的预测价值分支，它和左边的线性结构是两项独立检查。PCA 优化的是方差，没有使用预测目标，所以高方差不保证预测准确率。把路线连起来：从点云建立投影，用单位约束写出方差目标，再推导特征向量，用 Python 检验，最后检查尺度与用途。你可以在任意一步提问，我们会停下来解释后再继续。',
 'Now look at the predictive-value branch on the right, it is a separate check from linear structure on the left. PCA optimises variance without using a prediction target, so large variance does not guarantee prediction accuracy. Connect the route: start with a cloud and a projection, define a variance objective with a unit constraint, derive eigenvectors, check with Python, then examine scales and purpose. You can interrupt at any step and we will explain before continuing.'
 ]]
};
