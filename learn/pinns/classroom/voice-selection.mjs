export function filterVoices(voices,{language='zh',gender='all',ageStyle='all',accent='all'}={}) {
  return voices.filter(v=>v.lang.startsWith(language) && (language!=='en'||accent==='all'||v.accent===accent) && (gender==='all'||v.gender===gender) && (ageStyle==='all'||v.ageStyle===ageStyle));
}
