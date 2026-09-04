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
      isBundleRequest: nlpResult.isBundleRequest,
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
    history: Array<{ role: string; content: string }> = [],
    suggestedBundle?: any,
    language = 'en'
  ): Promise<string> {
    if (language === 'hi') {
      if (suggestedBundle && suggestedBundle.products && suggestedBundle.products.length >= 3) {
        return `बिल्कुल! आपके बजट के अनुसार हमने एक पूरा Verified Setup Bundle तैयार किया है:\n\n1. 💻 **${suggestedBundle.products[0].name}** (₹${suggestedBundle.products[0].priceInr.toLocaleString('en-IN')})\n2. ⌨️ **${suggestedBundle.products[1].name}** (₹${suggestedBundle.products[1].priceInr.toLocaleString('en-IN')})\n3. 🖱️ **${suggestedBundle.products[2].name}** (₹${suggestedBundle.products[2].priceInr.toLocaleString('en-IN')})\n\nकुल मूल्य: ~~₹${suggestedBundle.totalPriceInr.toLocaleString('en-IN')}~~ → **₹${suggestedBundle.discountedPriceInr.toLocaleString('en-IN')}** (आप ₹${suggestedBundle.savingsInr.toLocaleString('en-IN')} की बचत कर रहे हैं!). आप नीचे "+ Add Complete Setup Bundle" बटन से सभी आइटम्स एक साथ कार्ट में जोड़ सकते हैं!`;
      }
      if (rankedProducts.length === 0) {
        return `नमस्ते! मैंने "${userMessage}" के लिए हमारे Verified Catalog में खोज की, लेकिन अभी कोई सटीक परिणाम नहीं मिला।\n\n💡 **सुझाव**: आप **Laptops**, **Monitors**, **Keyboards & Mice**, **Electronics**, या **Gadgets** खोज सकते हैं!`;
      }
      const topPick = rankedProducts[0].product;
      const nameVal = topPick?.name || 'Verified Product';
      const priceVal = topPick?.priceInr ?? (topPick?.pricePaise ? Number(topPick.pricePaise) / 100 : 0);
      const topReasons = (rankedProducts[0]?.reasons && rankedProducts[0].reasons.length > 0)
        ? rankedProducts[0].reasons.join(', ')
        : `उत्कृष्ट विकल्प`;

      return `आपकी पसंद के अनुसार, मैं **${nameVal}** (₹${priceVal.toLocaleString('en-IN')}) की सिफारिश करता हूँ।\n\nयह आपके खोज मानदंडों (${topReasons}) से बिल्कुल मेल खाता है। आप इसे सीधे नीचे अपने कार्ट में जोड़ सकते हैं!`;
    }

    if (language === 'mr') {
      if (suggestedBundle && suggestedBundle.products && suggestedBundle.products.length >= 3) {
        return `नक्कीच! तुमच्या बजेटनुसार आम्ही एक पूर्ण Verified Setup Bundle तयार केला आहे:\n\n1. 💻 **${suggestedBundle.products[0].name}** (₹${suggestedBundle.products[0].priceInr.toLocaleString('en-IN')})\n2. ⌨️ **${suggestedBundle.products[1].name}** (₹${suggestedBundle.products[1].priceInr.toLocaleString('en-IN')})\n3. 🖱️ **${suggestedBundle.products[2].name}** (₹${suggestedBundle.products[2].priceInr.toLocaleString('en-IN')})\n\nएकूण किंमत: ~~₹${suggestedBundle.totalPriceInr.toLocaleString('en-IN')}~~ → **₹${suggestedBundle.discountedPriceInr.toLocaleString('en-IN')}** (तुम्ही ₹${suggestedBundle.savingsInr.toLocaleString('en-IN')} बचत करत आहात!). तुम्ही खालील बटनावर क्लिक करून सर्व उत्पादने एकाच वेळी कार्टमध्ये जोडू शकता!`;
      }
      if (rankedProducts.length === 0) {
        return `नमस्कार! मी "${userMessage}" साठी आमच्या Verified Catalog मध्ये शोधले, परंतु सध्या कोणताही अचूक निकाल मिळाला नाही.\n\n💡 **टीप**: तुम्ही **Laptops**, **Monitors**, **Keyboards & Mice**, **Electronics**, किंवा **Gadgets** शोधू शकता!`;
      }
      const topPick = rankedProducts[0].product;
      const nameVal = topPick?.name || 'Verified Product';
      const priceVal = topPick?.priceInr ?? (topPick?.pricePaise ? Number(topPick.pricePaise) / 100 : 0);
      const topReasons = (rankedProducts[0]?.reasons && rankedProducts[0].reasons.length > 0)
        ? rankedProducts[0].reasons.join(', ')
        : `उत्कृष्ट पर्याय`;

      return `तुमच्या निवडीनुसार, मी **${nameVal}** (₹${priceVal.toLocaleString('en-IN')}) ची शिफारस करतो.\n\nहे तुमच्या निकषांशी (${topReasons}) तंतोतंत जुळते. तुम्ही हे खाली थेट तुमच्या कार्टमध्ये जोडू शकता!`;
    }

    if (suggestedBundle && suggestedBundle.products && suggestedBundle.products.length >= 3) {
      return `Bilkul! Aapke budget ke under humne ek Complete Verified Workstation Bundle prepare kiya hai:\n\n1. 💻 **${suggestedBundle.products[0].name}** (₹${suggestedBundle.products[0].priceInr.toLocaleString('en-IN')})\n2. ⌨️ **${suggestedBundle.products[1].name}** (₹${suggestedBundle.products[1].priceInr.toLocaleString('en-IN')})\n3. 🖱️ **${suggestedBundle.products[2].name}** (₹${suggestedBundle.products[2].priceInr.toLocaleString('en-IN')})\n\nTotal Value: ~~₹${suggestedBundle.totalPriceInr.toLocaleString('en-IN')}~~ → **₹${suggestedBundle.discountedPriceInr.toLocaleString('en-IN')}** (Aap ₹${suggestedBundle.savingsInr.toLocaleString('en-IN')} save kar rahe hain!). Aap niche "+ Add Complete Setup Bundle" button se sabhi items ek saath cart mein add kar sakte hain!`;
    }

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
      return `I searched our verified catalog for "${userMessage}", but couldn't find an exact match right now.\n\n💡 **Tip**: Try searching for **Laptops**, **Monitors**, **Keyboards & Mice**, **Electronics & Gadgets**, **Apparel**, or **Electricals**!`;
    }

    const topPick = rankedProducts[0].product;
    const nameVal = topPick?.name || 'Verified Hardware Match';
    const priceVal = topPick?.priceInr ?? (topPick?.pricePaise ? Number(topPick.pricePaise) / 100 : 0);
    const topReasons = (rankedProducts[0]?.reasons && rankedProducts[0].reasons.length > 0)
      ? rankedProducts[0].reasons.join(', ')
      : `Direct match for category ${topPick?.category || 'hardware'}`;

    if (intent.budgetMax && priceVal > intent.budgetMax) {
      return `I searched our verified PostgreSQL catalog for options under **₹${intent.budgetMax.toLocaleString('en-IN')}**, but our lowest priced item in stock is **₹${priceVal.toLocaleString('en-IN')}**.\n\nHere is our top recommended option: **${nameVal}** for **₹${priceVal.toLocaleString('en-IN')}** (${topReasons}). You can add it to your cart directly below!`;
    }

    return `Based on your request, I recommend the **${nameVal}** for **₹${priceVal.toLocaleString('en-IN')}**.\n\nIt matches your criteria (${topReasons}). You can add it directly to your cart below!`;
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

    const primaryModel = env.AI_MODEL || 'gemini-3.6-flash';
    const models = [primaryModel, 'gemini-3.5-flash'];

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.AI_API_KEY}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(6000),
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

    const primaryModel = env.AI_MODEL || 'gemini-3.6-flash';
    const models = [primaryModel, 'gemini-3.5-flash'];

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.AI_API_KEY}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(6000),
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
