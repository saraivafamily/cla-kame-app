export default async function handler(req, res) {
  // Garante que só aceita requisições do tipo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { base64, teamAName, teamBName } = req.body;
    
    // Pega a chave direto das configurações seguras do Vercel
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave de API não configurada no Vercel.' });
    }

    const mimeType = base64.match(/data:(.*?);base64/)[1];
    const base64ImageData = base64.split(',')[1];

    const prompt = `Analise o placar final deste jogo de Dream League Soccer (DLS).
Retorne EXATAMENTE este formato JSON. Não use marcações de código Markdown e não escreva mais nada.
{
  "leftTeamName": "nome lido no escudo da esquerda",
  "leftScore": 0,
  "leftGoals": [{"player": "Nome do Goleador", "assist": "Nome da Assistência ou vazio", "minute": "90"}],
  "rightTeamName": "nome lido no escudo da direita",
  "rightScore": 0,
  "rightGoals": [{"player": "Nome do Goleador", "assist": "", "minute": "90"}]
}`;

    const payload = {
      contents: [{ 
        role: "user", 
        parts: [ 
          { text: prompt }, 
          { inlineData: { mimeType: mimeType, data: base64ImageData } } 
        ] 
      }],
      generationConfig: { responseMimeType: "application/json" }
    };

    // Como roda no servidor, usamos a rota oficial sem bloqueios
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const respText = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({ error: `Google API Error: ${respText}` });
    }

    return res.status(200).json(JSON.parse(respText));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
