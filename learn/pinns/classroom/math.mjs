import katex from './vendor/katex/katex.mjs';

const legacy = new Map([
  ['Xc = X − mean(X)', String.raw`X_c = X - \operatorname{mean}(X)`],
  ['C = XcᵀXc / (n − 1)', String.raw`C = \frac{X_c^{\mathsf T}X_c}{n-1}`],
  ['max wᵀCw，wᵀw = 1', String.raw`\max_{w^{\mathsf T}w=1}\; w^{\mathsf T}Cw`],
  ['max  wᵀCw     s.t.  wᵀw = 1', String.raw`\max_w\;w^{\mathsf T}Cw\quad\text{s.t.}\quad w^{\mathsf T}w=1`],
  ['L = wᵀCw − λ(wᵀw − 1)', String.raw`\mathcal L=w^{\mathsf T}Cw-\lambda(w^{\mathsf T}w-1)`],
  ['∇wL = 2Cw − 2λw = 0', String.raw`\nabla_w\mathcal L=2Cw-2\lambda w=0`],
  ['Cw = λw → 最大 λ 对应第一主成分', String.raw`Cw=\lambda w`],
  ['Cw = λw → largest λ gives the first component', String.raw`Cw=\lambda w`],
  ['C = diag(4, 1)', String.raw`C=\begin{pmatrix}4&0\\0&1\end{pmatrix}`],
  ['Var(z) = 4cos²θ + sin²θ', String.raw`\operatorname{Var}(z)=4\cos^2\theta+\sin^2\theta`],
  ['θ = 0 → Var(z) = 4；θ = π/2 → Var(z) = 1', String.raw`\begin{aligned}\theta=0&\;\Rightarrow\;\operatorname{Var}(z)=4\\\theta=\pi/2&\;\Rightarrow\;\operatorname{Var}(z)=1\end{aligned}`],
  ['max Var(z) = 4，w = (1, 0)', String.raw`\max\operatorname{Var}(z)=4,\quad w=(1,0)^{\mathsf T}`],
  ['w = (cos θ, sin θ)', String.raw`w=(\cos\theta,\sin\theta)^{\mathsf T}`],
  ['C = diag(4, 1)     wᵀCw = 4cos²θ + sin²θ', String.raw`\begin{aligned}C&=\operatorname{diag}(4,1)\\w^{\mathsf T}Cw&=4\cos^2\theta+\sin^2\theta\end{aligned}`]
]);
export const escapeHtml = text => String(text).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
export function normalizeFormula(value) {
  const text = String(value || '').trim().replace(/^\$\$([\s\S]*)\$\$$/, '$1').replace(/^\\\[([\s\S]*)\\\]$/, '$1');
  if (legacy.has(text)) return legacy.get(text);
  if (text.includes('\\')) return text;
  return text.replace(/ᵀ/g, '^{\\mathsf T}').replace(/²/g, '^2').replace(/₁/g, '_1').replace(/₂/g, '_2')
    .replace(/λ/g, '\\lambda ').replace(/θ/g, '\\theta ').replace(/π/g, '\\pi ').replace(/−/g, '-').replace(/→/g, '\\Rightarrow ')
    .replace(/Var\(/g, '\\operatorname{Var}(');
}
export function assertFormula(value) {
  if (!value) return;
  const tex = normalizeFormula(value);
  if (/\\(?:href|url|includegraphics|html\w*|def|gdef|newcommand|renewcommand)\b/.test(tex)) throw new Error('公式包含不支持的命令');
  katex.renderToString(tex, { throwOnError: true, trust: false, strict: 'ignore', maxExpand: 200, maxSize: 15 });
}
export function mathHtml(value, displayMode = true, terms = []) {
  if (!value) return '';
  try {
    assertFormula(value);
    let tex=normalizeFormula(value);
    for(const term of terms){
      if(!/^[a-z][a-z0-9-]{0,40}$/.test(term.id)||!term.tex||tex.split(term.tex).length!==2)throw Error('Invalid mathematical focus term');
      assertFormula(term.tex);
      tex=tex.replace(term.tex,()=>`\\htmlClass{teaching-math-term teaching-term-${term.id}}{${term.tex}}`);
    }
    return katex.renderToString(tex, { displayMode, throwOnError: true, trust: terms.length?c=>c.command==='\\htmlClass':false, strict: 'ignore', maxExpand: 200, maxSize: 15 });
  } catch {
    return `<span class="math-error" role="alert">公式无法排版，请修正 LaTeX</span>`;
  }
}
export function proseHtml(value) {
  return String(value).split(/(\$[^$\n]+\$|\\\([\s\S]*?\\\))/g).map(part =>
    part.startsWith('$') && part.endsWith('$') ? mathHtml(part.slice(1,-1),false) :
    part.startsWith('\\(') && part.endsWith('\\)') ? mathHtml(part.slice(2,-2),false) : escapeHtml(part)).join('');
}
