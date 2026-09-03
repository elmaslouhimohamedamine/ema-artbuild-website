import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, MessageCircle, Send, Sparkles, X } from "lucide-react";

const copy = {
  fr: { greeting: "Bonjour, je suis EMA. Je peux vous aider à préciser votre projet et répondre à vos questions.", title: "Parlons de votre espace.", subtitle: "Un premier échange pour orienter votre projet.", placeholder: "Décrivez votre projet…", send: "Envoyer", quote: "Demander un devis", prompts: ["Je souhaite rénover une villa", "Quels services proposez-vous ?", "Intervenez-vous à Marrakech ?"] },
  en: { greeting: "Hello, I’m EMA. I can help clarify your project and answer your questions.", title: "Let’s discuss your space.", subtitle: "A first conversation to guide your project.", placeholder: "Tell us about your project…", send: "Send", quote: "Request a quote", prompts: ["I want to renovate a villa", "What services do you offer?", "Do you work in Marrakech?"] },
  ar: { greeting: "مرحباً، أنا إيما. يمكنني مساعدتكم في توضيح مشروعكم والإجابة عن أسئلتكم.", title: "لنتحدث عن مساحتكم.", subtitle: "محادثة أولى لتوجيه مشروعكم.", placeholder: "أخبرنا عن مشروعكم…", send: "إرسال", quote: "اطلب عرضاً", prompts: ["أرغب في تجديد فيلا", "ما هي خدماتكم؟", "هل تعملون في مراكش؟"] },
};

const getSessionId = () => {
  const key = "ema-artbuild-chat-session"; let session = localStorage.getItem(key);
  if (!session) { session = crypto.randomUUID(); localStorage.setItem(key, session); }
  return session;
};

export default function ChatAssistant({ locale, mode = "floating", onQuoteClick }) {
  const ui = copy[locale]; const [open, setOpen] = useState(mode === "embedded"); const [input, setInput] = useState("");
  const [messages, setMessages] = useState([{ role: "assistant", content: ui.greeting }]); const [loading, setLoading] = useState(false); const messagesRef = useRef(null);
  useEffect(() => { setMessages((current) => current.length === 1 ? [{ role: "assistant", content: ui.greeting }] : current); }, [locale, ui.greeting]);
  useEffect(() => { const container = messagesRef.current; if (container) container.scrollTop = container.scrollHeight; }, [messages, loading]);
  const ask = async (rawMessage) => {
    const text = rawMessage.trim(); if (!text || loading) return;
    setInput(""); setLoading(true); setMessages((current) => [...current, { role: "visitor", content: text }, { role: "assistant", content: "" }]);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/assistant/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: getSessionId(), message: text, locale }) });
      if (!response.ok || !response.body) throw new Error("Assistant unavailable");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { value, done } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n"); buffer = events.pop() || "";
        events.forEach((event) => { const line = event.split("\n").find((item) => item.startsWith("data: ")); if (!line) return; const data = JSON.parse(line.slice(6)); if (data.type === "error") throw new Error(data.message); if (data.type === "delta") setMessages((current) => current.map((message, index) => index === current.length - 1 ? { ...message, content: message.content + data.content } : message)); });
      }
    } catch (error) { setMessages((current) => current.map((message, index) => index === current.length - 1 ? { role: "assistant", content: "L’assistant est momentanément indisponible. Vous pouvez nous laisser votre demande de devis." } : message)); }
    finally { setLoading(false); }
  };
  const panel = <motion.section className={`assistant-panel ${mode}`} data-testid={`assistant-${mode}-panel`} initial={mode === "floating" ? { opacity: 0, y: 18, scale: .98 } : false} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .28 }}>
    <header><div className="assistant-title"><span><Sparkles size={13} /></span><div><p>EMA ARTBUILD</p><strong>{ui.title}</strong></div></div>{mode === "floating" && <button onClick={() => setOpen(false)} data-testid="assistant-floating-close" aria-label="Fermer l’assistant"><X size={17} /></button>}</header>
    <p className="assistant-subtitle" data-testid={`assistant-${mode}-subtitle`}>{ui.subtitle}</p>
    <div ref={messagesRef} className="assistant-messages" data-testid={`assistant-${mode}-messages`} aria-live="polite">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`assistant-message ${message.role}`} data-testid={`assistant-${mode}-message-${index}`}>{message.content || <span className="assistant-typing"><i /><i /><i /></span>}</div>)}</div>
    {messages.length < 3 && <div className="assistant-prompts" data-testid={`assistant-${mode}-prompts`}>{ui.prompts.map((prompt, index) => <button key={prompt} onClick={() => ask(prompt)} data-testid={`assistant-${mode}-prompt-${index}`}>{prompt}<ArrowUpRight size={12} /></button>)}</div>}
    <form className="assistant-input" onSubmit={(event) => { event.preventDefault(); ask(input); }}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder={ui.placeholder} data-testid={`assistant-${mode}-input`} maxLength="1400" aria-label={ui.placeholder} /><button type="submit" disabled={!input.trim() || loading} data-testid={`assistant-${mode}-send`} aria-label={ui.send}><Send size={15} /></button></form>
    <button className="assistant-quote" onClick={onQuoteClick} data-testid={`assistant-${mode}-quote-button`}>{ui.quote}<ArrowUpRight size={14} /></button>
  </motion.section>;
  if (mode === "embedded") return panel;
  return <aside className="assistant-floating" data-testid="assistant-floating"><AnimatePresence>{open && panel}</AnimatePresence><button className="assistant-trigger" onClick={() => setOpen(!open)} data-testid="assistant-floating-trigger" aria-expanded={open} aria-label="Ouvrir l’assistant EMA"><MessageCircle size={19} /><span>EMA</span></button></aside>;
}