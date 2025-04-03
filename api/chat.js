const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Store a thread ID per sessionId
const threadMap = new Map();

exports.config = {
  runtime: 'nodejs',
  maxDuration: 300,
  memory: 2048
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    console.error('Error parsing request body:', e);
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }

  const { message, sessionId } = body;

  if (!message || !sessionId) {
    return res.status(400).json({ error: "Message and sessionId required" });
  }

  try {
    // Get or create the thread for this session
    let threadId = threadMap.get(sessionId);
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      threadMap.set(sessionId, threadId);
      console.log(`New thread created for session ${sessionId}: ${threadId}`);
    }

    // Add user message
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: 'asst_caEWtM1PSJEwOMIRswzpNCoR'
    });

    // Poll until the assistant finishes
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    const start = Date.now();
    while (runStatus.status !== 'completed' && Date.now() - start < 10000) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }

    if (runStatus.status !== 'completed') {
      throw new Error("Assistant run timeout.");
    }

    // Get the assistant's reply
    const messages = await openai.beta.threads.messages.list(threadId);
    const latest = messages.data.find(msg => msg.role === 'assistant');
    res.status(200).json({ reply: latest.content[0].text.value });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
};
