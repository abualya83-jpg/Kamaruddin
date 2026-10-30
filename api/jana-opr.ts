// Vercel Function: jana kandungan One Page Report menggunakan Gemini.
// GEMINI_API_KEY disimpan sebagai env var di Vercel dan tidak pernah dihantar ke browser.

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

type Input = {
  tajuk_program?: string
  tarikh?: string
  tempat?: string
  anjuran?: string
  sasaran?: string
  bilangan_peserta?: string
  ringkasan_aktiviti?: string
}

const OUTPUT_FIELDS = ['objektif', 'kekuatan', 'impak', 'cadangan'] as const

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** Only signed-in users of this app may spend the Gemini quota. */
async function isSignedIn(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!token || !url || !key) return false
  const res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, authorization: `Bearer ${token}` } })
  return res.ok
}

function buildPrompt(input: Input) {
  const lines = [
    ['Tajuk program', input.tajuk_program],
    ['Tarikh', input.tarikh],
    ['Tempat', input.tempat],
    ['Anjuran', input.anjuran],
    ['Sasaran', input.sasaran],
    ['Bilangan peserta', input.bilangan_peserta],
    ['Ringkasan aktiviti', input.ringkasan_aktiviti],
  ].filter(([, v]) => v && String(v).trim())

  return `Anda membantu Unit Sumber dan Teknologi Pendidikan (USTP), Pejabat Pendidikan Daerah Kunak, Sabah,
menyediakan One Page Report (OPR) bagi program pendidikan.

Maklumat program:
${lines.map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Tulis dalam Bahasa Melayu baku yang sesuai untuk laporan rasmi Kementerian Pendidikan Malaysia.
Setiap medan ditulis sebagai senarai bernombor (1., 2., 3.) dengan 3 hingga 4 perkara, ringkas dan padat
kerana laporan mesti muat dalam satu muka surat. Jangan reka angka atau fakta yang tidak diberikan.

- objektif: objektif program
- kekuatan: kekuatan aktiviti / perkara yang berjalan dengan baik
- impak: impak program kepada peserta, sekolah atau daerah
- cadangan: cadangan penambahbaikan untuk program akan datang`
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return json({ error: 'GEMINI_API_KEY belum ditetapkan dalam Vercel Environment Variables.' }, 500)
  }
  if (!(await isSignedIn(request))) return json({ error: 'Sila log masuk semula.' }, 401)

  const input = (await request.json().catch(() => ({}))) as Input
  if (!input.tajuk_program?.trim()) return json({ error: 'Isi Tajuk Program dahulu.' }, 400)

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: Object.fromEntries(OUTPUT_FIELDS.map((f) => [f, { type: 'STRING' }])),
            required: [...OUTPUT_FIELDS],
          },
        },
      }),
    },
  )

  if (!res.ok) {
    const detail = await res.text()
    console.error('Gemini error', res.status, detail)
    const message = res.status === 400 || res.status === 403
      ? 'API key Gemini tidak sah atau tidak dibenarkan.'
      : res.status === 429
        ? 'Had penggunaan Gemini telah dicapai. Cuba lagi sebentar.'
        : 'Gemini gagal menjana kandungan.'
    return json({ error: message }, 502)
  }

  const data = await res.json()
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
  try {
    const parsed = JSON.parse(text ?? '')
    return json(Object.fromEntries(OUTPUT_FIELDS.map((f) => [f, String(parsed[f] ?? '').trim()])))
  } catch {
    return json({ error: 'Jawapan Gemini tidak dapat dibaca. Cuba lagi.' }, 502)
  }
}
