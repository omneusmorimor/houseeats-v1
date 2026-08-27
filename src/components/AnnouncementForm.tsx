import React, { useState } from "react";
import { MESSAGE_MAX, TITLE_MAX, sendMemberAnnouncement } from "../lib/meals";

type Props = { heading: string };

/** Title + message announcement composer shared by the Chef and Admin workspaces. */
export default function AnnouncementForm({ heading }: Props) {
  const [title, setTitle] = useState(""),
    [message, setMessage] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  async function send() {
    if (busy) return;
    setBusy(true);
    setStatus("");
    const result = await sendMemberAnnouncement(title, message);
    setStatus(result.status);
    if (result.sent) {
      setTitle("");
      setMessage("");
    }
    setBusy(false);
  }
  return (
    <>
      <h2>{heading}</h2>
      <p>Send an announcement to all Members.</p>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title" maxLength={TITLE_MAX} />
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Message for Members"
        rows={5}
        maxLength={MESSAGE_MAX}
      />
      <button onClick={send} disabled={busy}>
        {busy ? "Sending…" : "Send notification"}
      </button>
      {status && <div className="message">{status}</div>}
    </>
  );
}
