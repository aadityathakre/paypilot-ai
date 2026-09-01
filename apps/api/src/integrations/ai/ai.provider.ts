import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { StructuredIntent, RankedProduct } from './ai.types.js';
import { NLPEngine, NLPIntentResult } from './nlp.engine.js';

export class AIProvider {
  /**
   * Parse natural-language customer message into structured intent fields
   */
  static async parseIntent(
    userMessage: string,
    history: Array<{ role: string; content: string }> = []
  ): Promise<StructuredIntent> {
    const trimmed = userMessage.trim();

    // 1. If Gemini API key is configured, attempt intelligent LLM intent classification
    if (env.AI_API_KEY && !env.AI_API_KEY.includes('placeholder')) {
      try {
        const geminiIntent = await this.callGeminiIntentParser(trimmed, history);
        if (geminiIntent) {
          return geminiIntent;
        }
      } catch (error) {
        logger.warn({ error }, 'Gemini intent parser failed, falling back to NLP Engine');
      }
    }

    // 2. Rule-based / NLP engine analysis
    const nlpResult: NLPIntentResult = NLPEngine.analyze(trimmed);

    return {
      intent: nlpResult.intent as any,
      category: nlpResult.category,
      budgetMax: nlpResult.budgetMax,
      budgetMin: nlpResult.budgetMin,
      useCases: nlpResult.useCases,
      preferences: nlpResult.preferences,
      constraints: nlpResult.constraints,
      searchTerm: nlpResult.searchTerm,
    };
  }

  /**
   * Generate conversational or grounded natural language response
   */
  static async generateExplanation(
    userMessage: string,
    intent: StructuredIntent,
    rankedProducts: RankedProduct[],
    history: Array<{ role: string; content: string }> = []
  ): Promise<string> {
    // 1. Try Generative LLM for natural, dynamic, human conversation
    if (env.AI_API_KEY && !env.AI_API_KEY.includes('placeholder')) {
      try {
        const llmResponse = await this.callGeminiDialogue(userMessage, intent, rankedProducts, history);
        if (llmResponse) {
          return llmResponse;
        }
      } catch (error) {
        logger.warn({ error }, 'Gemini dialogue generation failed, using NLP engine response');
      }
    }

    // 2. If Conversational (Greeting, Tech Advice, Policy QA, General QA, Chit Chat, Frustration, Dismissal)
    if (intent.intent !== 'purchase_search') {
      const nlp = NLPEngine.analyze(userMessage);
      if (nlp.conversationalResponse) {
        return nlp.conversationalResponse;
      }
    }

    // 3. If Purchase Search with 0 matches
    if (rankedProducts.length === 0) {
      return `I searched our verified catalog for "${userMessage}", but couldn't find an exact match under your specified criteria.\n\n💡 **Tip**: Try searching for **Laptops**, **Monitors**, **Keyboards & Mice**, **Audio & Video**, or **Accessories**, or increase your budget range!`;
    }

    // 4. Grounded Top Recommendation fallback
    const topPick = rankedProducts[0].product;
    const topReasons = rankedProducts[0].reasons.join(', ');
    return `Based on your requirements, I recommend the **${topPick.name}** for **₹${(topPick.pricePaise / 100).toLocaleString('en-IN')}**.\n\nIt matches your needs because it is **${topReasons}**. You can add it directly to your cart below or explore the complementary bundle option!`;
  }

