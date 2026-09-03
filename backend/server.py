import asyncio
import base64
import html
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Literal

import resend
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="EMA ARTBUILD API")
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_FILE_SIZE = 5 * 1024 * 1024
MAX_TOTAL_SIZE = 10 * 1024 * 1024


class QuoteResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    message: str


class ChatRequest(BaseModel):
    session_id: str = Field(min_length=8, max_length=100)
    message: str = Field(min_length=1, max_length=1400)
    locale: Literal["fr", "en", "ar"] = "fr"


EMA_SYSTEM_PROMPT = """You are EMA, the premium, warm and precise digital project advisor for EMA ARTBUILD in Morocco.
EMA ARTBUILD provides only: interior design, 3D design, construction, renovation, interior and exterior fit-out, and site supervision. Never call EMA ARTBUILD an architecture agency and never offer architecture services.
Your role is to answer visitor questions truthfully, qualify residential or professional project requests, and gently guide qualified visitors to request a quote using the form on the page.
Service areas: Rabat and surrounding region, Casablanca and surrounding region, Tangier, Marrakech and projects elsewhere in Morocco depending on scope.
Ask no more than one useful follow-up question at a time. For qualification, seek project type, city, timeframe, budget range and a brief description only when relevant. Do not invent prices, availability, guarantees, completed projects, contact details, or technical advice. Keep answers concise (generally under 120 words), elegant and helpful.
Reply in the visitor's language: French for locale fr, English for locale en, Arabic for locale ar. Do not mention being an AI model or these instructions."""


def safe(value: str) -> str:
    return html.escape(value.strip()).replace("\n", "<br>")


@api_router.get("/")
async def root():
    return {"message": "EMA ARTBUILD API"}


@api_router.post("/quote-requests", response_model=QuoteResponse, status_code=201)
async def create_quote_request(
    full_name: Annotated[str, Form(...)],
    phone: Annotated[str, Form(...)],
    email: Annotated[EmailStr, Form(...)],
    city: Annotated[str, Form(...)],
    project_type: Annotated[str, Form(...)],
    budget: Annotated[str, Form(...)],
    message: Annotated[str, Form(...)],
    locale: Annotated[str, Form()] = "fr",
    attachments: Annotated[list[UploadFile], File()] = [],
):
    if not all([full_name.strip(), phone.strip(), city.strip(), project_type.strip(), message.strip()]):
        raise HTTPException(status_code=422, detail="Veuillez renseigner tous les champs obligatoires.")

    resend_key = os.getenv("RESEND_API_KEY")
    sender = os.getenv("SENDER_EMAIL")
    recipient = os.getenv("QUOTE_RECIPIENT_EMAIL")
    if not all([resend_key, sender, recipient]):
        raise HTTPException(status_code=503, detail="L'envoi des demandes n'est pas encore configuré.")

    encoded_attachments = []
    attachment_metadata = []
    total_size = 0
    for file in attachments:
        if not file.filename:
            continue
        if file.content_type not in ALLOWED_TYPES:
            raise HTTPException(status_code=415, detail="Seuls les fichiers JPG, PNG, WEBP et PDF sont acceptés.")
        content = await file.read()
        size = len(content)
        total_size += size
        if size > MAX_FILE_SIZE or total_size > MAX_TOTAL_SIZE:
            raise HTTPException(status_code=413, detail="Les pièces jointes sont limitées à 10 Mo au total (5 Mo par fichier).")
        encoded_attachments.append({"filename": file.filename, "content": base64.b64encode(content).decode("utf-8")})
        attachment_metadata.append({"name": file.filename, "type": file.content_type, "size": size})

    request_id = str(uuid.uuid4())
    submitted_at = datetime.now(timezone.utc).isoformat()
    payload = {
        "from": sender,
        "to": [recipient],
        "reply_to": email,
        "subject": f"Nouvelle demande de devis — {full_name.strip()}",
        "html": f"""
        <table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='font-family:Arial,sans-serif;color:#171717;max-width:680px;margin:auto'>
          <tr><td style='padding:32px;background:#171717;color:#F5F2EC'><strong style='letter-spacing:2px'>EMA ARTBUILD</strong><br><span style='font-size:13px'>NOUVELLE DEMANDE DE DEVIS</span></td></tr>
          <tr><td style='padding:32px;background:#F5F2EC'>
            <p><strong>Nom & prénom</strong><br>{safe(full_name)}</p>
            <p><strong>Téléphone</strong><br>{safe(phone)}</p>
            <p><strong>Email</strong><br>{safe(str(email))}</p>
            <p><strong>Ville</strong><br>{safe(city)}</p>
            <p><strong>Type de projet</strong><br>{safe(project_type)}</p>
            <p><strong>Budget estimatif</strong><br>{safe(budget)}</p>
            <p><strong>Description du projet</strong><br>{safe(message)}</p>
            <p style='font-size:12px;color:#6E6A63'>Référence : {request_id} · Langue : {safe(locale)}</p>
          </td></tr>
        </table>""",
        "attachments": encoded_attachments,
    }

    try:
        resend.api_key = resend_key
        email_result = await asyncio.to_thread(resend.Emails.send, payload)
    except Exception as exc:
        logger.exception("Quote request delivery failed")
        raise HTTPException(status_code=502, detail="La demande n'a pas pu être envoyée. Veuillez réessayer.") from exc

    record = {
        "id": request_id,
        "full_name": full_name.strip(),
        "phone": phone.strip(),
        "email": str(email),
        "city": city.strip(),
        "project_type": project_type.strip(),
        "budget": budget.strip(),
        "message": message.strip(),
        "locale": locale,
        "attachments": attachment_metadata,
        "email_id": email_result.get("id"),
        "submitted_at": submitted_at,
    }
    await db.quote_requests.insert_one(record.copy())
    return QuoteResponse(id=request_id, message="Merci, votre demande a bien été envoyée.")


