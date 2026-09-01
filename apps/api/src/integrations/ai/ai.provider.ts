import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { StructuredIntent, RankedProduct } from './ai.types.js';

export class AIProvider {
  /**
   * Parse natural-language customer message into structured intent fields
   */
  static async parseIntent(userMessage: string): Promise<StructuredIntent> {
    const trimmed = userMessage.trim();

    // If AI_API_KEY is configured, attempt LLM structured parsing
    if (env.AI_API_KEY && env.AI_API_KEY !== 'dev_ai_api_key_placeholder' && !env.AI_API_KEY.includes('placeholder')) {
      try {
        const intent = await this.callGeminiIntentParser(trimmed);
        if (intent) {
          return intent;
        }
      } catch (error) {
        logger.warn({ error }, 'Gemini API call failed, using deterministic fallback intent parser');
      }
    }

    // Deterministic fallback parser (resilient & predictable)
    return this.fallbackDeterministicParser(trimmed);
  }

  /**
   * Generate natural language explanation strictly grounded in candidate products
   */
  static async generateExplanation(
    userMessage: string,
    intent: StructuredIntent,
    rankedProducts: RankedProduct[]
  ): Promise<string> {
    if (rankedProducts.length === 0) {
      return `I couldn't find any products in our catalog matching "${userMessage}". Try adjusting your budget or searching for categories like laptops, monitors, keyboards, headphones, or accessories.`;
    }

    const topPick = rankedProducts[0].product;
    const topReasons = rankedProducts[0].reasons.join(', ');

    if (env.AI_API_KEY && env.AI_API_KEY !== 'dev_ai_api_key_placeholder' && !env.AI_API_KEY.includes('placeholder')) {
      try {
        const explanation = await this.callGeminiExplanation(userMessage, topPick, topReasons);
        if (explanation) return explanation;
      } catch (error) {
        logger.warn({ error }, 'Gemini explanation failed, using grounded template');
      }
    }

    return `Based on your request, I recommend the **${topPick.name}** for **₹${(topPick.pricePaise / 100).toLocaleString('en-IN')}**. It matches your needs because it is ${topReasons}.`;
  }

  /**
   * Call Google Gemini API for structured JSON intent extraction
   */
  private static async callGeminiIntentParser(message: string): Promise<StructuredIntent | null> {
    const prompt = `You are a strict e-commerce shopping intent parser.
Analyze the user message: "${message}"

Available categories in our catalog:
- "laptops"
- "monitors"
- "keyboards_mice"
- "audio_video"
- "accessories"

Return ONLY a valid JSON object matching this schema with NO markdown wrapping:
{
  "intent": "purchase_search",
  "category": "laptops" or "monitors" or "keyboards_mice" or "audio_video" or "accessories" or null,
  "budgetMax": number in INR (e.g. 70000) or null,
  "budgetMin": number in INR or null,
  "useCases": ["coding", "gaming", "student", "wfh", etc],
  "preferences": ["wireless", "long battery", "mechanical", etc],
  "constraints": ["under 70k", etc],
  "searchTerm": "extracted search keyword" or null
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
    const prompt = `You are PayPilot, a helpful e-commerce AI.
Customer asked: "${message}"
Recommended Product: "${product.name}" (Price: ₹${product.pricePaise / 100})
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

  /**
   * Rule-based deterministic fallback intent parser (zero external dependency)
   */
  private static fallbackDeterministicParser(message: string): StructuredIntent {
    const lower = message.toLowerCase();

    // 1. Detect Category
    let category: string | null = null;
    if (lower.includes('laptop') || lower.includes('notebook') || lower.includes('macbook') || lower.includes('pc')) {
      category = 'laptops';
    } else if (lower.includes('monitor') || lower.includes('display') || lower.includes('screen') || lower.includes('4k')) {
      category = 'monitors';
    } else if (lower.includes('mouse') || lower.includes('keyboard') || lower.includes('keypad')) {
      category = 'keyboards_mice';
    } else if (lower.includes('headphone') || lower.includes('audio') || lower.includes('webcam') || lower.includes('camera') || lower.includes('mic')) {
      category = 'audio_video';
    } else if (lower.includes('charger') || lower.includes('hub') || lower.includes('adapter') || lower.includes('stand') || lower.includes('cable')) {
      category = 'accessories';
    }

    // 2. Detect Budget (e.g. "under 70000", "under 70k", "below ₹80,000", "budget 50k", "< 75k")
    let budgetMax: number | null = null;
    const kMatch = lower.match(/(?:under|below|budget|within|max|<=?|₹|\bin\s*)?\s*(\d{1,3})\s*(?:k|thousand)\b/i);
    const fullNumMatch = lower.match(/(?:under|below|budget|within|max|<=?|₹|\bin\s*)?\s*(\d{4,6})\b/i);

    if (kMatch && kMatch[1]) {
      budgetMax = parseInt(kMatch[1], 10) * 1000;
    } else if (fullNumMatch && fullNumMatch[1]) {
      budgetMax = parseInt(fullNumMatch[1], 10);
    }

    // 3. Detect Use Cases
    const useCases: string[] = [];
    if (lower.includes('coding') || lower.includes('developer') || lower.includes('programming') || lower.includes('software')) useCases.push('coding');
    if (lower.includes('gaming') || lower.includes('fps') || lower.includes('esports')) useCases.push('gaming');
    if (lower.includes('student') || lower.includes('college') || lower.includes('study') || lower.includes('school')) useCases.push('student');
    if (lower.includes('wfh') || lower.includes('office') || lower.includes('work from home')) useCases.push('wfh');
    if (lower.includes('editing') || lower.includes('creator') || lower.includes('video') || lower.includes('design')) useCases.push('creative');

    // 4. Detect Preferences
    const preferences: string[] = [];
    if (lower.includes('battery') || lower.includes('long battery')) preferences.push('long battery');
    if (lower.includes('wireless') || lower.includes('bluetooth')) preferences.push('wireless');
    if (lower.includes('lightweight') || lower.includes('portable')) preferences.push('lightweight');
    if (lower.includes('mechanical') || lower.includes('tactile')) preferences.push('mechanical');
    if (lower.includes('noise') || lower.includes('anc')) preferences.push('active noise cancellation');

    return {
      intent: 'purchase_search',
      category,
      budgetMax,
      budgetMin: null,
      useCases,
      preferences,
      constraints: budgetMax ? [`under ₹${budgetMax.toLocaleString('en-IN')}`] : [],
      searchTerm: category || null,
    };
  }
}
