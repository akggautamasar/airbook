// ============================================================
// AirBook – Telegram Storage Backend
//
// Architecture:
//   • One private Telegram channel acts as the database.
//   • Each quiz is uploaded as an HTML document message.
//   • A pinned "index" message stores JSON metadata for all quizzes
//     so listing is fast (no need to download every file).
//   • The index stores file_id so HTML can be fetched directly
//     via Telegram's file API.
//   • Bot token + channel id come from env vars.
// ============================================================

const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string;
const CHANNEL_ID = import.meta.env.VITE_TELEGRAM_CHANNEL_ID as string;
const BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

export interface QuizMeta {
  id: string;        // Telegram message_id of the document message
  file_id: string;   // Telegram file_id to download HTML
  title: string;
  description: string;
  question_count: number;
  file_size: number;
  created_at: string; // ISO string
}

// ── Core API wrapper ─────────────────────────────────────────

async function tg(method: string, body: Record<string, unknown> = {}): Promise<unknown> {
  const res = await fetch(`${BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json() as { ok: boolean; result: unknown; description?: string };
  if (!json.ok) throw new Error(`[Telegram] ${method}: ${json.description}`);
  return json.result;
}

// ── Index management ─────────────────────────────────────────
// The index is stored in a single pinned channel message.

const INDEX_HEADER = 'AIRBOOK_INDEX_V1\n';

async function readIndex(): Promise<QuizMeta[]> {
  try {
    const chat = await tg('getChat', { chat_id: CHANNEL_ID }) as { pinned_message?: { text?: string } };
    const text = chat?.pinned_message?.text ?? '';
    if (!text.startsWith(INDEX_HEADER)) return [];
    return JSON.parse(text.slice(INDEX_HEADER.length)) as QuizMeta[];
  } catch {
    return [];
  }
}

async function writeIndex(quizzes: QuizMeta[]): Promise<void> {
  const text = INDEX_HEADER + JSON.stringify(quizzes);
  const chat = await tg('getChat', { chat_id: CHANNEL_ID }) as { pinned_message?: { message_id?: number } };
  const pinnedId = chat?.pinned_message?.message_id;

  if (pinnedId) {
    try {
      await tg('editMessageText', { chat_id: CHANNEL_ID, message_id: pinnedId, text });
      return;
    } catch {
      // If pinned message isn't the index (e.g. first run), fall through to create
    }
  }

  // Create a new index message and pin it
  const msg = await tg('sendMessage', { chat_id: CHANNEL_ID, text, disable_notification: true }) as { message_id: number };
  await tg('pinChatMessage', { chat_id: CHANNEL_ID, message_id: msg.message_id, disable_notification: true });
}

// ── Public API ───────────────────────────────────────────────

/** List all quizzes (metadata only, instant). */
export async function listQuizzes(): Promise<QuizMeta[]> {
  const list = await readIndex();
  return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Save a new quiz. Returns the saved QuizMeta. */
export async function saveQuiz(
  title: string,
  description: string,
  htmlContent: string,
  questionCount: number,
): Promise<QuizMeta> {
  // Upload HTML as a document
  const form = new FormData();
  form.append('chat_id', CHANNEL_ID);
  form.append('disable_notification', 'true');
  const safeName = title.replace(/[^a-zA-Z0-9\-_]/g, '_');
  const blob = new Blob([htmlContent], { type: 'text/html' });
  form.append('document', blob, `${safeName}.html`);
  form.append('caption', `📚 ${title}\n${description}\n(${questionCount} questions)`);

  const docRes = await fetch(`${BASE}/sendDocument`, { method: 'POST', body: form });
  const docJson = await docRes.json() as {
    ok: boolean;
    result: { message_id: number; document: { file_id: string; file_size?: number } };
    description?: string;
  };
  if (!docJson.ok) throw new Error(`[Telegram] sendDocument: ${docJson.description}`);

  const { message_id, document: doc } = docJson.result;

  const meta: QuizMeta = {
    id: String(message_id),
    file_id: doc.file_id,
    title,
    description,
    question_count: questionCount,
    file_size: doc.file_size ?? htmlContent.length,
    created_at: new Date().toISOString(),
  };

  // Update index
  const existing = await readIndex();
  await writeIndex([...existing, meta]);

  return meta;
}

/** Download and return the HTML content of a quiz. */
export async function getQuizHtml(fileId: string): Promise<string> {
  // Get download URL from Telegram
  const fileInfo = await tg('getFile', { file_id: fileId }) as { file_path: string };
  const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error('Failed to download quiz HTML from Telegram');
  return res.text();
}

/** Delete a quiz by its id (message_id). */
export async function deleteQuiz(id: string): Promise<void> {
  // Delete the document message from Telegram
  await tg('deleteMessage', { chat_id: CHANNEL_ID, message_id: Number(id) }).catch(() => {});

  // Remove from index
  const existing = await readIndex();
  await writeIndex(existing.filter(q => q.id !== id));
}

/** Validate that bot token + channel id are configured and working. */
export async function validateConfig(): Promise<{ ok: boolean; error?: string }> {
  if (!BOT_TOKEN || BOT_TOKEN === 'undefined') {
    return { ok: false, error: 'VITE_TELEGRAM_BOT_TOKEN is not set' };
  }
  if (!CHANNEL_ID || CHANNEL_ID === 'undefined') {
    return { ok: false, error: 'VITE_TELEGRAM_CHANNEL_ID is not set' };
  }
  try {
    await tg('getMe');
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
