/**
 * PayPilot Advanced Conversational NLP Engine
 * Handles natural language intent classification, multilingual greetings (Hinglish/Hindi/English),
 * out-of-domain conversational queries, tech hardware advice, and domain-specific shopping searches.
 */

export interface NLPIntentResult {
  intent: 'greeting' | 'general_qa' | 'tech_advice' | 'policy_qa' | 'purchase_search' | 'chit_chat';
  isBundleRequest?: boolean;
  category: string | null;
  budgetMax: number | null;
  budgetMin: number | null;
  useCases: string[];
  preferences: string[];
  constraints: string[];
  searchTerm: string | null;
  conversationalResponse?: string;
}

export class NLPEngine {
  /**
   * Classify message with deep semantic keyword and linguistic pattern analysis
   */
  static analyze(message: string): NLPIntentResult {
    const raw = message.trim();
    const lower = raw.toLowerCase().replace(/[^\w\s₹,.<>]/g, ' ');

    // 1. Check for Multilingual Greetings & Casual Conversation
    if (this.isGreeting(lower)) {
      return {
        intent: 'greeting',
        category: null,
        budgetMax: null,
        budgetMin: null,
        useCases: [],
        preferences: [],
        constraints: [],
        searchTerm: null,
        conversationalResponse: this.generateGreetingResponse(lower),
      };
    }

    // 2. Check for Policy, Ceiling, or Razorpay Guardrails Q&A
    if (this.isPolicyQA(lower)) {
      return {
        intent: 'policy_qa',
        category: null,
        budgetMax: null,
        budgetMin: null,
        useCases: [],
        preferences: [],
        constraints: [],
        searchTerm: null,
        conversationalResponse: `🛡️ **PayPilot Policy Guardrails & Bounded Checkout**:\n\n• **Spending Ceiling**: All orders are capped at **₹80,000** by merchant governance to prevent unauthorized runaway expenses.\n• **Mandatory Human Authorization Gate**: I cannot move funds or execute transactions autonomously. You must explicitly review and check the approval gate.\n• **Cryptographic Razorpay Verification**: Test payments are validated using HMAC SHA256 signatures before orders are marked paid.\n• **Full PostgreSQL Audit Trail**: Every intent, search query, policy decision, and payment event is permanently logged.`,
      };
    }

    // 3. Check for Tech Hardware Advice / Q&A (e.g. OLED vs IPS, 16GB RAM)
    const techAdvice = this.checkTechAdvice(lower);
    if (techAdvice) {
      return {
        intent: 'tech_advice',
        category: techAdvice.category,
        budgetMax: null,
        budgetMin: null,
        useCases: [],
        preferences: [],
        constraints: [],
        searchTerm: null,
        conversationalResponse: techAdvice.response,
      };
    }

    // 4. Check for Out-of-Domain or General Q&A (e.g. GitHub, Python, Weather, Cricket)
    const generalQA = this.checkGeneralQA(lower, raw);
    if (generalQA) {
      return {
        intent: 'general_qa',
        category: null,
        budgetMax: null,
        budgetMin: null,
        useCases: [],
        preferences: [],
        constraints: [],
        searchTerm: null,
        conversationalResponse: generalQA,
      };
    }

    // 5. Shopping & Product Catalog Intent Detection
    const shoppingIntent = this.extractShoppingIntent(lower);
    if (shoppingIntent.isShopping) {
      return {
        intent: 'purchase_search',
        category: shoppingIntent.category,
        budgetMax: shoppingIntent.budgetMax,
        budgetMin: null,
        useCases: shoppingIntent.useCases,
        preferences: shoppingIntent.preferences,
        constraints: shoppingIntent.budgetMax ? [`under ₹${shoppingIntent.budgetMax.toLocaleString('en-IN')}`] : [],
        searchTerm: shoppingIntent.category || shoppingIntent.searchTerm || null,
      };
    }

    // 6. Default Fallback to Friendly Conversational Chat
    return {
      intent: 'chit_chat',
      category: null,
      budgetMax: null,
      budgetMin: null,
      useCases: [],
      preferences: [],
      constraints: [],
      searchTerm: null,
      conversationalResponse: `I'm **PayPilot AI**, your commerce assistant! I can chat with you, answer tech questions, or help you discover verified tech hardware like **coding laptops, gaming rigs, 4K monitors, mechanical keyboards, studio headphones, and accessories** within your budget.\n\nHow can I help you today?`,
    };
  }

