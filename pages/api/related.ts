import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const itemId = req.query.item_id as string;
    if (!itemId) {
      return res.status(400).json({ error: 'Missing item_id' });
    }

    const { data: item, error: itemError } = await supabaseAdmin
      .from('items')
      .select('id, embedding, tags, title')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const results: Map<string, { relevance: string; similarity?: number; shared_tags?: string[] } & Record<string, unknown>> = new Map();

    // 1. Semantic similarity (if item has embedding)
    if (item.embedding) {
      const { data: semanticResults } = await supabaseAdmin.rpc('search_brain', {
        query_embedding: item.embedding,
        match_count: 6,
        similarity_threshold: 0.3,
      });

      if (semanticResults) {
        for (const r of semanticResults) {
          if (r.id === itemId) continue;
          results.set(r.id, { ...r, relevance: 'semantic' });
        }
      }
    }

    // 2. Tag overlap (if item has tags)
    if (item.tags && item.tags.length > 0) {
      const { data: tagResults } = await supabaseAdmin
        .from('items')
        .select('id, type, title, content, status, tags, summary, created_at')
        .overlaps('tags', item.tags)
        .neq('id', itemId)
        .eq('archived', false)
        .limit(10);

      if (tagResults) {
        for (const r of tagResults) {
          const shared = r.tags?.filter((t: string) => item.tags.includes(t)) || [];
          if (shared.length < 2) continue;

          if (results.has(r.id)) {
            const existing = results.get(r.id)!;
            existing.relevance = 'both';
            existing.shared_tags = shared;
          } else {
            results.set(r.id, { ...r, relevance: 'tags', shared_tags: shared, similarity: 0 });
          }
        }
      }
    }

    const ordered = Array.from(results.values())
      .sort((a, b) => {
        if (a.relevance === 'both' && b.relevance !== 'both') return -1;
        if (b.relevance === 'both' && a.relevance !== 'both') return 1;
        if (a.relevance === 'semantic' && b.relevance === 'tags') return -1;
        if (b.relevance === 'semantic' && a.relevance === 'tags') return 1;
        return (b.similarity || 0) - (a.similarity || 0);
      })
      .slice(0, 8);

    return res.status(200).json({ results: ordered, source_title: item.title });
  } catch (err) {
    console.error('Related error:', err);
    return res.status(500).json({ error: 'Related lookup failed' });
  }
}
