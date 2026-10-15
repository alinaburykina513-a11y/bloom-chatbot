// Netlify Function: answers chat questions with AI, using the business info below.
// Set ONE of these environment variables in Netlify (Site settings → Environment variables):
//   ANTHROPIC_API_KEY  (Claude)   or   OPENAI_API_KEY  (ChatGPT)
// Optional: AI_MODEL to choose a specific model.
// With no key set, the bot answers simple questions from a built-in demo list (no AI).

const BUSINESS_INFO = `
BLOOM SALON (fictional demo business)
Friendly hair and beauty salon in the city centre: haircuts, colouring, styling, nails, simple beauty treatments for women and men.

Opening hours: Monday closed. Tuesday–Friday 9:00–19:00. Saturday 9:00–15:00. Sunday closed.
Address: 12 Garden Street, City Centre. Free parking behind the building.

Hair: women's haircut €35, men's haircut €20, children's haircut (under 12) €15, blow-dry and styling €25, full colour from €60, highlights from €75, hair treatment (mask) €15.
Nails and beauty: classic manicure €25, gel manicure €35, pedicure €35, eyebrow shaping €12, eyebrow tint €10.

Booking: by phone, through the booking button on the website, or here in the chat with name, service and preferred day and time. The salon confirms as soon as possible.
Cancellation: at least 24 hours in advance; late cancellations may be charged 50%.
Payment: cash and all major bank cards. Gift cards available.
Walk-ins welcome if there is a free spot; booking recommended, especially Saturdays.
Haircut takes about 45 minutes (women) or 30 minutes (men).
Most hair products are vegan and cruelty-free. Free Wi-Fi. Team speaks English, Slovenian and Ukrainian.
`;

const SYSTEM_PROMPT = `You are the friendly AI assistant on the Bloom Salon website.
Answer ONLY using the business information below. Keep answers short (1–3 sentences), warm and helpful.
Reply in the same language the customer writes in.
If a customer wants to book, ask for their name, the service, and their preferred day and time, then say the salon will confirm soon.
If the answer is not in the information, say you're not sure and suggest contacting the salon directly. Never invent prices, times or services.

BUSINESS INFORMATION:
${BUSINESS_INFO}`;

const headers = { 'Content-Type': 'application/json' };

function demoReply(q) {
  const t = q.toLowerCase();
  if (/(hour|open|close|time|when)/.test(t)) return "We're open Tuesday to Friday 9:00–19:00 and Saturday 9:00–15:00. We're closed on Sunday and Monday.";
  if (/(haircut|cut|price|cost|how much)/.test(t)) return "A women's cut is €35 and a men's cut is €20. Children's cuts are €15. Would you like to book?";
  if (/(manicure|nail|pedicure|gel)/.test(t)) return 'A classic manicure is €25, gel manicure €35 and pedicure €35.';
  if (/(book|appointment|reserve)/.test(t)) return "Happy to help! Please send your name, the service you'd like, and your preferred day and time.";
  if (/(where|address|parking|location)/.test(t)) return "We're at 12 Garden Street in the city centre, with free parking behind the building.";
  if (/(cancel)/.test(t)) return 'Please cancel at least 24 hours in advance. Late cancellations may be charged 50%.';
  return "I'm the demo assistant. Ask me about prices, opening hours or booking!";
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let messages = [];
  try {
    messages = (JSON.parse(event.body || '{}').messages || [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Bad request' }) };
  }
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'No question' }) };
  }
  const question = messages[messages.length - 1].content;

  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || 'claude-haiku-4-5',
          max_tokens: 300,
          system: SYSTEM_PROMPT,
          messages
        })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(data));
      const reply = (data.content || []).map((c) => c.text || '').join('').trim();
      return { statusCode: 200, headers, body: JSON.stringify({ reply }) };
    }

    if (process.env.OPENAI_API_KEY) {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.AI_MODEL || 'gpt-4o-mini',
          max_tokens: 300,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]
        })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(data));
      const reply = (data.choices?.[0]?.message?.content || '').trim();
      return { statusCode: 200, headers, body: JSON.stringify({ reply }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ reply: demoReply(question), mode: 'demo' }) };
  } catch (err) {
    console.error('AI error:', err.message);
    return { statusCode: 200, headers, body: JSON.stringify({ reply: "Sorry, I can't answer right now. Please contact the salon directly." }) };
  }
};