  /**
   * Call Google Gemini API for structured JSON intent extraction
   */
  private static async callGeminiIntentParser(
    message: string,
    _history: Array<{ role: string; content: string }>
  ): Promise<StructuredIntent | null> {
    const prompt = `You are a natural language understanding engine for PayPilot AI.
Analyze this user message: "${message}"

Determine if the user is:
- "chit_chat": Casual chat, greetings (in English or Hinglish e.g. "hi", "kaise ho", "kya haal hai", "are you dumb", "nothing", "cool", "thanks", "bye")
- "general_qa": Asking general knowledge, programming or software questions (e.g. "what is github", "explain python", "what is machine learning")
- "tech_advice": Asking technical hardware advice (e.g. "is 16GB RAM enough", "OLED vs IPS")
- "policy_qa": Asking about payment limits, policy guardrails, ₹80k spending ceiling, or Razorpay verification
- "purchase_search": Explicitly seeking to discover, compare, recommend, or buy tech hardware (laptops, monitors, keyboards, mice, headphones, webcams, accessories)

Available catalog categories:
- "laptops"
- "monitors"
- "keyboards_mice"
- "audio_video"
- "accessories"

Return ONLY a valid JSON object with NO markdown formatting:
{
  "intent": "chit_chat" | "general_qa" | "tech_advice" | "policy_qa" | "purchase_search",
  "category": "laptops" | "monitors" | "keyboards_mice" | "audio_video" | "accessories" | null,
  "budgetMax": number in INR (e.g. 70000) or null,
  "budgetMin": number in INR or null,
  "useCases": ["coding", "gaming", "student", "wfh", etc],
  "preferences": ["wireless", "long battery", "mechanical", etc],
  "constraints": ["under 70k", etc],
  "searchTerm": "search keyword" or null
}`;

    const models = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-pro'];

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.AI_API_KEY}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            return {
              intent: parsed.intent || 'purchase_search',
              category: parsed.category || null,
              budgetMax: parsed.budgetMax ? Number(parsed.budgetMax) : null,
              budgetMin: parsed.budgetMin ? Number(parsed.budgetMin) : null,
              useCases: Array.isArray(parsed.useCases) ? parsed.useCases : [],
              preferences: Array.isArray(parsed.preferences) ? parsed.preferences : [],
              constraints: Array.isArray(parsed.constraints) ? parsed.constraints : [],
              searchTerm: parsed.searchTerm || null,
            };
          }
        }
      } catch {
        // try next model
      }
    }

    return null;
  }

  /**
   * Multi-turn Dialogue Generation with Gemini
   */
  private static async callGeminiDialogue(
    message: string,
    intent: StructuredIntent,
    rankedProducts: RankedProduct[],
    history: Array<{ role: string; content: string }>
  ): Promise<string | null> {
    const recentHistory = history.slice(-6).map((m) => `${m.role === 'USER' ? 'User' : 'PayPilot'}: ${m.content}`).join('\n');

    let contextPrompt = '';
    if (intent.intent === 'purchase_search' && rankedProducts.length > 0) {
      const topProduct = rankedProducts[0].product;
      contextPrompt = `The customer is looking to buy/discover hardware.
Verified Top Catalog Match from PostgreSQL:
- Name: "${topProduct.name}"
- Price: ₹${(topProduct.pricePaise / 100).toLocaleString('en-IN')}
- Specs: ${JSON.stringify(topProduct.attributes)}
- Match Reasons: ${rankedProducts[0].reasons.join(', ')}

Explain in 2-3 natural sentences why this product is recommended. Do NOT invent prices or specs.`;
    } else {
      contextPrompt = `The customer is chatting or asking a question (Intent: ${intent.intent}).
Respond in a natural, polite, helpful, and human way. If they talk in Hinglish/Hindi, reply warmly in conversational Hinglish/English. If they ask a general/software question, answer helpfully and mention you can help with tech hardware gear if they need any.`;
    }

    const systemPrompt = `You are PayPilot AI, an intelligent, charming, and helpful agentic commerce assistant built for Razorpay Track 1.
You speak like a real human: friendly, concise, and smart.

Recent Conversation History:
${recentHistory}

Customer Current Input: "${message}"

Task:
${contextPrompt}`;

    const models = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.AI_API_KEY}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 300,
            },
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) return text;
        }
      } catch {
        // try next model
      }
    }

    return null;
  }
}
