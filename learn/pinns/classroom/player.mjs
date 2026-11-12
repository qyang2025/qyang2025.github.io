import {conversationalPause,conversationalRate} from './teaching-presence.mjs?v=paper20a';
export function sentences(text, language = 'zh') {
  const segmented = [...new Intl.Segmenter(language === 'en' ? 'en' : 'zh', { granularity: 'sentence' }).segment(text)].map(x => x.segment);
  return segmented.flatMap(x => x.match(/[^；;]+[；;]?/gu) || []).map(x => x.trim()).filter(Boolean);
}
// Audio callbacks own the classroom clock. Resume replays the current sentence.
export class LecturePlayer {
  constructor({ speech = globalThis.speechSynthesis, utterance = text => new SpeechSynthesisUtterance(text), onChange = () => {}, onError = () => {}, onActivity = () => {}, gapMs = 900 } = {}) {
    this.speech = speech; this.utterance = utterance; this.onChange = onChange; this.onError = onError;
    this.onActivity = onActivity; this.gapMs = gapMs;
    this.lesson = null; this.slide = 0; this.beat = 0; this.sentence = 0; this.playing = false; this.speaking = false;
    this.rate = .8; this.voiceURI = ''; this.epoch = 0; this.stack = []; this.buffering = false; this.presented = null;
  }
  load(lesson) {
    this.activityHold=null;this.pause(); this.lesson = lesson; this.slide = 0; this.beat = 0; this.sentence = 0; this.stack = []; this.syncPresentation(); this.emit();
  }
  currentSlide() { return this.lesson.slides[this.slide]; }
  currentBeat() { return this.currentSlide().beats[this.beat]; }
  syncPresentation() { this.presented = { slide: this.slide, beat: this.beat, sentence: this.sentence }; }
  displayPosition() { return this.presented || { slide: this.slide, beat: this.beat, sentence: this.sentence }; }
  displayText() {
    const p = this.displayPosition(), beat = this.lesson.slides[p.slide].beats[p.beat];
    return sentences(beat.text, this.lesson.language)[p.sentence] || beat.text;
  }
  currentText() { return sentences(this.currentBeat().text, this.lesson.language)[this.sentence] || this.currentBeat().text; }
  checkpoint() { return { lesson: this.lesson, slide: this.slide, beat: this.beat, sentence: this.sentence }; }
  emit() { if (this.lesson) this.onChange(this); }
  pause() {
    this.epoch++; clearTimeout(this.timer); this.playing = false; this.speaking = false; this.buffering = false; this.speech?.cancel();
    this.onActivity({ speaking: false, reason: 'paused' }); this.emit();
    return this.lesson ? this.checkpoint() : null;
  }
  pauseAtVisible() {
    const position = this.displayPosition();
    this.pause(); Object.assign(this, position); this.emit();
    return this.lesson ? this.checkpoint() : null;
  }
  stepForward() {
    if (!this.lesson) return null;
    const p = this.displayPosition(); this.pauseAtVisible(); this.activityHold = null;
    const slide = this.lesson.slides[p.slide];
    let beat = p.beat, sentence = p.sentence + 1;
    if (sentence >= sentences(slide.beats[beat].text, this.lesson.language).length) { sentence = 0; beat++; }
    if (beat >= slide.beats.length) {
      if (p.slide + 1 < this.lesson.slides.length) this.seek(p.slide + 1); else this.emit();
    } else { Object.assign(this, { beat, sentence }); this.syncPresentation(); this.emit(); }
    this.onActivity({ speaking: false, reason: 'stepped', audioTime: 0, duration: 1 });
    return this.displayPosition();
  }
  play() {
    if (!this.speech) { this.onError('此浏览器不支持语音合成；仍可逐页阅读讲稿。'); return; }
    this.activityHold=null;this.pause(); this.speech.unlock?.(); this.playing = true; this.emit(); this.speak();
  }
  speak() {
    if (!this.playing) return;
    const token = this.epoch;
    const message = this.utterance(this.currentText());
    const conversational=!!this.currentBeat().scene?.conversational||this.lesson.origin==='authored-paper-implementation';
    message.context = { lessonId: this.lesson.id, language: this.lesson.language || 'zh', slideId: this.currentSlide().id, beatId: this.currentBeat().id, sentenceIndex: this.sentence };
    if (this.sentence + 1 < sentences(this.currentBeat().text, this.lesson.language).length) message.nextContext = { ...message.context, sentenceIndex: this.sentence + 1 };
    else if (this.beat + 1 < this.currentSlide().beats.length) message.nextContext = { ...message.context, beatId: this.currentSlide().beats[this.beat + 1].id, sentenceIndex: 0 };
    else if (this.slide + 1 < this.lesson.slides.length) message.nextContext = { ...message.context, slideId: this.lesson.slides[this.slide + 1].id, beatId: this.lesson.slides[this.slide + 1].beats[0].id, sentenceIndex: 0 };
    message.lang = this.lesson.language === 'en' ? 'en-US' : 'zh-CN'; message.rate = this.rate*(conversational?conversationalRate(message.text):1); message.pitch = 1.03;
    const voices = this.speech.getVoices?.() || [];
    const ranked = voices.filter(v => v.lang.startsWith(this.lesson.language === 'en' ? 'en' : 'zh'));
    const voice = voices.find(v => v.voiceURI === this.voiceURI) || ranked[0];
    if (voice) message.voice = voice;
    message.onstart = () => {
      if (token !== this.epoch || !this.playing) return;
      this.buffering = false; this.speaking = true; this.syncPresentation(); this.emit(); this.onActivity({ speaking: true, charIndex: 0, reason: 'playing' });
    };
    message.onbuffering = () => {
      if (token !== this.epoch || !this.playing) return;
      this.buffering = true; this.speaking = false; this.onActivity({ speaking: false, reason: 'buffering' }); this.emit();
    };
    message.onlevel = activity => {
      if (token === this.epoch && this.playing) this.onActivity({ speaking: true, ...activity });
    };
    message.onboundary = event => {
      if (token === this.epoch && this.playing) this.onActivity({ speaking: true, charIndex: event.charIndex });
    };
    message.onend = completion => {
      if (!this.playing || token !== this.epoch) return;
      this.buffering = false; this.speaking = false; this.onActivity({ speaking: false, reason: 'ended', ...completion });
      const exerciseSeconds=this.sentence+1===sentences(this.currentBeat().text,this.lesson.language).length?this.currentBeat().pauseAfter:0;
      let beatChanged = false, pageChanged = false;
      if (this.sentence + 1 < sentences(this.currentBeat().text, this.lesson.language).length) this.sentence++;
      else {
        this.sentence = 0; beatChanged = true;
        if (this.beat + 1 < this.currentSlide().beats.length) this.beat++;
        else if (this.slide + 1 < this.lesson.slides.length) { this.slide++; this.beat = 0; pageChanged = true; }
        else { this.playing = false; this.emit(); return; }
      }
      if(exerciseSeconds){this.playing=false;this.activityHold={seconds:exerciseSeconds,slide:this.slide,beat:this.beat};this.emit();return;}
      this.emit();
      const next = () => { if (token === this.epoch && this.playing) this.speak(); };
      if (this.gapMs === 0) next();
      else this.timer = setTimeout(next, conversational?conversationalPause(message.text,this.gapMs,{pageChanged,beatChanged}):this.gapMs*(pageChanged?3:beatChanged?2:1));
    };
    message.onerror = event => {
      if (token !== this.epoch) return;
      this.pause();
      this.onError(`语音未能播放（${event.error || 'unknown'}）。可以继续阅读字幕或换用系统浏览器。`);
    };
    this.activeUtterance = message;
    this.speech.speak(message);
  }
  seek(index) {
    this.activityHold=null;
    if (!Number.isInteger(index) || index < 0 || index >= this.lesson.slides.length) return;
    this.pause(); this.slide = index; this.beat = 0; this.sentence = 0; this.syncPresentation(); this.emit();
  }
  enter(lesson, checkpoint = this.checkpoint()) {
    this.pause(); this.stack.push(checkpoint); this.lesson = lesson;
    this.slide = 0; this.beat = 0; this.sentence = 0; this.syncPresentation(); this.emit();
  }
  setLanguage(lesson) {
    if (lesson.id !== this.lesson.id || lesson.slides[this.slide]?.id !== this.currentSlide().id || lesson.slides[this.slide]?.beats[this.beat]?.id !== this.currentBeat().id) throw new Error('语言版本的页面或讲解步骤不匹配');
    this.activityHold=null;this.pause(); this.lesson = lesson; this.sentence = 0; this.syncPresentation(); this.emit();
  }
  returnToParent(localized) {
    if (!this.stack.length) return;
    if (localized && localized.id !== this.stack.at(-1).lesson.id) throw new Error('返回课件与保存的位置不匹配');
    this.pause(); const point = this.stack.pop();
    this.lesson = localized || point.lesson; this.slide = point.slide; this.beat = point.beat;
    this.sentence = localized && localized.language !== point.lesson.language ? 0 : point.sentence || 0; this.syncPresentation(); this.emit();
  }
}
