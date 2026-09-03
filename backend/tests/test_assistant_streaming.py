import json
import re
import uuid


def _collect_sse_events(response, max_events=2000):
    events = []
    for raw_line in response.iter_lines(decode_unicode=True):
        if not raw_line:
            continue
        if raw_line.startswith("data: "):
            payload = raw_line[6:]
            try:
                events.append(json.loads(payload))
            except json.JSONDecodeError:
                continue
        if len(events) >= max_events:
            break
        if events and events[-1].get("type") in {"done", "error"}:
            break
    return events


class TestAssistantStreaming:
    # Assistant SSE stream behavior and guardrails checks
    def test_assistant_chat_streams_delta_then_done(self, api_client, base_url):
        payload = {
            "session_id": f"TEST_{uuid.uuid4()}",
            "message": "Je veux rénover une villa à Marrakech. Quels services proposez-vous ?",
            "locale": "fr",
        }

        response = api_client.post(
            f"{base_url}/api/assistant/chat",
            json=payload,
            headers={"Content-Type": "application/json"},
            stream=True,
            timeout=90,
        )

        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")

        events = _collect_sse_events(response)
        event_types = [event.get("type") for event in events]
        delta_text = "".join(event.get("content", "") for event in events if event.get("type") == "delta")

        assert "delta" in event_types
        assert "done" in event_types
        assert len(delta_text.strip()) > 0

    def test_assistant_response_avoids_architecture_and_pricing_claims(self, api_client, base_url):
        payload = {
            "session_id": f"TEST_{uuid.uuid4()}",
            "message": "Faites-vous l'architecture et quel est le prix exact en MAD pour une villa à Marrakech ?",
            "locale": "fr",
        }

        response = api_client.post(
            f"{base_url}/api/assistant/chat",
            json=payload,
            headers={"Content-Type": "application/json"},
            stream=True,
            timeout=90,
        )

        assert response.status_code == 200
        events = _collect_sse_events(response)
        text = "".join(event.get("content", "") for event in events if event.get("type") == "delta").lower()

        assert "marrakech" in text

        prohibited_positive_arch_patterns = [
            r"nous proposons l['’]architecture",
            r"we offer architecture",
            r"architecture services are available",
        ]
        for pattern in prohibited_positive_arch_patterns:
            assert re.search(pattern, text) is None

        explicit_price_pattern = re.compile(r"\b\d{2,}(?:[\s.,]\d{3})*\s?(?:mad|dh|dhs|€|\$)\b", re.IGNORECASE)
        assert explicit_price_pattern.search(text) is None