  private static isGreeting(text: string): boolean {
    // If text mentions any product or budget keywords, it is a product query, NOT a greeting!
    if (
      text.includes('mouse') ||
      text.includes('laptop') ||
      text.includes('keyboard') ||
      text.includes('monitor') ||
      text.includes('headphone') ||
      text.includes('gadget') ||
      text.includes('under') ||
      text.includes('budget') ||
      text.includes('5k') ||
      text.includes('50k') ||
      text.includes('bhi') ||
      text.includes('chahiye')
    ) {
      return false;
    }

    const greetingWords = [
      'hi', 'hello', 'hey', 'heyy', 'hola', 'namaste', 'namaskar', 'pranam',
      'kaise ho', 'kya haal', 'kese ho', 'kaisa hai', 'bhai', 'bro', 'buddy',
      'good morning', 'good evening', 'good afternoon', 'good night',
      'what up', "what's up", 'wassup', 'sup', 'yo', 'how are you', 'how r u',
      'how do you do', 'who are you', 'what is your name', "whats your name", 'what can you do', 'shukriya', 'thanks', 'thank you', 'bye', 'alvida'
    ];

    const tokens = text.split(/\s+/);
    if (tokens.length <= 6) {
      for (const phrase of greetingWords) {
        if (text.includes(phrase)) return true;
      }
    }
    return false;
  }

  private static generateGreetingResponse(text: string): string {
    if (text.includes('name') || text.includes('who are you') || text.includes('kaun ho')) {
      return `My name is **PayPilot AI**! 🤖 I am your agentic commerce assistant built for Razorpay Track 1. I help you discover verified tech products, score options based on your exact budget, and process safe checkouts!`;
    }

    if (text.includes('kaise ho') || text.includes('kese ho') || text.includes('kaisa hai') || text.includes('kya haal')) {
      return `Main bilkul mast hoon! 😊 Aap bataiye kaise hain? Main PayPilot AI hoon. Aaj aapko kaun sa tech product ya accessory chahiye? Budget batayein, main best options dikha dunga!`;
    }

    if (text.includes('namaste') || text.includes('namaskar')) {
      return `Namaste! 🙏 Main PayPilot AI hoon. Main aapko best tech hardware discover karne aur safe Razorpay checkout me madad karta hoon. Aaj aap kya dekhna chahenge?`;
    }

    if (text.includes('thanks') || text.includes('thank you') || text.includes('shukriya') || text.includes('dhanyawad')) {
      return `You're very welcome! Always happy to help. Let me know if you need any other product recommendations! 😊`;
    }

    if (text.includes('bye') || text.includes('alvida')) {
      return `Goodbye! Have a fantastic day ahead! 👋`;
    }

    return `Hello! 👋 I'm **PayPilot AI**, your smart shopping assistant. How can I help you find tech products or gear today?`;
  }

  private static isPolicyQA(text: string): boolean {
    // If query is asking to build/buy a bundle or search products, it is NOT policy QA!
    if (
      text.includes('bundle') ||
      text.includes('bna') ||
      text.includes('bana') ||
      text.includes('buy') ||
      text.includes('under') ||
      text.includes('laptop') ||
      text.includes('keyboard') ||
      text.includes('mouse') ||
      text.includes('monitor') ||
      text.includes('chahiye') ||
      text.includes('recommend') ||
      text.includes('gadget') ||
      text.includes('clothes') ||
      text.includes('hoodie') ||
      text.includes('electrical')
    ) {
      return false;
    }

    const policyKeywords = [
      'policy', 'ceiling', 'spending limit', 'guardrail', 'guardrails',
      'max limit', 'maximum order', 'transaction limit',
      'human confirmation', 'approval gate', 'razorpay verification', 'hmac'
    ];
    return policyKeywords.some((k) => text.includes(k));
  }

