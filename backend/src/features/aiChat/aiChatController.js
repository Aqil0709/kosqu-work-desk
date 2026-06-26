const Anthropic = require('@anthropic-ai/sdk');
const AIChatModel = require('./aiChatModel');
const {
  loadAdminContext,
  loadHRContext,
  loadTLContext,
  loadEmployeeContext,
  buildSystemPrompt,
} = require('./aiChatContext');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-opus-4-8';

// ---------- context loader dispatch ----------
async function getRoleContext(position, tenantId, userId) {
  switch (position) {
    case 'admin':
    case 'super_admin':
      return loadAdminContext(tenantId);
    case 'hr':
      return loadHRContext(tenantId);
    case 'tl':
    case 'team_lead':
      return loadTLContext(tenantId, userId);
    default:
      return loadEmployeeContext(tenantId, userId);
  }
}

// ---------- sessions ----------
exports.getSessions = async (req, res) => {
  try {
    const sessions = await AIChatModel.getSessions(req.tenantId, req.user.id);
    res.json({ success: true, data: sessions });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.createSession = async (req, res) => {
  try {
    const { title } = req.body;
    const sessionId = await AIChatModel.createSession(req.tenantId, req.user.id, title || 'New Chat');
    res.status(201).json({ success: true, data: { id: sessionId } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const session = await AIChatModel.getSession(req.tenantId, req.params.sessionId, req.user.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const messages = await AIChatModel.getMessages(req.tenantId, req.params.sessionId);
    res.json({ success: true, data: messages });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.renameSession = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title required' });
    await AIChatModel.updateSessionTitle(req.tenantId, req.params.sessionId, req.user.id, title);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.archiveSession = async (req, res) => {
  try {
    await AIChatModel.archiveSession(req.tenantId, req.params.sessionId, req.user.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.deleteSession = async (req, res) => {
  try {
    await AIChatModel.deleteSession(req.tenantId, req.params.sessionId, req.user.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ---------- main chat (streaming SSE) ----------
exports.chat = async (req, res) => {
  const { sessionId } = req.params;
  const { message } = req.body;

  if (!message || !message.trim())
    return res.status(400).json({ success: false, message: 'message is required' });

  try {
    const session = await AIChatModel.getSession(req.tenantId, sessionId, req.user.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    // Load role-scoped context
    const position   = req.user.position || 'employee';
    const ctxData    = await getRoleContext(position, req.tenantId, req.user.id);
    const systemText = buildSystemPrompt(position, ctxData);

    // Persist user message
    await AIChatModel.addMessage(req.tenantId, sessionId, 'user', message.trim());

    // Build message history (last 20 turns to stay within context budget)
    const history = await AIChatModel.getMessages(req.tenantId, sessionId, 20);
    const apiMessages = history.map(m => ({ role: m.role, content: m.content }));

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let assistantText = '';

    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      system: systemText,
      messages: apiMessages,
    });

    stream.on('text', (chunk) => {
      assistantText += chunk;
      res.write(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`);
    });

    stream.on('message', async (msg) => {
      const tokenCount = (msg.usage?.input_tokens || 0) + (msg.usage?.output_tokens || 0);
      await AIChatModel.addMessage(req.tenantId, sessionId, 'assistant', assistantText, tokenCount);

      // Auto-title session on first exchange
      if (session.title === 'New Chat' && message.length > 3) {
        const shortTitle = message.slice(0, 60).trim();
        await AIChatModel.updateSessionTitle(req.tenantId, sessionId, req.user.id, shortTitle);
      }

      res.write(`data: ${JSON.stringify({ type: 'done', usage: msg.usage })}\n\n`);
      res.end();
    });

    stream.on('error', (err) => {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      res.end();
    });

  } catch (e) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: e.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: e.message })}\n\n`);
      res.end();
    }
  }
};

// ---------- non-streaming fallback (for simpler clients) ----------
exports.chatSync = async (req, res) => {
  const { sessionId } = req.params;
  const { message } = req.body;

  if (!message || !message.trim())
    return res.status(400).json({ success: false, message: 'message is required' });

  try {
    const session = await AIChatModel.getSession(req.tenantId, sessionId, req.user.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const position   = req.user.position || 'employee';
    const ctxData    = await getRoleContext(position, req.tenantId, req.user.id);
    const systemText = buildSystemPrompt(position, ctxData);

    await AIChatModel.addMessage(req.tenantId, sessionId, 'user', message.trim());

    const history    = await AIChatModel.getMessages(req.tenantId, sessionId, 20);
    const apiMessages = history.map(m => ({ role: m.role, content: m.content }));

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      system: systemText,
      messages: apiMessages,
    });

    const assistantText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    const tokenCount = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);
    await AIChatModel.addMessage(req.tenantId, sessionId, 'assistant', assistantText, tokenCount);

    if (session.title === 'New Chat' && message.length > 3) {
      await AIChatModel.updateSessionTitle(req.tenantId, sessionId, req.user.id, message.slice(0, 60).trim());
    }

    res.json({ success: true, data: { content: assistantText, usage: response.usage } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
