import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import Anthropic from "npm:@anthropic-ai/sdk"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, quarter, revenue, expenses, goals, kpis } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('AI not configured')

    const anthropic = new Anthropic({ apiKey })

    const prompt = `You are a professional business analyst writing an executive summary for a quarterly report.
Project: ${name} (${quarter})
Financials: Revenue $${revenue}, Expenses $${expenses}
Goals: ${JSON.stringify(goals)}
KPIs: ${JSON.stringify(kpis)}

Write a professional, 3-paragraph executive summary. 
Paragraph 1: Highlights and overall financial performance.
Paragraph 2: Challenges or missed targets (if any) based on KPIs and goals.
Paragraph 3: Outlook for the next quarter.
Keep it strictly to 3 paragraphs. Do not include any greeting or signature.`

    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1024,
      system: "You are a professional business analyst.",
      messages: [{ role: "user", content: prompt }]
    })

    const result = msg.content[0]?.text ?? ""

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
