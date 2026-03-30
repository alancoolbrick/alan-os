import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are the command parser for a personal knowledge management system.

Given user input, determine the intent and return structured JSON.

Possible intents:
- "search" — user wants to find entries. Extract the search query.
- "create" — user wants to add a new entry. Extract type, title, and any content.
- "navigate" — user wants to switch views. Extract the target.
- "command" — user is using a slash command. Extract the command name and arguments.

Known slash commands:
- /save [text] — create a new entry from text (classify automatically)
- /find [query] — semantic search
- /brief — show today's digest
- /zoom [topic] — run cosmic zoom on a topic

Valid types: task, people, project, idea, admin, area
Valid navigation targets: inbox, focus, next, waiting, scheduled, someday, projects, people, ideas, admin, areas, logbook, trash, roadmap

Return ONLY valid JSON:

For search:
{ "intent": "search", "query": "the search terms", "filter_type": null }

For create:
{ "intent": "create", "type": "task", "title": "short title", "content": "full content from input", "status": "inbox" }

For navigate:
{ "intent": "navigate", "target": "inbox" }

For command:
{ "intent": "command", "command": "save", "args": "the arguments" }

If the input starts with "/" treat it as a command.
If the input is clearly asking to find something, it's a search.
If the input is clearly adding new information, it's a create.
If ambiguous, default to search.`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { input } = req.body;
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'Missing input' });
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: input }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.status(200).json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Command parse error:', message);
    return res.status(500).json({ error: 'Command parsing failed', detail: message });
  }
}
