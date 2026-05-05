// ============================================================
// AirBook – Telegram Storage Backend
// ============================================================

const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string;
const CHANNEL_ID = import.meta.env.VITE_TELEGRAM_CHANNEL_ID as string;
const BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ── Types ─────────────────────────────────────────────────────

export interface QuizMeta {
  id: string;
  file_id: string;
  title: string;
  description: string;
  question_count: number;
  file_size: number;
  created_at: string;
  duration_minutes?: number;
  subject?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
}

export interface StudentAccount {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
  avatar_color: string;
}

export interface QuizAttempt {
  id: string;
  student_id: string;
  quiz_id: string;
  quiz_title: string;
  score: number;
  total_marks: number;
  correct: number;
  wrong: number;
  skipped: number;
  time_taken_seconds: number;
  attempted_at: string;
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

// ── Local-first store (with Telegram backup) ──────────────────
// localStorage is the primary read source for student data.
// Every write is also sent to Telegram as a backup message.

const USERS_MARKER   = 'AIRBOOK_USERS_V1';
const ATTEMPTS_MARKER = 'AIRBOOK_ATTEMPTS_V1';

function localKey(marker: string) { return `airbook_data_${marker}`; }
function tgMsgKey(marker: string) { return `airbook_tgmsg_${marker}`; }

async function readStore<T>(marker: string): Promise<T[]> {
  try {
    const raw = localStorage.getItem(localKey(marker));
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

async function writeStore<T>(marker: string, data: T[]): Promise<void> {
  // 1. Write locally (always)
  localStorage.setItem(localKey(marker), JSON.stringify(data));

  // 2. Backup to Telegram in background
  if (!BOT_TOKEN || BOT_TOKEN === 'undefined' || !CHANNEL_ID || CHANNEL_ID === 'undefined') return;
  const text = marker + '\n' + JSON.stringify(data);
  const msgIdKey = tgMsgKey(marker);
  const cached = localStorage.getItem(msgIdKey);
  try {
    if (cached) {
      await tg('editMessageText', { chat_id: CHANNEL_ID, message_id: Number(cached), text });
    } else {
      const msg = await tg('sendMessage', {
        chat_id: CHANNEL_ID, text, disable_notification: true,
      }) as { message_id: number };
      localStorage.setItem(msgIdKey, String(msg.message_id));
    }
  } catch {
    // Edit failed (message too old / deleted) — send fresh
    localStorage.removeItem(msgIdKey);
    try {
      const msg = await tg('sendMessage', {
        chat_id: CHANNEL_ID, text, disable_notification: true,
      }) as { message_id: number };
      localStorage.setItem(msgIdKey, String(msg.message_id));
    } catch { /* silent — local data is still safe */ }
  }
}

// ── Quiz Index (pinned message) ───────────────────────────────

const INDEX_HEADER = 'AIRBOOK_INDEX_V1\n';

async function readIndex(): Promise<QuizMeta[]> {
  try {
    const chat = await tg('getChat', { chat_id: CHANNEL_ID }) as { pinned_message?: { text?: string } };
    const text = chat?.pinned_message?.text ?? '';
    if (!text.startsWith(INDEX_HEADER)) return [];
    return JSON.parse(text.slice(INDEX_HEADER.length)) as QuizMeta[];
  } catch { return []; }
}

async function writeIndex(quizzes: QuizMeta[]): Promise<void> {
  const text = INDEX_HEADER + JSON.stringify(quizzes);
  const chat = await tg('getChat', { chat_id: CHANNEL_ID }) as { pinned_message?: { message_id?: number } };
  const pinnedId = chat?.pinned_message?.message_id;
  if (pinnedId) {
    try { await tg('editMessageText', { chat_id: CHANNEL_ID, message_id: pinnedId, text }); return; }
    catch {}
  }
  const msg = await tg('sendMessage', { chat_id: CHANNEL_ID, text, disable_notification: true }) as { message_id: number };
  await tg('pinChatMessage', { chat_id: CHANNEL_ID, message_id: msg.message_id, disable_notification: true });
}

// ── Public Quiz API ───────────────────────────────────────────

export async function listQuizzes(): Promise<QuizMeta[]> {
  const list = await readIndex();
  return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function saveQuiz(
  title: string,
  description: string,
  htmlContent: string,
  questionCount: number,
  extra?: Partial<Pick<QuizMeta, 'duration_minutes' | 'subject' | 'difficulty'>>,
): Promise<QuizMeta> {
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
    id: String(message_id), file_id: doc.file_id, title, description,
    question_count: questionCount,
    file_size: doc.file_size ?? htmlContent.length,
    created_at: new Date().toISOString(),
    ...(extra || {}),
  };
  const existing = await readIndex();
  await writeIndex([...existing, meta]);
  return meta;
}

export async function getQuizHtml(fileId: string): Promise<string> {
  const fileInfo = await tg('getFile', { file_id: fileId }) as { file_path: string };
  const res = await fetch(`/api/telegram-file?path=${encodeURIComponent(fileInfo.file_path)}`);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to download quiz (${res.status})${body ? ': ' + body : ''}`);
  }
  return res.text();
}

export async function deleteQuiz(id: string): Promise<void> {
  await tg('deleteMessage', { chat_id: CHANNEL_ID, message_id: Number(id) }).catch(() => {});
  const existing = await readIndex();
  await writeIndex(existing.filter(q => q.id !== id));
}

export async function uploadImage(file: File): Promise<string> {
  const base64DataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
  const form = new FormData();
  form.append('chat_id', CHANNEL_ID);
  form.append('disable_notification', 'true');
  form.append('photo', file, file.name);
  fetch(`${BASE}/sendPhoto`, { method: 'POST', body: form }).catch(() => {});
  return base64DataUrl;
}

export async function validateConfig(): Promise<{ ok: boolean; error?: string }> {
  if (!BOT_TOKEN || BOT_TOKEN === 'undefined') return { ok: false, error: 'VITE_TELEGRAM_BOT_TOKEN is not set' };
  if (!CHANNEL_ID || CHANNEL_ID === 'undefined') return { ok: false, error: 'VITE_TELEGRAM_CHANNEL_ID is not set' };
  try { await tg('getMe'); return { ok: true }; }
  catch (e: unknown) { return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }; }
}

// ── Student Account API ───────────────────────────────────────

function simpleHash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f59e0b','#10b981','#06b6d4','#3b82f6'];

export async function registerStudent(
  name: string, email: string, password: string,
): Promise<{ student?: StudentAccount; error?: string }> {
  const existing = await readStore<StudentAccount>(USERS_MARKER);
  if (existing.find(s => s.email.toLowerCase() === email.toLowerCase())) {
    return { error: 'An account with this email already exists.' };
  }
  const student: StudentAccount = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password_hash: simpleHash(password),
    created_at: new Date().toISOString(),
    avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  };
  await writeStore(USERS_MARKER, [...existing, student]);
  return { student };
}

export async function loginStudent(
  email: string, password: string,
): Promise<{ student?: StudentAccount; error?: string }> {
  const existing = await readStore<StudentAccount>(USERS_MARKER);
  const student = existing.find(
    s => s.email.toLowerCase() === email.toLowerCase() && s.password_hash === simpleHash(password),
  );
  if (!student) return { error: 'Invalid email or password.' };
  return { student };
}

export async function getAllStudents(): Promise<StudentAccount[]> {
  return readStore<StudentAccount>(USERS_MARKER);
}

// ── Quiz Attempts API ─────────────────────────────────────────

export async function saveAttempt(
  attempt: Omit<QuizAttempt, 'id' | 'attempted_at'>,
): Promise<QuizAttempt> {
  const existing = await readStore<QuizAttempt>(ATTEMPTS_MARKER);
  const full: QuizAttempt = { ...attempt, id: crypto.randomUUID(), attempted_at: new Date().toISOString() };
  await writeStore(ATTEMPTS_MARKER, [...existing, full]);
  return full;
}

export async function getStudentAttempts(studentId: string): Promise<QuizAttempt[]> {
  const all = await readStore<QuizAttempt>(ATTEMPTS_MARKER);
  return all.filter(a => a.student_id === studentId).sort((a, b) => b.attempted_at.localeCompare(a.attempted_at));
}

export async function getAllAttempts(): Promise<QuizAttempt[]> {
  return readStore<QuizAttempt>(ATTEMPTS_MARKER);
}
