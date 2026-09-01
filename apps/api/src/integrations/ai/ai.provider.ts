import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { StructuredIntent, RankedProduct } from './ai.types.js';
import { NLPEngine, NLPIntentResult } from './nlp.engine.js';

export class AIProvider {
  /**
   * Parse natural-language customer message into structured intent fields using NLP
   */
  static async parseIntent(userMessage: string): Promise<StructuredIntent> {
    const trimmed = userMessage.trim();

    // 1. Run Advanced NLP Engine
    const nlpResult: NLPIntentResult = NLPEngine.analyze(trimmed);

    // 2. If Gemini API key is configured and valid, attempt LLM parsing
    if (
      env.AI_API_KEY &&
      env.AI_API_KEY.startsWith('AIza') &&
      !env.AI_API_KEY.includes('placeholder')
    ) {
      try {
        const geminiIntent = await this.callGeminiIntentParser(trimmed);
        if (geminiIntent) {
          return geminiIntent;
        }
      } catch (error) {
        logger.warn({ error }, 'Gemini API call failed, falling back to NLP Engine');
      }
    }

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
    rankedProducts: RankedProduct[]
  ): Promise<string> {
    // 1. If Conversational (Greeting, Tech Advice, Policy QA, General QA, Chit Chat)
    if (intent.intent !== 'purchase_search') {
      const nlp = NLPEngine.analyze(userMessage);
      if (nlp.conversationalResponse) {
        return nlp.conversationalResponse;
      }
    }

    // 2. If Purchase Search with 0 matches
    if (rankedProducts.length === 0) {
      return `I searched our verified catalog for "${userMessage}", but couldn't find an exact match under your specified criteria.\n\n💡 **Tip**: Try browsing our available categories: **Laptops**, **Monitors**, **Keyboards & Mice**, **Audio & Video**, or **Accessories**, or increase your budget range!`;
    }

    // 3. Grounded Top Recommendation
    const topPick = rankedProducts[0].product;
    const topReasons = rankedProducts[0].reasons.join(', ');

    if (
      env.AI_API_KEY &&
      env.AI_API_KEY.startsWith('AIza') &&
      !env.AI_API_KEY.includes('placeholder')
    ) {
      try {
        const explanation = await this.callGeminiExplanation(userMessage, topPick, topReasons);
        if (explanation) return explanation;
      } catch (error) {
        logger.warn({ error }, 'Gemini explanation failed, using grounded template');
      }
    }

    return `Based on your requirements, I recommend the **${topPick.name}** for **₹${(topPick.pricePaise / 100).toLocaleString('en-IN')}**.\n\nIt matches your needs because it is **${topReasons}**. You can add it directly to your cart below or explore the complementary bundle option!`;
  }

  /**
   * Call Google Gemini API for structured JSON intent extraction
   */
  private static async callGeminiIntentParser(message: string): Promise<StructuredIntent | null> {
    const prompt = `You are a natural language e-commerce shopping intent parser.
Analyze this user message: "${message}"

Determine if the user is:
1. "greeting": Saying hello, hi, how are you, asking what you can do in any language (English, Hindi, Hinglish e.g. 'kaise ho', 'kya haal hai')
2. "general_qa": Asking general technical questions (e.g. "what is github", "explain python")
3. "policy_qa": Asking about spending limits, guardrails, policy ceilings, or razorpay verification
4. "purchase_search": Explicitly looking for products, buying, requesting recommendations, specifying budget or categories

Available categories in our catalog:
- "laptops"
- "monitors"
- "keyboards_mice"
- "audio_video"
- "accessories"

Return ONLY a valid JSON object matching this schema with NO markdown wrapping:
{
  "intent": "greeting" | "general_qa" | "policy_qa" | "purchase_search",
  "category": "laptops" | "monitors" | "keyboards_mice" | "audio_video" | "accessories" | null,
  "budgetMax": number in INR (e.g. 70000) or null,
  "budgetMin": number in INR or null,
  "useCases": ["coding", "gaming", "student", "wfh", etc],
  "preferences": ["wireless", "long battery", "mechanical", etc],
  "constraints": ["under 70k", etc],
  "searchTerm": "search keyword" or null
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.AI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${env.AI_API_KEY}`;

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

    if (!response.ok) {
      const errText = await response.text();
      logger.warn({ status: response.status, errText }, 'Gemini API returned error');
      return null;
    }

    const data = (await response.json()) as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    try {
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
    } catch {
      return null;
    }
  }

  /**
   * Call Gemini to synthesize a concise, grounded explanation
   */
  private static async callGeminiExplanation(
    message: string,
    product: any,
    reasons: string
  ): Promise<string | null> {
    const prompt = `You are PayPilot, a helpful e-commerce AI assistant.
Customer asked: "${message}"
Recommended Product: "${product.name}" (Price: ₹${(product.pricePaise / 100).toLocaleString('en-IN')})
Verified Match Reasons: ${reasons}
Attributes: ${JSON.stringify(product.attributes)}

Write a concise 2-sentence explanation of why this product fits their intent. Do NOT invent prices or specs not listed above.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.AI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${env.AI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 },
      }),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as any;
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  }
}
