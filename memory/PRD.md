# EMA ARTBUILD — PRD

## Demande originale
Créer une landing page premium, visuelle et multilingue pour EMA ARTBUILD, orientée design intérieur, conception 3D, construction, rénovation, aménagement et suivi de chantier au Maroc. Ne jamais présenter le service Architecture ni ajouter de champ Surface. Objectif principal : générer des demandes de devis qualifiées.

## Décisions d’architecture
- React + Framer Motion + Lenis pour la landing page one-page et ses animations éditoriales.
- FastAPI + MongoDB pour les demandes de devis et l’historique persistant des échanges assistant.
- GPT-5.6 Terra via Emergent LLM Key, réponses SSE en streaming et garde-fous sur les services EMA ARTBUILD.
- Hero vidéo utilisateur : WebM léger en priorité, MP4 H.264 de secours et poster extrait du clip, tous dans frontend/public.

## Réalisé
- Landing complète FR/EN/AR avec RTL arabe et navigation responsive simplifiée : Accueil, Services, Réalisations, Notre approche et Contact.
- Hero vidéo cinématique utilisateur, lecture automatique validée sur mobile, cadrage cover sans déformation et poster de secours.
- Assistant EMA avec GPT-5.6 Terra : chat flottant partout sur le site et assistant intégré à côté du formulaire de devis.
- Logo EMA ARTBUILD intégré au header, footer et animation circulaire, avec placement mobile distinct sans chevauchement.
- La section À propos a été retirée, ainsi que le bloc titre/texte de contact : la section finale va désormais directement à l’assistant et au formulaire.
- Services en beige pierre #D8D1C5 ; zone affichée : Marrakech sans “& région”.
- Coordonnées : +212 666 777 456 et +212 666 777 446 sous Téléphone. WhatsApp dirige vers +212 666 777 456.
- Formulaire sans Surface, avec JPG/PNG/WEBP/PDF, validation et traçabilité après envoi Resend.

## Validation
- Build React validé.
- Tests backend/front-end : streaming assistant, vidéo hero et responsive mobile validés.
- La suppression des sections et des liens correspondants est validée dans le navigateur.

## Backlog priorisé
### P0
- Ajouter RESEND_API_KEY dans backend/.env pour activer la livraison réelle des demandes de devis.
### P1
- Remplacer les images de démonstration par les réalisations EMA ARTBUILD.
- Finaliser toutes les traductions éditoriales en anglais et arabe.
### P2
- Ajouter des pages individuelles de réalisations et une gestion éditoriale des projets.

## État actuel
Le site, la vidéo et l’assistant conversationnel sont fonctionnels. L’envoi Resend retourne volontairement une erreur explicite tant que RESEND_API_KEY n’a pas été fourni, sans confirmation trompeuse.
