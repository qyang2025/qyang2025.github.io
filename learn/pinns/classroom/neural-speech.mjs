export function activeWord(words, time) {
  let result = null;
  for (const word of words) {
    if (word.start > time) break;
    if (time < word.start + word.duration) result = word;
  }
  return result;
}

// SpeechSynthesis-compatible adapter; actual media events drive LecturePlayer.
export class NeuralSpeech {
  constructor({ fetcher = globalThis.fetch.bind(globalThis), audioFactory = () => new Audio(), contextFactory = () => new (window.AudioContext || window.webkitAudioContext)(), playback = null } = {}) {
    Object.assign(this, { fetcher, audioFactory, contextFactory, playback });
    this.sequence = 0; this.cache = new Map(); this.current = null; this.voices = [];
  }
  async configure() {
    const result = await this.fetcher('/api/speech/config');
    if (!result.ok) throw new Error('无法读取自然语音配置');
    this.config = await result.json();
    this.voices = this.config.voices.filter(v=>v.available!==false).map(v => ({ ...v, voiceURI: v.id, name: v.name, lang: v.lang || 'zh' }));
    return this.config;
  }
  getVoices() { return this.voices; }
  unlock() {
    try { this.audioContext ||= this.contextFactory(); this.audioContext.resume().catch(() => {}); }
    catch { /* Audio can still play if an analyser is unavailable. */ }
  }
  async prepare(context, voice) {
    const input = { ...context, voice };
    const key = JSON.stringify(input);
    if (this.cache.has(key)) return this.cache.get(key);
    const pending = (async () => {
      const response = await this.fetcher('/api/speech', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || '自然语音生成失败');
      return value;
    })();
    this.cache.set(key, pending);
    try { return await pending; } catch (error) { this.cache.delete(key); throw error; }
  }
  cancel() {
    this.sequence++;
    const current = this.current; this.current = null;
    if (!current) return;
    cancelAnimationFrame(current.frame);
    if(current.audio){current.audio.onplaying=null;current.audio.onwaiting=null;current.audio.onended=null;current.audio.onerror=null;}
    current.audio?.pause();
    if (current.audio) { current.audio.removeAttribute('src'); current.audio.load(); }
    current.audio?.remove?.();
    current.source?.disconnect(); current.analyser?.disconnect();
  }
  speak(message) {
    this.cancel();
    const token = this.sequence;
    const current = { message, token }; this.current = current;
    const valid = () => this.current === current && token === this.sequence;
    const permitted = () => valid() && (!this.playback || this.playback.canPlay());
    const fail = error => {
      if (!valid()) return;
      this.cancel(); message.onerror?.({ error: error.message || '自然语音播放失败' });
    };
    message.onbuffering?.();
    (async () => {
      if(this.playback&&!await this.playback.acquire()){if(valid())this.playback.stop('not-permitted');return;}
      if(!permitted())return;
      const language = message.context?.language || 'zh';
      const voice = message.voice?.voiceURI || this.voices.find(v => v.lang.startsWith(language))?.voiceURI || (language === 'en' ? 'bm_george' : 'zm_010');
      const manifest = await this.prepare(message.context, voice);
      if (!permitted()) return;
      if (typeof manifest.text === 'string' && manifest.text !== message.text) throw new Error('音频与当前字幕不匹配，请重新加载课件');
      const audio = this.audioFactory(); current.audio = audio;
      if (typeof document !== 'undefined') {
        audio.id = 'narration-audio'; audio.hidden = true;
        document.body.append(audio);
      }
      audio.preload = 'auto'; audio.src = manifest.audioUrl;
      audio.playbackRate = message.rate || 1;
      audio.preservesPitch = true;
      if (this.audioContext) {
        current.source = this.audioContext.createMediaElementSource(audio);
        current.analyser = this.audioContext.createAnalyser();
        current.analyser.fftSize = 256;
        current.source.connect(current.analyser); current.analyser.connect(this.audioContext.destination);
        current.samples = new Uint8Array(current.analyser.fftSize);
      }
      const meter = () => {
        if (!permitted()){this.playback?.stop('lost-permission');return;}
        if(audio.paused||audio.ended)return;
        const word = activeWord(manifest.words, audio.currentTime);
        let amplitude;
        if (current.analyser) {
          current.analyser.getByteTimeDomainData(current.samples);
          amplitude = Math.sqrt(current.samples.reduce((sum, n) => sum + ((n - 128) / 128) ** 2, 0) / current.samples.length);
        }
        message.onlevel?.({ amplitude, audioTime: audio.currentTime, duration: audio.duration, charIndex: word?.charIndex || 0,
          wordLength: manifest.timingGranularity === 'sentence' ? message.text.length : word?.text.length || 0 });
        if (audio.dataset) {
          audio.dataset.rms = String(amplitude ?? 'unavailable');
          audio.dataset.contextState = this.audioContext?.state || 'unavailable';
        }
        current.frame = requestAnimationFrame(meter);
      };
      audio.onplaying = () => {
        if (!permitted()){if(valid())this.playback?.stop('lost-permission');return;}
        cancelAnimationFrame(current.frame); message.onstart?.(); meter();
        if (message.nextContext) this.prepare(message.nextContext, voice).catch(() => {});
      };
      audio.onwaiting = () => { if (valid()) { cancelAnimationFrame(current.frame); message.onbuffering?.(); } };
      audio.onended = () => {
        if (!valid()) return;
        const completion={audioTime:audio.currentTime,duration:audio.duration};
        this.cancel(); message.onend?.(completion);
      };
      audio.onerror = () => fail(new Error('神经语音音频无法读取，请重试'));
      if(!permitted())return;
      await audio.play();
      if(!permitted())audio.pause();
    })().catch(fail);
  }
}
