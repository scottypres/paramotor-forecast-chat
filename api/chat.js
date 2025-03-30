const OpenAI = require('openai');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse the request body safely
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    console.error('Error parsing request body:', e);
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }

  const userMessage = body.message;

  if (!userMessage) {
    return res.status(400).json({ error: "Message required" });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a paramotor forecast guide that analyzes weather data for paramotor pilots and suggests the best times to fly."
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    res.status(200).json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// <-- CONFIGURATION MUST BE OUTSIDE FUNCTION BLOCK -->
module.exports.config = {
  runtime: 'nodejs',      // CRITICAL to avoid 10s timeout
  maxDuration: 300,       // Allows 5-minute timeout
  memory: 2048
};
