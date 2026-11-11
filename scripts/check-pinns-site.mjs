import {validateTargets} from '../learn/pinns/classroom/attention.mjs';
function canonicalEvidence(v){if(Array.isArray(v))return v.map(canonicalEvidence);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonicalEvidence(v[k])]));return v;}
function evidenceDigest(v){return createHash('sha256').update(JSON.stringify(canonicalEvidence(v))).digest('hex');}
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {localizeLesson} from '../learn/pinns/classroom/languages.mjs';
import {sentences} from '../learn/pinns/classroom/player.mjs';
import {assertFormula,proseHtml} from '../learn/pinns/classroom/math.mjs';
import {fileURLToPath} from 'node:url';
function narrationPlan(lesson){return lesson.slides.flatMap(slide=>slide.beats.flatMap(beat=>sentences(beat.text,lesson.language).map((text,sentenceIndex)=>({lessonId:lesson.id,slideId:slide.id,beatId:beat.id,sentenceIndex,text}))));}
const site=path.resolve(process.argv.slice(2).find(a=>!a.startsWith('--'))||fileURLToPath(new URL('../',import.meta.url)));
const root=path.join(site,'learn/pinns/classroom'),json=async p=>JSON.parse(await readFile(p,'utf8'));
const manifest=await json(path.join(root,'courses/pinns/manifest.json')),pack=await json(path.join(root,'published-audio.json'));
const catalog=await json(path.join(root,'courses/pinns-papers/catalog.json'));const courses=[{id:'pinns',courseRoot:'courses/pinns',manifest},...await Promise.all(catalog.papers.filter(p=>p.published).map(async p=>({...p,manifest:await json(path.join(root,p.courseRoot,'manifest.json'))})))];
for(const course of courses.filter(c=>c.manifest.paper)){
 const evidence=await json(path.join(root,course.courseRoot,'experiment-evidence.json'));assert.equal(evidence.schema,'canonical-json-sha256-v1');assert.equal(evidence.record,'trace.json');
 const trace=await json(path.join(root,course.courseRoot,evidence.record));assert.equal(evidenceDigest(trace),evidence.sha256,`Experiment record changed: ${course.id}`);
 const archive=await readFile(path.join(root,course.courseRoot,course.manifest.download));assert.equal(archive.subarray(0,4).toString('hex'),'504b0304');assert.equal(createHash('sha256').update(archive).digest('hex'),course.manifest.downloadSha256,`Download package changed: ${course.id}`);
}
let checked=0;const totals={en:0,zh:0},ready={en:0,zh:0},audioVerified=new Set();
for(const course of courses)for(const module of course.manifest.modules){const lesson=await json(path.join(root,course.courseRoot,module.file));assert.equal(lesson.slides.length,module.pages,'Slide count differs from course manifest');for(const slide of lesson.slides){validateTargets(slide);assertFormula(slide.formula);assertFormula(slide.formulaEn);for(const node of slide.schematic?.nodes||[])for(const label of [node.label,node.labelEn])assert.ok(!proseHtml(label).includes('katex-error'));}const coverage=pack.courseCoverage[course.id].find(r=>r.chapter===module.index+1);assert.ok(coverage);for(const language of ['en','zh']){
 let total=0,cached=0;for(const input of narrationPlan(localizeLesson(lesson,language),language==='en'?'bm_george':'zm_010')){total++;totals[language]++;
 const key=[input.lessonId,language,input.slideId,input.beatId,input.sentenceIndex].join('/'),clip=pack.clips[key];
 if(!clip){assert.ok(language==='zh'&&!process.argv.includes('--require-chinese'),`Missing audio: ${key}`);continue;}
 assert.equal(clip.text,input.text,`Transcript mismatch: ${key}`);assert.ok(clip.duration>0);assert.ok(clip.audioUrl.startsWith('/learn/pinns/classroom/audio/'));
 if(!audioVerified.has(clip.audioUrl)){const audioPath=path.join(site,clip.audioUrl);assert.ok((await stat(audioPath)).size>1000);const bytes=await readFile(audioPath);assert.equal(bytes.subarray(0,4).toString(),'OggS');audioVerified.add(clip.audioUrl);}checked++;cached++;ready[language]++;
 }assert.equal(coverage[language].total,total);assert.equal(coverage[language].ready,cached);if(language==='en')assert.equal(cached,total);
}}
assert.equal(totals.en,courses.reduce((n,c)=>n+c.manifest.modules.reduce((m,p)=>m+p.sentenceCount,0),0));
const html=await readFile(path.join(root,'index.html'),'utf8'),player=await readFile(path.join(root,'published-classroom.mjs'),'utf8');assert.ok(html.includes('published-classroom.mjs'));assert.ok(!html.includes('src="/app.mjs"'));assert.ok(!player.includes('window.open('));assert.ok(!player.includes('/api/playback/open-window'));
const visited=new Set();
async function checkModule(file){if(visited.has(file))return;assert.ok(file.startsWith(root+path.sep),'Module escaped the classroom root');visited.add(file);const source=await readFile(file,'utf8');assert.ok(!/\b(?:window|globalThis)\.open\s*\(/.test(source),`Popup call in classroom dependency: ${file}`);assert.ok(!source.includes('/api/playback/open-window'));for(const match of source.matchAll(/\b(?:from|import)\s*['"](\.[^'"]+)['"]/g)){const target=path.resolve(path.dirname(file),match[1].split(/[?#]/)[0]);assert.ok((await stat(target)).isFile(),`Missing module ${match[1]}`);await checkModule(target);}}
await checkModule(path.join(root,'published-classroom.mjs'));
let styles=0,fonts=0;for(const match of html.matchAll(/<link[^>]+href="([^"]+)"/g)){if(!match[1].includes('.css'))continue;const file=path.resolve(root,match[1].split('?')[0]);const css=await readFile(file,'utf8');styles++;for(const ref of css.matchAll(/url\(\s*['"]?([^'"()\s]+)['"]?\s*\)/g)){if(/^(data:|https?:|#)/.test(ref[1]))continue;const asset=path.resolve(path.dirname(file),ref[1].split(/[?#]/)[0]);assert.ok((await stat(asset)).size>0,`Missing CSS asset ${ref[1]}`);fonts++;}}
const registry=await json(path.join(site,'learn/series.json'));for(const entry of registry.series)assert.ok((await stat(path.join(site,'learn',entry.url,'index.html'))).isFile());
console.log(`PASS: ${courses.length} course packs, ${checked} audio/transcript matches, ${audioVerified.size} Ogg files, no popup path and valid series links.`);console.log(JSON.stringify({totals,ready}));
console.log(JSON.stringify({modules:visited.size,styles,fontReferences:fonts}));
