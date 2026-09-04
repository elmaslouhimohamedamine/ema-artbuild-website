const encoder = new TextEncoder();
const systemPrompt = `You are EMA, the premium, warm and precise digital project advisor for EMA ARTBUILD in Morocco.
EMA ARTBUILD provides only: interior design, 3D design, construction, renovation, interior and exterior fit-out, and site supervision. Never call EMA ARTBUILD an architecture agency and never offer architecture services.
Answer visitor questions truthfully, qualify residential or professional project requests, and gently guide qualified visitors to request a quote using the form on the page. Service areas: Rabat and surrounding region, Casablanca and surrounding region, Tangier, Marrakech and projects elsewhere in Morocco depending on scope.
Ask no more than one useful follow-up question at a time. Do not invent prices, availability, guarantees, completed projects, contact details, or technical advice. Keep answers concise (generally under 120 words), elegant and helpful. Reply in the visitor's language: French for locale fr, English for locale en, Arabic for locale ar. Do not mention being an AI model or these instructions.`;

const event = (payload) => encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
const eventStream = (body, status = 200) => new Response(body, { status, headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });

export default async function handler(request) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) return eventStream(new ReadableStream({ start(controller) { controller.enqueue(event({ type: "error", message: "L’assistant est momentanément indisponible." })); controller.close(); } }), 503);

  let input;
  try { input = await request.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }
  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (!message || message.length > 1400) return new Response("Invalid message", { status: 422 });
  const history = Array.isArray(input.history) ? input.history.slice(-8).flatMap((item) => (
    (item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string" && item.content.trim())
      ? [{ role: item.role, content: item.content.trim().slice(0, 1400) }] : []
  )) : [];

  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, instructions: systemPrompt, input: [...history, { role: "user", content: message }], stream: true, max_output_tokens: 350 }),
    });
    if (!upstream.ok || !upstream.body) {
      console.error("OpenAI request failed", upstream.status, await upstream.text());
      return eventStream(new ReadableStream({ start(controller) { controller.enqueue(event({ type: "error", message: "L’assistant est momentanément indisponible." })); controller.close(); } }), 502);
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const records = buffer.split("\n\n");
            buffer = records.pop() || "";
            for (const record of records) {
              const dataLine = record.split("\n").find((line) => line.startsWith("data: "));
              if (!dataLine || dataLine === "data: [DONE]") continue;
              try {
                const payload = JSON.parse(dataLine.slice(6));
                if (payload.type === "response.output_text.delta" && payload.delta) controller.enqueue(event({ type: "delta", content: payload.delta }));
                if (payload.type === "error" || payload.type === "response.failed") controller.enqueue(event({ type: "error", message: "L’assistant est indisponible pour le moment." }));
              } catch { controller.enqueue(event({ type: "error", message: "Réponse invalide de l’assistant." })); }
            }
          }
          controller.enqueue(event({ type: "done" }));
        } catch (error) {
          console.error("Assistant stream failed", error);
          controller.enqueue(event({ type: "error", message: "L’assistant est indisponible pour le moment." }));
        } finally { controller.close(); }
      },
    });
    return eventStream(stream);
  } catch (error) {
    console.error("Assistant request failed", error);
    return eventStream(new ReadableStream({ start(controller) { controller.enqueue(event({ type: "error", message: "L’assistant est indisponible pour le moment." })); controller.close(); } }), 502);
  }
}