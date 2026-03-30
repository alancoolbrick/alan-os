import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase-server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, filter_type } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Missing query' });
    }

    const embResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
      dimensions: 512,
      encoding_format: 'float',
    });
    const embedding = embResponse.data[0].embedding;

    const { data, error } = await supabaseAdmin.rpc('search_brain', {
      query_embedding: embedding,
      match_count: 10,
      filter_type: filter_type || null,
      similarity_threshold: 0.3,
    });
    if (error) {
      console.error('search_brain RPC error:', error);
      return res.status(500).json({ error: 'Search failed', detail: error.message });
    }

    return res.status(200).json({ results: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Search error:', message);
    return res.status(500).json({ error: 'Search failed', detail: message });
  }
}