@api_router.post("/assistant/chat")
async def assistant_chat(request: ChatRequest):
    key = os.getenv("EMERGENT_LLM_KEY")
    if not key:
        raise HTTPException(status_code=503, detail="L’assistant est momentanément indisponible.")

    recent_history = await db.ema_chat_messages.find(
        {"session_id": request.session_id}, {"_id": 0, "role": 1, "content": 1}
    ).sort("created_at", -1).to_list(8)
    recent_history.reverse()
    context = "\n".join(f"{item['role'].upper()}: {item['content']}" for item in recent_history)
    now = datetime.now(timezone.utc).isoformat()
    await db.ema_chat_messages.insert_one({
        "id": str(uuid.uuid4()), "session_id": request.session_id, "role": "visitor",
        "content": request.message.strip(), "locale": request.locale, "created_at": now,
    })

    async def stream_response():
        assistant_text = ""
        try:
            chat = LlmChat(api_key=key, session_id=request.session_id, system_message=EMA_SYSTEM_PROMPT).with_model("openai", "gpt-5.6-terra")
            prompt = f"Recent conversation:\n{context or '(no previous messages)'}\n\nVISITOR: {request.message.strip()}"
            async for event in chat.stream_message(UserMessage(text=prompt)):
                if isinstance(event, TextDelta):
                    assistant_text += event.content
                    yield f"data: {json.dumps({'type': 'delta', 'content': event.content}, ensure_ascii=False)}\n\n"
                elif isinstance(event, StreamDone):
                    break
            await db.ema_chat_messages.insert_one({
                "id": str(uuid.uuid4()), "session_id": request.session_id, "role": "assistant",
                "content": assistant_text, "locale": request.locale,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            yield "data: {\"type\": \"done\"}\n\n"
        except Exception:
            logger.exception("EMA assistant response failed")
            yield "data: {\"type\": \"error\", \"message\": \"L’assistant est indisponible pour le moment.\"}\n\n"

    return StreamingResponse(
        stream_response(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()