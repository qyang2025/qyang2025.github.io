// Shared authored-diagram contract. Keep render targets and reveal counts in one place.
export const paperTraceFiles=Object.freeze({
 paper01:'./courses/pinns-papers/01-raissi-2017/trace.json',
 paper02:'./courses/pinns-papers/02-raissi-2017-part-ii/trace.json',
 paper03:'./courses/pinns-papers/03-wang-2020-gradients/trace.json',
 paper04:'./courses/pinns-papers/04-krishnapriyan-2021-curriculum/trace.json',
 paper05:'./courses/pinns-papers/05-wang-2022-causality/trace.json',
 paper06:'./courses/pinns-papers/06-yu-2022-gpinn/trace.json',
 paper07:'./courses/pinns-papers/07-wu-2023-sampling/trace.json'
});
const entries={};
function register(names,options={}){for(const name of names)entries[name]=Object.freeze({nodes:1,code:false,replay:false,renderer:'legacy',...options});}
register(['physical','samples']);register(['code'],{code:true});register(['training','comparison'],{nodes:2,replay:true});
register(['inverse-observations','inverse-identifiability'],{renderer:'inverse'});register(['inverse-code','inverse-loss-code'],{code:true});register(['inverse-a','inverse-b'],{nodes:2,replay:true,renderer:'inverse'});
register(['gradient-physical'],{renderer:'gradient'});register(['gradient-code'],{code:true,customCode:true});register(['gradient-training','gradient-norms','gradient-weight','gradient-error'],{nodes:2,replay:true,renderer:'gradient'});
register(['transport-physical','transport-characteristic'],{renderer:'transport'});register(['transport-code'],{code:true,customCode:true});register(['transport-training','transport-error','transport-time-error'],{nodes:2,replay:true,renderer:'transport'});
register(['causal-physical'],{renderer:'causal'});register(['causal-code'],{code:true,customCode:true});register(['causal-training','causal-weights','causal-energy','causal-phase','causal-error'],{nodes:2,replay:true,renderer:'causal'});
register(['gpinn-physical','gpinn-tangent'],{renderer:'gpinn'});register(['gpinn-code'],{code:true,customCode:true});register(['gpinn-training','gpinn-slope','gpinn-residual','gpinn-error'],{nodes:2,replay:true,renderer:'gpinn'});
register(['sampling-physical'],{renderer:'sampling'});register(['sampling-code'],{code:true,customCode:true});register(['sampling-points','sampling-probability','sampling-training','sampling-residual','sampling-error'],{nodes:2,replay:true,renderer:'sampling'});
export const paperDemoMeta=Object.freeze(entries);
