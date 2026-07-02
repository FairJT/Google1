import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

// Helper for lazy loading GoogleGenAI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment. Please configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const app = express();
const PORT = 3000;

app.use(express.json());

// 1. Chat Endpoint with Role-Based Personas (Manager operational assistant & Client style consultant)
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, role, userName, allUsers, clientRequests, transactions } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Invalid messages format" });
      return;
    }

    const ai = getGeminiClient();
    
    // Format message history
    const compiledHistory = messages.map((m: any) => {
      const roleName = m.role === "user" ? "کاربر" : "دستیار هوش مصنوعی لجندین";
      return `${roleName}: ${m.content}`;
    }).join("\n");

    // Format allUsers / artists
    let artistsSummary = "";
    if (allUsers && Array.isArray(allUsers)) {
      const artists = allUsers.filter((u: any) => u.role === "artist");
      artistsSummary = artists.map((a: any) => {
        const skillsList = a.skills ? a.skills.map((s: any) => s.name).join("، ") : "ثبت نشده";
        return `- نام: ${a.name} | تخصص: ${a.title} | شهر: ${a.city} | مهارت‌ها: ${skillsList} | امتیاز: ${a.rating || "بدون امتیاز"} | آماده به کار: ${a.openForHiring ? "بله" : "خیر"}`;
      }).join("\n");
    }

    // Format clientRequests
    let requestsSummary = "";
    if (clientRequests && Array.isArray(clientRequests)) {
      requestsSummary = clientRequests.map((r: any) => {
        return `- از طرف: ${r.clientName} | برای: ${r.targetName} (${r.targetType === "artist" ? "آرتیست" : "سالن"}) | خدمت: ${r.serviceType} | تاریخ: ${r.preferredDate} | ساعت: ${r.preferredTime} | وضعیت: ${r.status === "pending" ? "معلق" : r.status === "accepted" ? "تایید شده" : "رد شده"}`;
      }).join("\n");
    }

    // Format transactions
    let transactionsSummary = "";
    if (transactions && Array.isArray(transactions)) {
      transactionsSummary = transactions.map((t: any) => {
        return `- تاریخ: ${t.date} | دسته‌بندی: ${t.category} | مبلغ: ${t.amount} تومان | توضیحات: ${t.description || "بدون توضیح"}`;
      }).join("\n");
    }

    // Dynamic system persona prompt based on the user's role
    let personaPrompt = "";
    const nameToUse = userName || "کاربر عزیز";

    if (role === "manager") {
      personaPrompt = `You are "Legendin Manager Assistant" (دستیار هوشمند مدیران لجندین) - an elite AI Salon Operations & Business Intelligence Consultant.
Your traits: highly professional, data-driven, strategic, warm, and extremely organized.
Your language: STRICTLY Persian (Farsi) only. Speak in a respectful, sophisticated, and business-focused tone (احترام تجاری و صمیمیت فارسی).

Your task is to help the Salon Manager (named ${nameToUse}) manage their beauty business:
1. Provide Financial Analysis & Reports: You have access to real transaction logs from the financial ledger. Analyze these transactions (including categories like rental income, bills, salaries, supplies) and bookings:
   - Provide summary of total revenues vs total expenses.
   - Calculate net profit based on these actual ledger items.
   - Highlight any budget concerns or categories with high spending.
2. Check Artist Status & Performance: Look at the active artists listed in the database, their average ratings, skills, and workload (number of accepted bookings in clientRequests). Recommend top artists or suggest hiring new talent if current artists have high workload.
3. Help with Salon Management, scheduling tips, marketing advice, and conflict resolution with clients or staff.

Here is the real-time Salon & Artist data available in the system:
--- ACTIVE ARTISTS & RECRUITS ---
${artistsSummary || "هیچ آرتیستی در سیستم یافت نشد."}

--- ACTIVE CLIENT BOOKINGS & REQUESTS ---
${requestsSummary || "هیچ رزرو نوبتی ثبت نشده است."}

--- REAL TRANSACTION LOGS (FINANCIAL LEDGER) ---
${transactionsSummary || "هیچ تراکنش مالی ثبت نشده است."}`;
    } else {
      personaPrompt = `You are "Legendin Beauty Expert" (دستیار زیبایی و مشاوره هوشمند لجندین) - an elite AI Style Consultant and beauty shopping assistant.
Your traits: fashionable, extremely warm, helpful, beauty-enthusiast, and elegant.
Your language: STRICTLY Persian (Farsi) only. Speak in a friendly, enthusiastic, and sophisticated style (لحن صمیمی و شیک فارسی).

Your task is to help Guests and Customers (named ${nameToUse}) find their perfect look, beauty service, or beauty artist:
1. Provide Personalized Style Suggestions: If they look for specific styles (e.g., "مدل خاص ناخن تا رنج قیمت ۲ میلیون تومن" - specific nail design under 2 million Tomans), suggest beautiful options like:
   - کاشت ژل با طراحی‌های مینیمال یا کروم (Gel Extensions with Chrome/Minimalist Art): ~1,200,000 to 1,800,000 Toman.
   - لمینت ناخن (Nail Laminate) for a natural, clean, durable look: ~600,000 to 900,000 Toman.
   - ژلیش ناخن طبیعی همراه با طراحی لنز یا آمبره (Gel Polish on natural nails with ombre/lens): ~400,000 to 700,000 Toman.
   Give specific styling trends (e.g., glazed donut nails, aura nails, french chrome) that are trendy and elegant.
2. Recommend Real Artists: Look at the provided active artists list. Recommend real specialists based on their skills (e.g. who has nail/ناخن or makeup/میکاپ skills) and their location (e.g. matching their city). Explain why they are a great fit.
3. Suggest perfect beauty routines, colors matching their skin tone, or guide them on how to request a booking with these artists through the Legendin directory ("دایرکتوری استخدام آرتیست‌ها" or "پروفایل آرتیست"). Always quote prices in "تومان" (Toman).

Here is the real-time Artist data available in the platform:
--- LIST OF ACTIVE BEAUTY ARTISTS ---
${artistsSummary || "هیچ آرتیستی در سیستم یافت نشد."}`;
    }

    const finalPrompt = `${personaPrompt}

Below is the user query and conversational history:
=========================================
${compiledHistory}
=========================================

Provide a beautiful, highly engaging, and structured response in Persian. Use bolding, bullet points, and elegant formatting. Keep it professional and complete. Do not refer to JSON or system objects directly. Speak directly to ${nameToUse} in Persian.

Response in Persian:`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: finalPrompt,
    });

    const reply = response.text || "من پوزش می‌طلبم، در حال حاضر در برقراری ارتباط با هسته مرکزی هوش مصنوعی مشکلی پیش آمده است. لطفاً دوباره تلاش کنید.";
    res.json({ content: reply });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// 2. Semantic Search Endpoint
