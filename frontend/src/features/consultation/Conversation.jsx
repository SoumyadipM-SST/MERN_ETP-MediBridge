import { ArrowRight } from "lucide-react";

import { QueryState } from "../../components/ui.jsx";
import { useApp } from "../../hooks/useApp.js";
import { api } from "../../services/api.js";
import { date } from "../../utils/format.js";
function Conversation({ id, ended, messages }) {
  const { user, action, pending } = useApp();
  return (
    <section className="panel chat-panel">
      <h3>Conversation {ended ? "history" : ""}</h3>
      <QueryState query={messages}>
        {(items) =>
          items.length ? (
            <div className="messages" aria-live="polite">
              {items.map((m) => (
                <div
                  key={m._id}
                  className={`message ${m.sender === user._id ? "own" : ""}`}
                >
                  <span>
                    {m.name} · {date(m.createdAt)}
                  </span>
                  <p>{m.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">
              Send a message to the other participant in this consultation.
            </p>
          )
        }
      </QueryState>
      {!ended && (
        <form
          className="chat-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const result = await action(() =>
              api(`/consultations/${id}/messages`, {
                method: "POST",
                body: { body: form.message.value },
              }),
            );
            if (result) form.reset();
          }}
        >
          <input
            name="message"
            aria-label="Chat message"
            placeholder="Write a message…"
            required
            maxLength={2000}
          />
          <button className="btn small" aria-label="Send message" disabled={pending}>
            <ArrowRight size={19} />
          </button>
        </form>
      )}
    </section>
  );
}
export { Conversation };
