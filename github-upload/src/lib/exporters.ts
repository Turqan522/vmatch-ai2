
export function buildOptimizedResume(cv:string,summary:string,skills:string[]):string{
  const lines=cv.split('\n').map(l=>l.trim()).filter(Boolean);
  const cleanedSummary=summary.trim();
  return [lines[0]||'CV', '', 'PEŞƏKAR XÜLASƏ',cleanedSummary,'','BACARIQLAR',skills.join(', ')||'CV-də qeyd edilməyib','',...lines.slice(1)].join('\n');
}

function save(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}

export async function downloadDocx(content:string){
  const {Document,HeadingLevel,Packer,Paragraph}=await import('docx');
  const children=content.split('\n').map((line,index)=>new Paragraph({text:line,heading:index===0?HeadingLevel.TITLE:undefined,spacing:{after:line?80:160}}));
  const doc=new Document({sections:[{children}]});
  save(await Packer.toBlob(doc),'CVMatch_ATS_CV.docx');
}

export function downloadPdf(content:string){
  // Core jsPDF fonts cannot reliably render Azerbaijani characters. Use the browser's
  // Unicode-aware print pipeline so the candidate's name and skills are preserved.
  const win=window.open('','_blank');
  if(!win)throw new Error('PDF üçün pop-up pəncərəsinə icazə verin.');
  const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
  win.document.write(`<html lang="az"><head><meta charset="utf-8"><title>CVMatch ATS CV</title><style>body{font:11pt Arial,sans-serif;color:#111;line-height:1.5;padding:10mm 14mm;white-space:pre-wrap;overflow-wrap:anywhere}@page{size:A4;margin:12mm}</style></head><body>${escapeHtml(content)}</body></html>`);
  win.document.close();win.focus();setTimeout(()=>win.print(),350);
}
