# EMA ARTBUILD — configuration production

Le frontend et ses deux API sont déployés par Netlify. Les routes publiques restent sur le même domaine :

- `POST /api/quote-requests` : envoie le devis par Resend.
- `POST /api/assistant/chat` : diffuse la réponse de l’assistant.

La clé n’est jamais transmise au navigateur et ne doit jamais être ajoutée au dépôt.

## Variables Netlify requises

Ajoutez ces variables dans **Netlify → Site configuration → Environment variables**, avec les scopes **Functions** (et Production) :

| Variable | Valeur attendue |
| --- | --- |
| `RESEND_API_KEY` | clé API Resend |
| `SENDER_EMAIL` | adresse expéditrice vérifiée dans Resend, par exemple `EMA ARTBUILD <contact@emaartbuild.com>` |
| `QUOTE_RECIPIENT_EMAIL` | `contact@emaartbuild.com` |
| `OPENAI_API_KEY` | clé API OpenAI côté serveur |
| `OPENAI_MODEL` | identifiant d’un modèle API disponible sur ce compte |

Après avoir enregistré les variables, lancez **Trigger deploy → Deploy site**. Les variables React `REACT_APP_BACKEND_URL`, MongoDB et `EMERGENT_LLM_KEY` ne sont plus nécessaires pour le site Netlify.

## Vérification après déploiement

1. Envoyez un devis sans pièce jointe, puis avec une pièce jointe valide.
2. Vérifiez la réception à `contact@emaartbuild.com` et que « Reply-To » est l’email du visiteur.
3. Ouvrez l’assistant, envoyez un message en français, puis une question en anglais ou arabe.
4. Dans Netlify Functions, vérifiez l’absence d’erreur pour `quote-requests` et `assistant-chat`.

Les fichiers acceptés sont JPG, PNG, WEBP et PDF, limités à 4 Mo au total par demande (limite de charge utile Netlify).
