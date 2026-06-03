import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { notes } = await req.json();
    if (!Array.isArray(notes) || notes.length === 0) {
      return new Response(JSON.stringify({ error: 'notes array required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const formatted = notes
      .filter((n: any) => n?.notes && n.notes.trim())
      .map((n: any) => `### ${n.name}${n.stage ? ` (${n.stage})` : ''}\n${n.notes}`)
      .join('\n\n');

    if (!formatted) {
      return new Response(JSON.stringify({ summary: 'Keine Notizen vorhanden, um eine Zusammenfassung zu erstellen.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'Du bist Assistent für ein Social-Media-Management-Team. Fasse die Notizen zu allen Models kompakt zusammen. Format: kurzer Gesamt-Überblick (2-3 Sätze), danach Stichpunkte je Model mit dem Wichtigsten (Status, Probleme, To-Dos). Auf Deutsch, professionell, ohne Floskeln.' },
          { role: 'user', content: formatted },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: 'Rate Limit erreicht, bitte später erneut versuchen.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: 'AI-Credits aufgebraucht.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const t = await resp.text();
      console.error('AI gateway error:', resp.status, t);
      return new Response(JSON.stringify({ error: 'AI Gateway Fehler' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await resp.json();
    const summary = data.choices?.[0]?.message?.content ?? '';
    return new Response(JSON.stringify({ summary }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('summarize error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
