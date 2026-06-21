# Price_Breaker_app
Application web de e-commerce d'accessoires électroniques.

---

## Rapport de Mise à Jour (À destination de l'équipe technique)

Cette section résume les améliorations architecturales et fonctionnelles récemment déployées sur l'application.

### 1. Gestion Intelligente des Stocks
- **Indicateurs visuels** : Ajout de badges automatiques sur les produits en fonction du stock ("En Rupture" ou "Stock Faible").
- **Sécurité des achats** : Impossibilité pour un client d'ajouter au panier ou de commander un produit dont le stock est tombé à 0.

### 2.  Système de Tarification Dégressive (Achats de gros)
- Implémentation d'un algorithme de réductions par paliers de volume :
  - **-5%** à partir de 5 articles identiques.
  - **-8%** à partir de 10 articles.
  - **-12%** à partir de 20 articles.
- **Contrôle des marges (Admin)** : Ajout d'une option de sécurité "Autoriser la remise" lors de l'ajout d'un produit. Si la marge est trop faible, l'admin peut empêcher l'application de la règle de réduction.

### 3. Refonte UI du Comparateur de Prix
- Mise en valeur agressive des prix barrés et de l'économie réalisée par le client.
- Ajout d'un encart dynamique "Économie : XXX FCFA" pour inciter à l'achat et augmenter le taux de conversion.

### 4. Panneau de Configuration Globalisé
- **Panneau Admin unifié** : Nouvelle interface permettant de configurer l'URL Google Maps de la boutique et le numéro de téléphone principal sans toucher au code.
- **Synchronisation en temps réel** : La modification de ces paramètres se répercute instantanément sur tout le site (bandeau supérieur, pied de page, boutons de contact).
- **Travail en équipe** : L'authentification par "Token JWT" permet désormais à plusieurs administrateurs de se connecter simultanément (gestion des stocks, commandes) sans conflit ni déconnexion.
- Intégration des mentions légales RGPD.

### 5. Architecture Base de Données Hybride & Déploiement Render
- Afin d'héberger le projet gratuitement sur le cloud (Render) sans perdre les données utilisateurs, le backend a été migré sur une architecture **Hybride**. 
  - **En mode Développement (Local)** : Utilisation de **SQLite** (`database.sqlite`) pour garantir un environnement de test simple, sans nécessiter l'installation de serveurs lourds sur les machines de l'équipe.
  - **En mode Production (Render)** : Détection de la variable `DATABASE_URL`. Le code bascule nativement sous **PostgreSQL**. Un moteur de traduction a été écrit pour convertir à la volée la syntaxe SQLite (ex: `AUTOINCREMENT`) en syntaxe Postgres (`SERIAL`).
- Déploiement automatisé validé sur Render.com.
