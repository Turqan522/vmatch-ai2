# CVMatch AI — Ctrl+Connect

TechConnect Week '26 — ASOIU Hackathon üçün ATS-Based CV Builder MVP.

## Hazır funksiyalar

- React + Vite + TypeScript + Tailwind CSS ilə tam responsive dashboard
- Z-index/overlay problemi olmayan yeni upload kartı, drag-drop, fayl statusu və error toast
- PDF / DOCX / TXT client-side parsing (pdf.js və mammoth)
- 4 kilidlənən addım: CV, vakansiya, analiz, optimallaşdırma
- Backend, Frontend, Data Analyst, Full-Stack, ML Engineer vakansiya şablonları
- 50% bacarıq, 25% təcrübə, 10% təhsil, 15% sertifikat çəkili izahlı bal
- Uyğun və çatışmayan bacarıqlar, kliklənən dürüst inkişaf tövsiyələri
- Redaktə edilən xülasə, Before/After müqayisəsi, yalnız təsdiqlənən açar sözlər
- DOCX export və brauzerdə "Save as PDF" çap funksiyası
- 4 slayddan ibarət təqdimat: `/pitch.html`; təqdimatın PDF-ə çapı
- İstəyə bağlı FastAPI backend: `/api/parse-cv`, `/api/analyze`, `/api/optimize`, `/api/export`, `/api/health`

## Vercel (statik demo)

Vercel Git repository ilə: Framework Preset `Vite`, Build Command `npm run build`, Output Directory `dist`.

Alternativ: build olunmuş `dist` qovluğunu statik sayt kimi yerləşdirin.

Statik demo CV-ni serverə göndərmir və API açarı tələb etmir. Backend endpoint-ləri Vercel-ə avtomatik qoşulmur; ayrıca server deployment və frontend inteqrasiyası lazımdır. Bu versiyanın scoring sistemi qaydalara əsaslanır, real AI modeli işlətmir.

## Lokal işə salınması

### İstifadəçi hesabları

- `/register`: istifadəçi qeydiyyatı; `/login`: istifadəçi girişi.
- `/profile`: şəxsi profilin redaktəsi.
- `npm run dev` həm Vite, həm də lokal hesab API-sini (3001 portu) başladır.
- Hesablar və sessiyalar `server/data/accounts.json` faylında saxlanılır. Bu qovluq Git-ə daxil edilmir; silinsə hesablar itəcək. API-ni yalnız bir prosesdə işlədin.
- Şifrələr salt ilə scrypt hash şəklində, sessiyalar HttpOnly cookie ilə saxlanılır. Sessiya müddəti 24 saatdır. E-poçt təsdiqi və şifrə bərpası bu versiyaya daxil deyil.
- CV qaralamaları hər hesab üçün bu brauzerdə ayrıca saxlanılır; cihazlar arasında sinxronlaşmır.

`npm run test:auth` qeydiyyat, profil sahibliyi, sessiyanın davamlılığı və çıxış yoxlamalarını işlədir. Hesab sistemi statik `dist` yerləşdirilməsi ilə təkbaşına işləmir: yerləşdirmədə Node API, davamlı disk, HTTPS və eyni domen üzərindən `/api/auth`, `/api/profile` proksisi lazımdır; HTTPS-də API üçün `NODE_ENV=production` təyin edin.

Windows-da lokal Node.js ilə başlatmaq üçün:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1
```

VS Code-da `Start CVMatch AI` tapşırığı da eyni skripti işlədir. Terminalda göstərilən lokal ünvanı brauzerdə açın.

```bash
npm install
npm run dev
npm run test
npm run build
```

## Testlər

CV daxil edilən kimi səhifənin aşağısında **HR sizdən nə soruşa bilər?** bölməsi açılır. Suallar CV-dəki bacarıq, təcrübə və təhsil siqnalları əsasında şablonlarla hazırlanır; vakansiya daxil ediləndə onun tələbləri də nəzərə alınır. Bu, canlı HR və ya LLM söhbəti deyil. İstifadəçi suallara cavab yaza, keçə və sual-cavabları TXT kimi endirə bilər. Cavablar yalnız açıq səhifədə saxlanır; CV/vakansiya dəyişəndə məşq yenilənir.

`npm test` həmçinin HR suallarını, real nümunə PDF/DOCX/TXT oxunmasını, DOCX ixracının yenidən oxunmasını və PDF çap funksiyasını yoxlayır. PDF çap dialoqu testdə simulyasiya olunur; brauzerdə ayrıca yoxlanmalıdır. Skan edilmiş PDF üçün OCR mövcud deyil. PDF ixracında brauzerin çap pəncərəsindən **PDF kimi saxla** seçilir.

`npm run test` scoring və keyword normallaşdırma üçün Vitest testlərini işlədir.

## Demo script (təxminən 3 dəqiqə)

1. **Problem (30 s):** CV ilə vakansiya arasında tələb uyğunsuzluğu iş axtaran üçün görünmür.
2. **Həll (30 s):** CVMatch AI izahlı bal və konkret bacarıq boşluqları verir.
3. **Canlı demo (90 s):** "Nümunə CV yüklə" > "Növbəti" > Data Analyst seç > analiz et > çatışmayan bacarığı aç > CV-ni güncəllə.
4. **Fərq və məhdudiyyət (30 s):** Heç nə uydurmur, balın izahı var. Hazır MVP qaydalara əsaslanır; LLM əlavə backend ilə aktivləşdirilə bilər.

## Screenshot placeholder-ləri

- `docs/screenshot-upload.png`: CV upload və 4 addımlı axın
- `docs/screenshot-results.png`: Match Score və Skill Gap paneli
- `docs/screenshot-optimizer.png`: Before/After və DOCX export

## FastAPI lokal işə salınması

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn main:app --reload
```

AI xülasəsinin aktivləşməsi üçün serverdə `OPENAI_API_KEY` təyin edin. `OPENAI_MODEL` opsionaldır. API açarını brauzer koduna yerləşdirməyin. Model cavablarını istifadəçi təsdiqləməlidir.

## Etik və texniki qeydlər

Match Score universal ATS balı və ya işə qəbul ehtimalı deyil. Tanınmış tələblərin örtülmə faizidir. Yeni sertifikat, təcrübə və bacarıqlar uydurulmur. Demo üçün real şəxsi CV məlumatlarından istifadə etməyin.
