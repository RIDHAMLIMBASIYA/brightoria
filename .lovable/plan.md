
<context>
You’re seeing the AI chat reply in another language (French) because the AI model often mirrors the user’s input language automatically. Right now, our backend chat function (`ai-tutor-rag`) does not force a response language, so if a user writes French, the model may answer in French.

You selected: “Always English”.
</context>

<goal>
Make all AI chat responses (Doubt Bot + AI Tutor + Notes chat) always return in English, even when the user writes in another language.
</goal>

<approach>
We will enforce English at the backend prompt level (recommended), so it applies consistently to every client and cannot be bypassed by frontend changes.

Why backend:
- The chat UI already uses English labels (“Thinking…”, placeholders, etc.). The issue is the AI response language.
- The safest single source of truth is the backend system prompt.
</approach>

<implementation-steps>
1) Update the backend function prompt to force English
   - Edit: `supabase/functions/ai-tutor-rag/index.ts`
   - In the `systemPrompt` “Guidelines” section, add an explicit rule such as:
     - “Always respond in English. If the user asks in another language, respond in English.”
   - Make it strong and unambiguous, near the top of the guidelines so it has high priority.

2) (Optional but recommended) Add an additional “language lock” sentence near the end of the system prompt
   - This reduces the chance the model ignores it when context is long (RAG materials can be large).

3) Verify behavior in the app
   - Open `/doubt-bot` and ask in French, Arabic, etc.
   - Confirm the assistant answers in English.
   - Repeat on `/ai-tutor` (with a selected course/note) to confirm RAG answers remain English.

4) Regression checks
   - Ensure streaming still works (no changes to streaming code).
   - Ensure error handling (429/402/500) still returns correctly.
</implementation-steps>

<files-to-change>
- `supabase/functions/ai-tutor-rag/index.ts` (system prompt text only)
</files-to-change>

<acceptance-criteria>
- If a user writes “Explique moi…” or any non-English question, the assistant replies in English 100% of the time.
- No UI text changes are required; only AI output language changes.
- No impact on authentication, RAG retrieval, or streaming.
</acceptance-criteria>

<notes>
Later, if you ever want a real language setting (English/French/Spanish) tied to Settings, we can extend the backend to accept a “preferredLanguage” and store it in the database. For now, we’ll hard-lock to English as requested.
</notes>
