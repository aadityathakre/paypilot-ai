import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testDialogue() {
  const key = process.env.AI_API_KEY || '';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`;

  const prompts = [
    'are you dumb',
    'nothing',
    'kaise ho bhai',
    'what is github',
    'I need a coding laptop under 70k with long battery life'
  ];

  for (const p of prompts) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are PayPilot AI, an intelligent agentic commerce assistant for tech hardware and developer setups.
User says: "${p}"
Respond naturally, helpfully, and conversationally in 1-3 sentences. If they are talking casually or expressing emotion, respond with empathy and human charm.`
              }
            ]
          }
        ]
      })
    });

    const data = await res.json() as any;
    console.log(`\nUser: "${p}"`);
    console.log(`AI: ${data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()}`);
  }
}

testDialogue();
