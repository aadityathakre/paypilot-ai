import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { StructuredIntent, RankedProduct } from './ai.types.js';

export class AIProvider {
  /**
   * Parse natural-language customer message into structured intent fields
   */
  static async parseIntent(userMessage: string): Promise<StructuredIntent> {
    const trimmed = userMessage.trim();

    // 1. Fast Conversational Check (Greetings, General Q&A, Policy Q&A)
    const lower = trimmed.toLowerCase();
    const isGreeting = /^(hi|hello|hey|greetings|good morning|good evening|howdy|sup|yo)\b/i.test(lower) && lower.split(/\s+/).length <= 4;
    const isPolicyQA = /(policy|limit|ceiling|spending limit|80000|80k|guardrail|maximum order|rules)/i.test(lower);
    const isGeneralQA = /^(what is|who are you|how does|why should|explain|tell me about paypilot|what can you do)/i.test(lower);

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
    return this.fallbackDeterministicParser(trimmed, isGreeting, isPolicyQA, isGeneralQA);
  }

  /**
   * Generate conversational or grounded natural language response
   */
  static async generateExplanation(
    userMessage: string,
    intent: StructuredIntent,
    rankedProducts: RankedProduct[]
  ): Promise<string> {
    // 1. Conversational Greeting
    if (intent.intent === 'greeting') {
      return `Hello! 👋 I'm **PayPilot AI**, your trusted agentic commerce assistant.\n\nI can help you find verified tech products from our catalog (such as **coding laptops, 4K monitors, mechanical keyboards, studio headphones, and accessories**), score options based on your exact budget and use case, and guide you through bounded Razorpay checkout.\n\nWhat are you looking to setup today?`;
    }

    // 2. Policy & Guardrails Q&A
    if (intent.intent === 'policy_qa') {
      return `🛡️ **PayPilot Policy Guardrails & Bounded Checkout**:\n\n• **Spending Ceiling**: Orders are hard-capped at **₹80,000** by merchant governance to prevent unauthorized runaway expenses.\n• **Mandatory Human Authorization**: I cannot move funds or complete payments autonomously. You must explicitly review and authorize checkout.\n• **Cryptographic Verification**: Razorpay payments are validated using HMAC SHA256 signatures before orders are marked paid.\n• **Auditable Lifecycle**: Every intent, search, recommendation, and payment event is recorded in the PostgreSQL audit log.`;
    }

    // 3. General Q&A / Platform Explanation
    if (intent.intent === 'general_qa') {
      if (env.AI_API_KEY && env.AI_API_KEY !== 'dev_ai_api_key_placeholder' && !env.AI_API_KEY.includes('placeholder')) {
        try {
          const answer = await this.callGeminiConversationalQA(userMessage);
          if (answer) return answer;
        } catch (error) {
          logger.warn({ error }, 'Gemini conversational QA failed, using template');
        }
      }
      return `I am **PayPilot AI**, built for Razorpay Track 1 (Agentic Commerce). I combine natural language understanding with verified PostgreSQL catalog tools, multi-signal ranking, merchant policy enforcement, and Razorpay checkout. You can ask me for product recommendations like *"I need a coding laptop under ₹70,000"* or *"Recommend a 4K monitor and mechanical keyboard"*!`;
    }

    // 4. Product Recommendations Grounded Response
    if (rankedProducts.length === 0) {
      return `I searched our verified catalog for "${userMessage}", but couldn't find an exact match under your specified criteria.\n\n💡 **Tip**: Try browsing our available categories: **Laptops**, **Monitors**, **Keyboards & Mice**, **Audio & Video**, or **Accessories**, or increase your budget range!`;
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

    return `Based on your requirements, I recommend the **${topPick.name}** for **₹${(topPick.pricePaise / 100).toLocaleString('en-IN')}**.\n\nIt matches your needs because it is **${topReasons}**. You can add it directly to your cart below or explore the complementary bundle option!`;
  }

  /**
   * Call Google Gemini API for structured JSON intent extraction
   */
  private static async callGeminiIntentParser(message: string): Promise<StructuredIntent | null> {
    const prompt = `You are a natural language e-commerce shopping intent parser.
Analyze this user message: "${message}"

Determine if the user is:
1. "greeting": Saying hello, hi, how are you, asking what you can do
2. "general_qa": Asking general technical or platform questions (e.g. "what is paypilot", "what is the difference between mechanical and membrane")
3. "policy_qa": Asking about spending limits, guardrails, policy ceilings, or razorpay verification
4. "purchase_search": Looking for products, buying, requesting recommendations, specifying budget or categories

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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.AI_MODEL || 'gemini-2.0-flash'}:generateContent?key=${env.AI_API_KEY}`;

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
   * Call Gemini for natural Conversational Q&A
   */
  private static async callGeminiConversationalQA(message: string): Promise<string | null> {
    const prompt = `You are PayPilot AI, an intelligent agentic commerce assistant built for Razorpay Track 1.
User asked: "${message}"

Answer helpfully, politely, and conversationally in 2-3 sentences. If relevant, mention that you can recommend verified tech hardware (laptops, monitors, keyboards, headphones) within their budget.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.AI_MODEL || 'gemini-2.0-flash'}:generateContent?key=${env.AI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4 },
      }),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as any;
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.AI_MODEL || 'gemini-2.0-flash'}:generateContent?key=${env.AI_API_KEY}`;

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
  private static fallbackDeterministicParser(
    message: string,
    isGreeting: boolean,
    isPolicyQA: boolean,
    isGeneralQA: boolean
  ): StructuredIntent {
    const lower = message.toLowerCase();

    if (isGreeting) {
      return {
        intent: 'greeting',
        category: null,
        budgetMax: null,
        budgetMin: null,
        useCases: [],
        preferences: [],
        constraints: [],
        searchTerm: null,
      };
    }

    if (isPolicyQA) {
      return {
        intent: 'policy_qa',
        category: null,
        budgetMax: null,
        budgetMin: null,
        useCases: [],
        preferences: [],
        constraints: [],
        searchTerm: null,
      };
    }

    if (isGeneralQA && !lower.includes('laptop') && !lower.includes('monitor') && !lower.includes('keyboard') && !lower.includes('headphone')) {
      return {
        intent: 'general_qa',
        category: null,
        budgetMax: null,
        budgetMin: null,
        useCases: [],
        preferences: [],
        constraints: [],
        searchTerm: null,
      };
    }

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

    // 2. Detect Budget
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