app.post("/api/semantic-search", async (req, res) => {
  try {
    const { query, salons, artists } = req.body;
    if (!query) {
      res.status(400).json({ error: "Search query is required" });
      return;
    }

    const ai = getGeminiClient();

    const prompt = `You are an AI-driven search matcher for a cloud beauty platform in Iran.
The user is looking for beauty services, aesthetics, or styles with this Persian query: "${query}"

Here is the list of available salons:
${JSON.stringify(salons, null, 2)}

Here is the list of available artists/specialists:
${JSON.stringify(artists, null, 2)}

Analyze this list and return a JSON array of the top matching entity keys (either salon keys or artist names) that best fit this query, along with a detailed 'matchReason' in Persian (Farsi, under 2 sentences) explaining why they are a great fit, and a 'matchScore' (0 to 100).
Respond with valid, parseable JSON conforming to this schema:
[
  {
    "type": "salon" | "artist",
    "name": "Name of Salon or Artist",
    "matchScore": number,
    "matchReason": "توضیح کوتاه و جذاب به زبان فارسی درباره علت انتخاب این گزینه"
  }
]
Do not wrap the JSON in Markdown codeblocks. Return ONLY raw valid JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const results = JSON.parse(response.text?.trim() || "[]");
    res.json({ results });
  } catch (error: any) {
    console.error("Error in /api/semantic-search:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// 3. Dynamic Pricing & demand simulation endpoint
app.post("/api/dynamic-pricing", async (req, res) => {
  try {
    const { serviceName, basePrice, popularity, timeOfDay, dayOfWeek } = req.body;
    
    const ai = getGeminiClient();
    
    const prompt = `Analyze the optimal dynamic price offset for a premium Persian salon service under the following conditions:
Service: ${serviceName}
Base Price: ${basePrice} Toman (تومان)
Popularity (1-10): ${popularity}
Time of Day: ${timeOfDay} (e.g. Morning, Peak Afternoon, Evening)
Day of Week: ${dayOfWeek} (Note: In Iran, Thursday and Friday are the weekend/holiday, which represents the highest Peak demand)

Calculate an elegant dynamic multiplier (e.g. 0.95 for low demand morning hours, 1.25 for peak weekend hours) and write a 1-sentence justification in Persian (Farsi) explaining the rate change.
Respond with raw JSON only (no markdown block):
{
  "multiplier": number,
  "finalPrice": number,
  "demandLevel": "Low" | "Moderate" | "High" | "Surge",
  "reason": "توضیح کوتاه به زبان فارسی در مورد علت تغییر قیمت"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const pricing = JSON.parse(response.text?.trim() || "{}");
    res.json(pricing);
  } catch (error: any) {
    console.error("Error in /api/dynamic-pricing:", error);
    // Graceful fallback
    res.json({
      multiplier: 1.1,
      finalPrice: Math.round((req.body.basePrice || 500000) * 1.1),
      demandLevel: "Moderate",
      reason: "نرخ استاندارد با توجه به تقاضای متوسط اعمال شد."
    });
  }
});

// Integrate Vite Middleware or Serve Static Files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
