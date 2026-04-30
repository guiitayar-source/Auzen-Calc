const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Modelos em ordem de preferência (fallback automático se a cota de um esgotar)
// Confirmados disponíveis nessa chave via ListModels
const MODELS = [
  'gemini-2.0-flash-lite', // mais leve, maior cota gratuita
  'gemini-2.0-flash',      // rápido e multimodal
  'gemini-2.5-flash',      // mais poderoso, usado como último recurso
];

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

interface ReciboData {
  data: string | null;  // formato DD/MM/AAAA
  valor: number | null;
  descricao: string | null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove o prefixo "data:image/...;base64," e retorna só o base64
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Aguarda `ms` milissegundos */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callGemini(model: string, body: object): Promise<Response> {
  const url = `${BASE_URL}/${model}:generateContent?key=${API_KEY}`;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function lerRecibo(file: File): Promise<ReciboData> {
  const base64 = await fileToBase64(file);

  const body = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: file.type || 'image/jpeg',
              data: base64,
            },
          },
          {
            text: `Você é um assistente especialista em leitura de recibos e notas fiscais brasileiras.
Analise esta imagem com cuidado e extraia as seguintes informações:

1. DATA da compra/transação (no formato DD/MM/AAAA)
2. VALOR TOTAL pago (apenas o número final, ex: 125.90)
3. DESCRIÇÃO resumida do estabelecimento ou tipo de compra (máximo 5 palavras)

Retorne APENAS um objeto JSON válido, sem nenhum texto adicional, markdown ou explicações. Exemplo:
{"data": "15/04/2025", "valor": 125.90, "descricao": "Farmácia São João"}

Se não conseguir identificar algum campo com certeza, use null para aquele campo.
O valor deve ser um número decimal com ponto como separador (não vírgula).`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
    },
  };

  let lastError: Error | null = null;

  for (const model of MODELS) {
    try {
      let res = await callGemini(model, body);

      // Retry automático para 429 temporário (até 2x com backoff)
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '7', 10);
        console.warn(`[Gemini] Modelo ${model} com rate limit. Aguardando ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        res = await callGemini(model, body);
      }

      if (!res.ok) {
        const err = await res.json();
        const msg: string = err?.error?.message || 'Erro desconhecido';

        // Cota esgotada → tenta próximo modelo
        if (res.status === 429 || res.status === 403) {
          console.warn(`[Gemini] Cota do modelo ${model} esgotada. Tentando próximo...`);
          lastError = new Error(msg);
          continue;
        }

        throw new Error(msg);
      }

      const result = await res.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error('Resposta vazia da API.');

      // Extrai JSON mesmo que a resposta venha envolto em ```json ... ```
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/({[\s\S]*})/);
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;

      console.log(`[Gemini] Recibo lido com sucesso usando modelo: ${model}`);
      return JSON.parse(jsonString.trim()) as ReciboData;

    } catch (err) {
      if (err instanceof Error && (err.message.includes('quota') || err.message.includes('429'))) {
        lastError = err;
        continue; // tenta próximo modelo
      }
      throw err; // erro inesperado → propaga
    }
  }

  throw lastError ?? new Error('Todos os modelos Gemini estão com cota esgotada. Tente novamente mais tarde.');
}
