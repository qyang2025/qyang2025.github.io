export function localizeLesson(lesson, language = 'zh') {
  if (!['zh', 'en'].includes(language)) throw new Error('不支持的语言');
  if (language === 'zh') return { ...lesson, language: 'zh' };
  if (!lesson.titleEn || lesson.slides.some(s => !s.titleEn || !s.bulletsEn || s.beats.some(b => !b.textEn || typeof b.scene?.captionEn !== 'string'))) {
    throw new Error('这份旧课件缺少英文版本，请重新用 Codex 生成双语课件');
  }
  return { ...lesson, language: 'en', title: lesson.titleEn, summary: lesson.summaryEn,
    slides: lesson.slides.map(slide => ({ ...slide, title: slide.titleEn, eyebrow: slide.eyebrowEn,
      bullets: slide.bulletsEn, formula: slide.formulaEn ?? slide.formula,
      beats: slide.beats.map(beat => ({ ...beat, text: beat.textEn,
        scene: { ...beat.scene, caption: beat.scene.captionEn, formula: beat.scene.formulaEn ?? beat.scene.formula } })) })) };
}
