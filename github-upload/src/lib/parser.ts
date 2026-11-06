import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

export const MAX_FILE_SIZE = 5*1024*1024;

export async function parseResumeFile(file:File):Promise<string>{
  const ext=file.name.split('.').pop()?.toLowerCase();
  if(!['pdf','docx','txt'].includes(ext||''))throw new Error('Yalnız PDF, DOCX və TXT faylları qəbul edilir.');
  if(file.size>MAX_FILE_SIZE)throw new Error('Faylın ölçüsü 5 MB-dan çox ola bilməz.');
  if(file.size===0)throw new Error('Fayl boşdur.');
  let text='';
  try{
    if(ext==='txt'){
      text=await file.text();
      if(text.includes('\uFFFD'))throw new Error('TXT faylının kodlaşdırması dəstəklənmir. UTF-8 istifadə edin.');
    }else if(ext==='docx'){
      const mammoth=await import('mammoth/mammoth.browser');
      const result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
      text=result.value;
    }else{
      const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;
      const task=pdfjs.getDocument({data:await file.arrayBuffer()});
      try{
        const document=await task.promise;
        const pages=[];
        for(let i=1;i<=Math.min(document.numPages,12);i++){
          const page=await document.getPage(i);
          const content=await page.getTextContent();
          pages.push(content.items.map(item=>'str'in item?item.str:'').join(' '));
        }
        text=pages.join('\n');
      }finally{await task.destroy();}
    }
  }catch(error){
    if(error instanceof Error && /fetch|dynamically imported|loading chunk|worker/i.test(error.message))throw new Error('PDF oxuyucusu yüklənmədi. Səhifəni Ctrl + F5 ilə yeniləyib faylı yenidən seçin.');
    if(error instanceof Error && error.name==='PasswordException')throw new Error('PDF şifrə ilə qorunur. Şifrəsiz nüsxəsini yükləyin.');
    if(error instanceof Error && (/kodlaşdırması/.test(error.message)))throw error;
    throw new Error('Fayldan mətn çıxarmaq mümkün olmadı. Sənədin zədələnmədiyini yoxlayın.');
  }
  if(text.trim().length<25)throw new Error('Faylda oxunaqlı mətn tapılmadı. Skan edilmiş PDF dəstəklənmir.');
  return text.trim();
}
