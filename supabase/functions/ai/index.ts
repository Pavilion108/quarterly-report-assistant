import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('AI not configured — API key missing')

    // NVIDIA NIM API (OpenAI-compatible endpoint)
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are an expert CA (Chartered Accountant) and business analyst at DKC & Associates. Provide concise, professional, factual responses suitable for audit engagements. Return only the requested content with no preamble or meta-commentary.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.4,
        max_tokens: 1024,
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`AI API error (${response.status}): ${errText}`)
    }

    const data = await response.json()
    const result = data.choices?.[0]?.message?.content ?? ''

    return new Response(JSON.stringify({ text: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