  private static checkTechAdvice(text: string): { category: string | null; response: string } | null {
    if (text.includes('ram') && (text.includes('enough') || text.includes('coding') || text.includes('16gb') || text.includes('8gb') || text.includes('32gb'))) {
      return {
        category: 'laptops',
        response: `💡 **RAM Guide for Programming & Multitasking**:\n\n• **16GB RAM** is the sweet spot for modern software development (Docker, VS Code, multiple browser tabs, and local emulation).\n• **32GB RAM** is recommended if you run heavy virtualization, local AI models, or 4K video rendering.\n• **8GB RAM** is sufficient for light web browsing and basic coding, but will struggle under heavy multitasking.\n\nWould you like me to recommend laptops with **16GB RAM** within your budget?`,
      };
    }

    if (text.includes('oled') || text.includes('ips') || text.includes('va panel') || text.includes('refresh rate') || text.includes('4k vs 1080p') || text.includes('144hz')) {
      return {
        category: 'monitors',
        response: `🖥️ **Monitor Panel & Display Guide**:\n\n• **IPS Panels**: Best for coding, color accuracy, and wide viewing angles with zero burn-in risk.\n• **OLED Panels**: Exceptional contrast and deep blacks, ideal for content creation and premium media viewing.\n• **Refresh Rate**: 60Hz is standard for office work; **144Hz–165Hz** provides buttery-smooth window scrolling and esports responsiveness.\n\nI can recommend high-clarity 4K or ultra-wide monitors from our catalog if you'd like!`,
      };
    }

    if (text.includes('mechanical') && (text.includes('membrane') || text.includes('switch') || text.includes('red switch') || text.includes('blue switch'))) {
      return {
        category: 'keyboards_mice',
        response: `⌨️ **Mechanical vs Membrane Keyboards**:\n\n• **Mechanical Keyboards**: Individual physical switches under each key providing tactile feedback, faster actuation, and exceptional durability (50M+ keystrokes).\n• **Red Switches**: Linear & quiet — popular for fast coding and office environments.\n• **Brown Switches**: Tactile bump without loud clicking — the programmer favorite.\n• **Blue Switches**: Clicky & tactile — satisfying sound but louder in shared spaces.\n\nWe have hot-swappable mechanical keyboards in stock — would you like to see them?`,
      };
    }

    if (text.includes('anc') || text.includes('noise cancel') || text.includes('headphones vs headset')) {
      return {
        category: 'audio_video',
        response: `🎧 **Audio Guide for Productivity & WFH**:\n\n• **Active Noise Cancellation (ANC)**: Uses microphones to neutralize low-frequency ambient sounds (fan hum, background chatter), helping you stay in deep flow.\n• **Beamforming Microphones**: Focuses on your voice while suppressing room echo for crystal-clear Zoom/Meet calls.\n\nWould you like recommendations for ANC headphones or high-def webcams under a specific budget?`,
      };
    }

    return null;
  }

  private static checkGeneralQA(text: string, raw: string): string | null {
    if (text.includes('github') || text.includes('git')) {
      return `**GitHub** is a cloud-based developer platform used for version control, code hosting, and team collaboration using Git. It lets developers track code changes, manage pull requests, and deploy applications via CI/CD pipelines.\n\nAs **PayPilot AI**, while I understand software concepts, I specialize in helping developers get the best hardware gear (such as high-performance coding laptops, multi-monitor setups, and mechanical keyboards) with safe Razorpay checkouts!`;
    }

    if (text.includes('python') || text.includes('javascript') || text.includes('typescript') || text.includes('react') || text.includes('node')) {
      return `That's a popular programming language/framework! While I can discuss software topics, my main capability as **PayPilot AI** is helping you discover and purchase verified tech gear tailored to developers (like laptops with 16GB+ RAM, fast NVMe SSDs, and ergonomic accessories).\n\nAre you looking for hardware to power your coding projects?`;
    }

    if (text.includes('who is') || text.includes('president') || text.includes('prime minister') || text.includes('capital of') || text.includes('weather') || text.includes('cricket') || text.includes('ipl') || text.includes('movie') || text.includes('joke')) {
      return `I'm **PayPilot AI**, a dedicated agentic commerce assistant built for Razorpay Track 1. While general web knowledge is fun, my specialized focus is understanding tech shopping requirements, ranking real hardware from PostgreSQL, and providing secure, policy-bounded checkouts!\n\nFeel free to ask me for recommendations on laptops, monitors, keyboards, audio gear, or accessories!`;
    }

    return null;
  }

