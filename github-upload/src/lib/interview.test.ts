import {describe,it,expect} from 'vitest';
import {buildInterviewQuestions} from './interview';
describe('HR questions',()=>{
  it('waits for a usable CV',()=>expect(buildInterviewQuestions('')).toEqual([]));
  it('grounds skill questions in the CV and differentiates missing requirements',()=>{
    const qs=buildInterviewQuestions('A candidate with Python experience and a university project.','Python and Docker developer position');
    expect(qs.find(q=>q.id==='skill-Python')?.question).toContain('Python');
    expect(qs.find(q=>q.id==='gap-Docker')?.question).toContain('təcrübəniz varmı');
    expect(qs.some(q=>q.id==='skill-Docker')).toBe(false);
    expect(qs.some(q=>q.id==='experience')).toBe(true);
    expect(new Set(qs.map(q=>q.id)).size).toBe(qs.length);
  });
  it('does not invent education or projects in a sparse CV',()=>{
    const qs=buildInterviewQuestions('I am looking for a new career opportunity and enjoy learning.');
    expect(qs.map(q=>q.id)).toEqual(['intro','team','motivation']);
  });
});
