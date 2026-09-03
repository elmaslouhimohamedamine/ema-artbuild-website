# EMA ARTBUILD — PRD

## Demande originale
Créer une landing page premium, visuelle et multilingue pour EMA ARTBUILD, orientée design intérieur, conception 3D, construction, rénovation, aménagement et suivi de chantier au Maroc. Le site ne doit jamais présenter le service Architecture ni inclure de champ Surface. Objectif principal : générer des demandes de devis qualifiées.

## Décisions d’architecture
- React + Framer Motion + Lenis pour la page one-page et ses animations éditoriales.
- FastAPI + MongoDB pour la réception et la traçabilité des demandes de devis.
- Resend côté serveur pour l’envoi email avec pièces jointes ; paramètres destinataire/expéditeur configurés sur contact@emaartbuild.com.
- Assets locaux remplaçables dans frontend/public/images et vidéo attendue dans frontend/public/videos/hero.mp4.

## Réalisé
- Landing complète FR/EN/AR avec RTL arabe, navigation responsive et menu mobile.
- Hero cinématique avec fallback image, reveal typographique, parallax subtil, galerie, marquée lente, sections services, méthode, preuves, contact et footer.
- Liens Instagram Reels exacts, téléphone +212 666 777 456, WhatsApp +212 666 777 446, email et liens Instagram/Facebook/TikTok/Behance.
- Formulaire validé sans champ Surface, acceptant JPG/PNG/WEBP/PDF, avec stockage de la demande après acceptation d’envoi Resend.
- SEO de base : title, meta description, Open Graph, favicon, robots.txt et sitemap.xml.
- Tests automatisés et parcours navigateur validés ; compilation frontend validée.

## Backlog priorisé
### P0
- Ajouter RESEND_API_KEY dans backend/.env pour activer l’envoi réel des demandes.
- Déposer la vidéo finale optimisée dans frontend/public/videos/hero.mp4.
### P1
- Remplacer les images de démonstration par les réalisations EMA ARTBUILD.
- Ajouter la traduction complète, y compris champs et descriptions, pour EN/AR.
### P2
- Ajouter des pages individuelles de réalisations et une gestion éditoriale des projets.

## État actuel
Le site et tous les liens publics sont fonctionnels. L’envoi Resend retourne volontairement une erreur explicite tant que RESEND_API_KEY n’a pas été fourni, sans confirmation trompeuse.
