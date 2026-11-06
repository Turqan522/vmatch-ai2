import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {fileURLToPath} from 'node:url';
import {Document,Paragraph,Packer} from 'docx';
import {jsPDF} from 'jspdf';
import {DOMMatrix,Path2D,ImageData} from '@napi-rs/canvas';

vi.mock('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url',()=>({default:fileURLToPath(new URL('../../node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs',import.meta.url))}));
let parseResumeFile;
beforeAll(async()=>{
  Object.assign(globalThis,{DOMMatrix,Path2D,ImageData});
  // Use the package's actual worker module in this Node test runtime.
  globalThis.pdfjsWorker=await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs');
  ({parseResumeFile}=await import('./parser'));
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
const content='Candidate Example\nPython and SQL developer with project experience and university education.';
describe('real CV files',()=>{
  it('extracts text from DOCX',async()=>{
    const bytes=await Packer.toBuffer(new Document({sections:[{children:content.split('\n').map(text=>new Paragraph(text))}]}));
    expect(await parseResumeFile(new File([bytes],'resume.docx'))).toContain('Python and SQL');
  });
  it('extracts text from PDF',async()=>{
    const pdf=new jsPDF();pdf.text(content.split('\n'),15,20);
    expect(await parseResumeFile(new File([pdf.output('arraybuffer')],'resume.pdf'))).toContain('Python and SQL');
  });
  it('reads UTF-8 TXT and rejects unsupported, empty and oversized files',async()=>{
    expect(await parseResumeFile(new File([content],'resume.txt'))).toBe(content);
    await expect(parseResumeFile(new File([content],'resume.exe'))).rejects.toThrow('Yalnız');
    await expect(parseResumeFile(new File([],'resume.pdf'))).rejects.toThrow('boşdur');
    await expect(parseResumeFile(new File([new Uint8Array(5*1024*1024+1)],'resume.pdf'))).rejects.toThrow('5 MB');
  });
  it('rejects broken PDF and image-only PDF',async()=>{
    await expect(parseResumeFile(new File(['not a pdf'],'resume.pdf'))).rejects.toThrow('mətn çıxarmaq');
    const blank=new jsPDF();
    await expect(parseResumeFile(new File([blank.output('arraybuffer')],'scan.pdf'))).rejects.toThrow('Skan');
  });
});

describe('CV exports',()=>{
  it('exports a DOCX that can be imported again',async()=>{
    const {downloadDocx}=await import('./exporters');
    let blob;
    vi.spyOn(URL,'createObjectURL').mockImplementation(value=>{blob=value;return 'blob:test';});
    vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
    const click=vi.fn();const anchor={click,href:'',download:''};
    vi.stubGlobal('document',{createElement:()=>anchor});
    vi.useFakeTimers();
    await downloadDocx(content);
    expect(click).toHaveBeenCalledOnce();expect(anchor.download).toMatch(/\.docx$/);
    expect(await parseResumeFile(new File([blob],'export.docx'))).toContain('Python and SQL');
    vi.runAllTimers();
  });
  it('prints Unicode text safely and reports blocked popups',async()=>{
    const {downloadPdf}=await import('./exporters');
    const write=vi.fn(),print=vi.fn();
    const open=vi.fn(()=>({document:{write,close:vi.fn()},focus:vi.fn(),print}));
    vi.stubGlobal('window',{open});vi.useFakeTimers();
    downloadPdf('Əli Şəfəq <script>alert(1)</script>');
    expect(write.mock.calls[0][0]).toContain('Əli Şəfəq');
    expect(write.mock.calls[0][0]).toContain('&lt;script&gt;');
    vi.runAllTimers();expect(print).toHaveBeenCalledOnce();
    open.mockReturnValue(null);expect(()=>downloadPdf(content)).toThrow('pop-up');
  });
});
