import { SKILLS, type SkillEntry } from '../data/skills';

export type ScoreResult = {
  score: number;
  keywordCoverage: number;
  matched: string[];
  missing: string[];
  required: string[];
  owned: string[];
  components: {skills:number; experience:number; education:number; certifications:number};
  suggestions: string[];
  evidence: Record<string,string>;
};

export function normalizeText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
}

function matches(text: string, alias: string): boolean {
  const a = normalizeText(alias).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9+#])${a}(?=$|[^a-z0-9+#])`, 'i').test(normalizeText(text));
}

export function extractSkills(text: string, entries: SkillEntry[] = SKILLS): string[] {
  return entries.filter(item => item.aliases.some(alias => matches(text,alias))).map(item=>item.name);
}

function hasSignal(text:string, group: RegExp[]): boolean {return group.some(r=>r.test(text));}
const experienceSignals = [/(?:layihə|project|portfolio)/i,/(?:təcrübə|experience|internship)/i,/(?:api|database|analiz|analysis|development)/i];
const educationSignals = [/(?:təhsil|education|university|universitet|bachelor|bakalavr|degree)/i];
const certificateSignals = [/(?:sertifikat|certificat|certified|diploma|ccna|az-900)/i];

/** Stable explainable heuristic. The score is NOT a universal ATS verdict. */
export function scoreResume(cv: string, job: string): ScoreResult {
  const required = extractSkills(job);
  const owned = extractSkills(cv);
  const matched = required.filter(skill=>owned.includes(skill));
  const missing = required.filter(skill=>!owned.includes(skill));
  const keywordCoverage = required.length ? Math.round(100*matched.length/required.length) : 0;
  const components = {
    skills: keywordCoverage,
    experience: hasSignal(job,experienceSignals) ? (hasSignal(cv,experienceSignals) ? 100:0):100,
    education: hasSignal(job,educationSignals) ? (hasSignal(cv,educationSignals) ? 100:0):100,
    certifications: hasSignal(job,certificateSignals) ? (hasSignal(cv,certificateSignals) ? 100:0):100,
  };
  const score = Math.round(components.skills*.50+components.experience*.25+components.education*.10+components.certifications*.15);
  const suggestions:string[] = [];
  if(missing.length) suggestions.push(`CV-də görünməyən tələblər: ${missing.slice(0,5).join(', ')}. Yalnız real bacarıqlarınızı əlavə edin.`);
  if(!hasSignal(cv,experienceSignals)) suggestions.push('Layihələr və təcrübə bölməsi əlavə edərək real gördüyünüz işləri izah edin.');
  if(!/\d+\s*(?:%|il|ay|layihə|project|users)/i.test(cv)) suggestions.push('Mövcud layihə nəticələrini yalnız təsdiqləyə bildiyiniz rəqəmlərlə göstərin.');
  if(matched.length) suggestions.push(`Uyğun bacarıqlarınızı layihə nümunələri ilə vurğulayın: ${matched.slice(0,4).join(', ')}.`);
  if(!required.length) suggestions.push('Vakansiyada tanınan texniki tələb azdır. Bu bal məhdud göstəricidir.');
  const evidence:Record<string,string>={};
  for(const skill of owned){const entry=SKILLS.find(x=>x.name===skill);const line=cv.split('\n').find(l=>entry?.aliases.some(a=>matches(l,a)));if(line)evidence[skill]=line.trim();}
  return {score,keywordCoverage,matched,missing,required,owned,components,suggestions,evidence};
}
