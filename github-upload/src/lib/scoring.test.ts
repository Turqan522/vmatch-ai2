import { describe,it,expect } from 'vitest';
import { extractSkills,normalizeText,scoreResume } from './scoring';

describe('normalization and skills',()=>{
  it('normalizes spaces and case',()=>expect(normalizeText('  PYTHON   SQL ')).toBe('python sql'));
  it('handles JS synonym',()=>expect(extractSkills('Experienced with JS and React')).toContain('JavaScript'));
  it('does not treat JavaScript as Java',()=>expect(extractSkills('JavaScript')).not.toContain('Java'));
  it('does not match C++ to C#',()=>expect(extractSkills('C++')).not.toContain('C#'));
  it('keeps SQL distinct from NoSQL',()=>expect(extractSkills('NoSQL')).not.toContain('SQL'));
});
describe('scoreResume',()=>{
  it('scores perfect requirements',()=>{const r=scoreResume('Python SQL projects university certified','Python SQL projects university certified');expect(r.score).toBe(100);expect(r.missing).toEqual([])});
  it('shows real missing skills',()=>{const r=scoreResume('Python projects university','Python SQL Docker projects university');expect(r.missing).toEqual(['SQL','Docker']);expect(r.keywordCoverage).toBe(33)});
  it('remains within 0..100',()=>{const r=scoreResume('Unrelated resume','Python Docker SQL');expect(r.score).toBeGreaterThanOrEqual(0);expect(r.score).toBeLessThanOrEqual(100)});
});
