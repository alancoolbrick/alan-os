// ALAN OS — Brain-aware Claude proxy
// Injects Supabase Brain context (search_brain) + Mem0 identity before every Claude call
// Same pattern as the WhatsApp chatHandler.js in coolbrick-agent

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://etpadjoejybmgezkfhdz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const MEM0_KEY = process.env.MEM0_API_KEY || '';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';

// Generate 512-dim embedding via OpenAI
async function embed(text) {
  if (!OPENAI_KEY) return null;
  try {
    const r = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + OPENAI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text, dimensions: 512 }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.data[0].embedding;
  } catch (e) {
    console.error('[claude-proxy] embedding failed:', e.message);
    return null;
  }
}

// Search Brain via Supabase RPC
async function searchBrain(embedding) {
  if (!SUPABASE_KEY || !embedding) return [];
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/search_brain', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query_embedding: embedding,
        match_threshold: 0.2,
        match_count: 6,
      }),
    });
    if (!r.ok) return [];
    return await r.json();
  } catch (e) {
    console.error('[claude-proxy] search_brain failed:', e.message);
    return [];
  }
}

// Search Mem0 for identity context
async function searchMem0(query) {
  if (!MEM0_KEY) return [];
  try {
    const r = await fetch('https://api.mem0.ai/v1/memories/search/', {
      method: 'POST',
      headers: {
        'Authorization': 'Token ' + MEM0_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, user_id: 'alan-coolbrick', limit: 5 }),
    });
    if (!r.ok) return [];
    const d = await r.json();
    return d.results || d || [];
  } catch (e) {
    console.error('[claude-proxy] mem0 search failed:', e.message);
    return [];
  }
}

// Save interaction to Mem0 (fire-and-forget)
function saveMem0(userMsg, assistantMsg) {
  if (!MEM0_KEY) return;
  fetch('https://api.mem0.ai/v1/memories/', {
    method: 'POST',
    headers: {
      'Authorization': 'Token ' + MEM0_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'User said: ' + userMsg + '\nAssistant responded: ' + (assistantMsg || '').substring(0, 500) }],
      user_id: 'alan-coolbrick',
      metadata: { source: 'alan-os' },
    }),
  }).catch(e => console.error('[claude-proxy] mem0 save failed:', e.message));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, system } = req.body;

  if (!ANTHROPIC_KEY) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.write('data: ' + JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'ANTHROPIC_API_KEY not set in Vercel env vars.' } }) + '\n\n');
    return res.end();
  }

  // Extract the latest user message for context retrieval
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const userText = lastUserMsg ? (typeof lastUserMsg.content === 'string' ? lastUserMsg.content : lastUserMsg.content.map(c => c.text || '').join(' ')) : '';

  // Run Brain search + Mem0 search in parallel
  let brainContext = '';
  let memoryContext = '';

  try {
    const [embedding, mem0Results] = await Promise.all([
      embed(userText),
      searchMem0(userText),
    ]);

    const brainResults = await searchBrain(embedding);

    if (brainResults.length > 0) {
      brainContext = '\n\n[BRAIN CONTEXT — Retrieved from Coolbrick Brain]\n' +
        brainResults.map(m =>
          '[' + m.type + '] ' + m.title + '\n' + (m.summary || m.content || '').substring(0, 300) +
          '\nStatus: ' + m.status + ' | Tags: ' + (m.tags || []).join(', ')
        ).join('\n---\n');
    }

    if (mem0Results.length > 0) {
      memoryContext = '\n\n[PERSISTENT MEMORY — What I know about Alan]\n' +
        mem0Results.map(m => '- ' + m.memory).join('\n');
    }
  } catch (e) {
    console.error('[claude-proxy] context retrieval failed:', e.message);
    // Continue without context — don't break the chat
  }

  // Build enhanced system prompt
  const baseSystem = system || 'You are Claude, embedded in ALAN OS — Alan\'s personal operating system for Coolbrick Property Management. You have access to Alan\'s Brain (a knowledge base of tasks, projects, ideas, and property data) and persistent memory about who Alan is and how he works.';

  const enhancedSystem = baseSystem +
    '\n\nYou are context-aware. Use the retrieved Brain context and persistent memory below to give informed, specific answers. If the context doesn\'t cover the question, say so briefly rather than guessing.' +
    '\n\nKeep replies concise — 2-3 paragraphs max unless asked for more detail. Use plain language, no markdown headers. Alan communicates fast and direct.' +
    brainContext +
    memoryContext +
    (brainContext || memoryContext ? '' : '\n\n[No relevant context retrieved from Brain or memory for this query.]');

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: enhancedSystem,
        messages,
        stream: true,
      }),
    });

    if (!apiRes.ok) {
      const errBody = await apiRes.text();
      const errMsg = 'API error (' + apiRes.status + '): ' + (errBody ? errBody.slice(0, 300) : 'Check ANTHROPIC_API_KEY in Vercel env vars');
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write('data: ' + JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: errMsg } }) + '\n\n');
      return res.end();
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream through and also capture the full response for Mem0
    const reader = apiRes.body.getReader();
    let fullResponse = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
        // Try to extract text deltas for Mem0
        try {
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            const d = JSON.parse(line.slice(6));
            if (d.type === 'content_block_delta' && d.delta?.text) {
              fullResponse += d.delta.text;
            }
          }
        } catch (_) { /* parsing individual chunks is best-effort */ }
      }
    } catch (e) {
      // Client disconnected
    }
    res.end();

    // Save to Mem0 (fire-and-forget, after response completes)
    if (userText && fullResponse) {
      saveMem0(userText, fullResponse);
    }

  } catch (e) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.write('data: ' + JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Connection error: ' + e.message } }) + '\n\n');
    res.end();
  }
}
