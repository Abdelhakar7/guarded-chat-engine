const { useEffect, useMemo, useRef, useState } = React;

// Local storage keys are centralized so updates stay consistent across all reads/writes.
const STORAGE_KEYS = {
  messages: "guarded_chat_messages_v1",
  template: "guarded_chat_template_v1",
  temperature: "guarded_chat_temperature_v1",
};

// User-facing mode labels map to backend template file names.
const MODE_OPTIONS = [
  { label: "Friendly", value: "task_spec" },
  { label: "Flirty", value: "flirty_spec" },
];

// Safe parser to prevent UI crashes when localStorage has malformed JSON.
function readJSON(key, fallbackValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

// Simple row component to keep render logic explicit and easy to maintain.
function MessageRow({ message }) {
  const isError = Boolean(message.isError);

  return (
    <div className={`message-row ${message.role}`}>
      <div className={`chat-bubble ${message.role}${isError ? " error" : ""}`}>
        {message.content}
      </div>
    </div>
  );
}

// Main chat application component using React functional patterns and hooks only.
function ChatApp() {
  // Messages initialize from localStorage so conversation survives page refreshes.
  const [messages, setMessages] = useState(() => readJSON(STORAGE_KEYS.messages, []));

  // Template persists so each request reuses the user-selected system prompt.
  const [template, setTemplate] = useState(() => localStorage.getItem(STORAGE_KEYS.template) || "task_spec");

  // Temperature persists so each request uses the current preference after refresh.
  const [temperature, setTemperature] = useState(() => {
    const value = Number(localStorage.getItem(STORAGE_KEYS.temperature));
    return Number.isFinite(value) ? Math.max(0, Math.min(2, value)) : 0.9;
  });

  // Input text is transient UI state and intentionally not persisted.
  const [draft, setDraft] = useState("");

  // Loading flag protects against duplicate sends while awaiting the backend reply.
  const [isSending, setIsSending] = useState(false);

  // Metadata from the last response is kept internally for potential future UI use.
  const [lastMeta, setLastMeta] = useState({ template_used: "-", refusal: false });

  // Ref to auto-scroll the chat window when new messages arrive.
  const scrollerRef = useRef(null);
  // Ref supports compact textarea auto-expansion as content grows.
  const textareaRef = useRef(null);

  // Persist message history on each change so the timeline survives refresh.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages));
  }, [messages]);

  // Persist selected template after each update.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.template, template);
  }, [template]);

  // Persist selected temperature after each update.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.temperature, String(temperature));
  }, [temperature]);

  // Keep chat pinned to bottom after updates for expected conversational scroll behavior.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isSending]);

  // Keep input single-line by default and expand slightly for longer text.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(Math.max(el.scrollHeight, 40), 132);
    el.style.height = `${next}px`;
  }, [draft]);

  // Derived lightweight payload history ensures API contract remains {role, content}.
  const payloadMessages = useMemo(
    () => messages.map((msg) => ({ role: msg.role, content: msg.content })),
    [messages]
  );

  // Clears local state and localStorage to reset memory, including after backend restarts.
  const clearConversation = () => {
    setMessages([]);
    setLastMeta({ template_used: "-", refusal: false });
    localStorage.removeItem(STORAGE_KEYS.messages);
  };

  // Handles chat submission by sending the full conversation context with template and temperature.
  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || isSending) return;

    // Build the next local message list first so UI and payload stay in sync.
    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setDraft("");
    setIsSending(true);

    try {
      // Send request exactly matching backend schema: messages + template + temperature.
      const response = await fetch("/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...payloadMessages, { role: "user", content: text }],
          template,
          temperature,
        }),
      });

      if (!response.ok) {
        const rawError = await response.text();
        throw new Error(`HTTP ${response.status}: ${rawError}`);
      }

      const data = await response.json();
      const reply = data?.reply || "";

      // Append assistant reply while preserving previously accumulated timeline.
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      // Preserve server metadata internally without exposing technical values in the UI.
      setLastMeta({
        template_used: data?.template_used ?? "-",
        refusal: Boolean(data?.refusal),
      });
    } catch (error) {
      // Surface transport/API errors as assistant bubbles so failures are visible in-chat.
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: String(error?.message || error),
          isError: true,
        },
      ]);
    } finally {
      // Release send lock whether request succeeds or fails.
      setIsSending(false);
    }
  };

  // Supports Enter-to-send while preserving Shift+Enter for multiline composition.
  const onInputKeyDown = async (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await sendMessage();
    }
  };

  return (
    <main className="chat-shell">
      <section className="chat-card">
        <header className="top-bar">
          <div className="brand-block">
            <span className="brand-title">Guarded Chat</span>
          </div>
          <div className="top-actions">
            <button type="button" className="btn btn-clear" onClick={clearConversation}>
              Clear
            </button>
          </div>
        </header>

        <section className="chat-scroller" ref={scrollerRef}>
          {messages.length === 0 ? (
            <div className="empty-state">Start chatting. History persists across refreshes.</div>
          ) : (
            messages.map((message, index) => (
              <MessageRow key={`${message.role}-${index}-${message.content.slice(0, 20)}`} message={message} />
            ))
          )}
        </section>

        <section className="composer-wrap">
          <div className="composer-row">
            <label className="mode-field" htmlFor="template-select">
              <span className="mode-label">Mode</span>
              <select
                id="template-select"
                className="select"
                value={template}
                onChange={(event) => setTemplate(event.target.value)}
              >
                {MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <textarea
              ref={textareaRef}
              className="textarea"
              value={draft}
              placeholder="Message Guarded Chat"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onInputKeyDown}
              disabled={isSending}
            />
            <button type="button" className="btn btn-send" onClick={sendMessage} disabled={isSending}>
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

// Mount once into the static root element served by FastAPI.
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ChatApp />);