  private static extractShoppingIntent(text: string): {
    isShopping: boolean;
    isBundleRequest: boolean;
    category: string | null;
    budgetMax: number | null;
    useCases: string[];
    preferences: string[];
    searchTerm: string | null;
  } {
    // 1. Detect explicit categories across Electronics, Gadgets, Apparel & Electricals
    let category: string | null = null;
    let hasCategoryMention = false;

    if (text.includes('laptop') || text.includes('notebook') || text.includes('macbook') || text.includes('pc') || text.includes('rig')) {
      category = 'laptops';
      hasCategoryMention = true;
    } else if (text.includes('monitor') || text.includes('display') || text.includes('screen') || text.includes('4k')) {
      category = 'monitors';
      hasCategoryMention = true;
    } else if (text.includes('mouse') || text.includes('keyboard') || text.includes('keypad')) {
      category = 'keyboards_mice';
      hasCategoryMention = true;
    } else if (text.includes('headphone') || text.includes('headset') || text.includes('earbud') || text.includes('audio') || text.includes('webcam') || text.includes('mic')) {
      category = 'audio_video';
      hasCategoryMention = true;
    } else if (text.includes('gadget') || text.includes('watch') || text.includes('smartwatch') || text.includes('tablet') || text.includes('powerbank') || text.includes('tws') || text.includes('vr')) {
      category = 'gadgets';
      hasCategoryMention = true;
    } else if (text.includes('hoodie') || text.includes('cloth') || text.includes('t-shirt') || text.includes('tee') || text.includes('backpack') || text.includes('bag') || text.includes('glasses') || text.includes('jacket')) {
      category = 'apparel';
      hasCategoryMention = true;
    } else if (text.includes('electrical') || text.includes('light') || text.includes('surge') || text.includes('plug') || text.includes('extension') || text.includes('cable')) {
      category = 'electricals';
      hasCategoryMention = true;
    } else if (text.includes('charger') || text.includes('hub') || text.includes('adapter') || text.includes('stand') || text.includes('accessories')) {
      category = 'accessories';
      hasCategoryMention = true;
    }

    // 2. Detect Bundle Intent (e.g. "ek bundle bna ke do jisme ek laptop , ek keyboard or mouse ho under 80000")
    const isBundleRequest = 
      text.includes('bundle') || 
      text.includes('bna') || 
      text.includes('bana') || 
      text.includes('combo') || 
      text.includes('setup') || 
      (text.includes('laptop') && (text.includes('keyboard') || text.includes('mouse')));

    // 2. Detect Shopping & Open-Ended Recommendation Triggers
    const shoppingTriggers = [
      'buy', 'purchase', 'recommend', 'suggest', 'find', 'show', 'search',
      'need', 'want', 'looking for', 'chahiye', 'kharidna', 'dikhaye', 'batao',
      'under', 'below', 'budget', 'price', 'best', 'cost',
      'aur kya', 'kharid skta', 'kharid sakta', 'kuchh recommend', 'kuch recommend',
      'what else', 'recommend something', 'suggest products', 'kya kya hai', 'kya sell',
      'top gear', 'top items', 'best deals', 'kuch naya'
    ];

    const hasShoppingTrigger = shoppingTriggers.some((t) => text.includes(t));

    // Open-ended recommendation query (e.g. "aur kya kharid skta hu", "kuchh recommend kr")
    const isOpenEndedRecommendation = 
      text.includes('aur kya') || 
      text.includes('recommend') || 
      text.includes('suggest') || 
      text.includes('kuchh') || 
      text.includes('kya kya') ||
      text.includes('what else') ||
      text.includes('sell');

    // 3. Extract Budget
    let budgetMax: number | null = null;
    const kMatch = text.match(/(?:under|below|budget|within|max|<=?|₹|\bin\s*)?\s*(\d{1,3})\s*(?:k|thousand)\b/i);
    const fullNumMatch = text.match(/(?:under|below|budget|within|max|<=?|₹|\bin\s*)?\s*(\d{4,6})\b/i);

    if (kMatch && kMatch[1]) {
      budgetMax = parseInt(kMatch[1], 10) * 1000;
    } else if (fullNumMatch && fullNumMatch[1]) {
      budgetMax = parseInt(fullNumMatch[1], 10);
    }

    // 4. Extract Use Cases
    const useCases: string[] = [];
    if (text.includes('coding') || text.includes('developer') || text.includes('programming') || text.includes('software')) useCases.push('coding');
    if (text.includes('gaming') || text.includes('fps') || text.includes('esports')) useCases.push('gaming');
    if (text.includes('student') || text.includes('college') || text.includes('study') || text.includes('school')) useCases.push('student');
    if (text.includes('wfh') || text.includes('office') || text.includes('work from home')) useCases.push('wfh');
    if (text.includes('editing') || text.includes('creator') || text.includes('video') || text.includes('design')) useCases.push('creative');

    // 5. Extract Preferences
    const preferences: string[] = [];
    if (text.includes('battery') || text.includes('long battery')) preferences.push('long battery');
    if (text.includes('wireless') || text.includes('bluetooth')) preferences.push('wireless');
    if (text.includes('lightweight') || text.includes('portable')) preferences.push('lightweight');
    if (text.includes('mechanical') || text.includes('tactile')) preferences.push('mechanical');
    if (text.includes('noise') || text.includes('anc')) preferences.push('active noise cancellation');

    const isShopping = hasCategoryMention || isOpenEndedRecommendation || isBundleRequest || (hasShoppingTrigger && (budgetMax !== null || useCases.length > 0));

    return {
      isShopping,
      isBundleRequest,
      category,
      budgetMax,
      useCases,
      preferences,
      searchTerm: category || null,
    };
  }
}
