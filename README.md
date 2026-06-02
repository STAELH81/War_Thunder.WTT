# WTT Patch Notes

Petit outil web pour générer des patch notes à partir des exports JSON de [War Thunder Wiki Tools (WTT)](https://wiki.warthunder.com/wtt). Compare deux versions d'un arbre tech, documente une nouvelle nation, détecte les changements de BR, renommages, etc.

100 % côté navigateur — tes fichiers JSON ne quittent jamais ton PC.

---

## Démarrage rapide (Windows)

### Au quotidien
**Double-clique sur `start.bat`** — le navigateur s'ouvre sur [http://localhost:8080](http://localhost:8080). Ferme la fenêtre noire pour arrêter.

### Barre des tâches (une seule fois)

1. **Double-clique sur `creer-raccourci.bat`**
2. Un raccourci **WTT Patch Notes** apparaît sur le **Bureau** (avec ton icône `WTT.png`)
3. **Clic droit** sur ce raccourci → **Épingler à la barre des tâches**

Si « Épingler à la barre des tâches » n'apparaît pas :
1. Double-clique le raccourci (l'outil se lance)
2. **Clic droit** sur l'icône **WTT** dans la barre des tâches
3. **Épingler à la barre des tâches**
4. Tu peux ensuite retirer l'icône cmd temporaire si une deuxième s'est ajoutée

> Windows refuse d'épingler un `.bat` directement — d'où le raccourci avec icône custom.

### Prérequis

- **Python 3** (le plus simple) — [python.org](https://www.python.org/downloads/)  
  Ou **Node.js** en alternative :

```bash
npm start
```

Puis ouvre [http://localhost:8080](http://localhost:8080).

> Pourquoi un serveur local ? L'app utilise des modules JavaScript modernes ; ouvrir `index.html` directement (`file://`) ne marche pas dans la plupart des navigateurs.

---

## Utilisation

1. Lance l'outil (`start.bat` ou `npm start`).
2. **Comparaison** — glisse l'ancien et le nouveau JSON par nation (`usa.json` ↔ `usa.json`).
3. **Nouvelle branche** (optionnel) — glisse le JSON d'un pays entièrement nouveau.
4. Remplis **Version** / **Titre** si tu veux un en-tête du type `Update 3.0.11 / Mon titre`.
5. Clique **Générer le patch note**.
6. Ajuste les prix GE si demandé (premium, escadron, event, packs).
7. Onglet **Aperçu Wix** → **Copier** → coller sur ton blog.

Langue de sortie : sélecteur **FR / EN** en haut à droite. Thème clair / sombre : bouton lune / soleil.

---

## Ce que l'outil détecte

| Type | Exemple |
|------|---------|
| Véhicules ajoutés | Nouveau char au rang 6 |
| Changements de BR | `7.0 → 7.3` |
| Changements de rang | R5 → R6 |
| Renommages | Même ID, nom différent |
| Déplacements dans l'arbre | Parent (`follow`) ou rôle modifié |
| Retraits | Présent dans l'ancien, absent du nouveau |
| Packs premium | Chaînes liées par `follow` |

Les véhicules **recherchables** (état par défaut) n'affichent pas de tag. Seuls Premium, Event, Escadron et Réserve sont mentionnés.

---

## Structure du projet

```
├── index.html      # Page principale
├── start.bat       # Lancement Windows en un clic
├── css/style.css
└── js/
    ├── main.js     # Orchestration
    ├── tree.js     # Diff JSON / packs
    ├── format.js   # Texte final (style blog)
    ├── pricing.js  # Tarification
    ├── i18n.js     # FR / EN
    └── ...
```

---

## Notes

- Compatible avec les exports WTT standard (`vehicleList` dans le JSON).
- Les prix GE saisis sont mémorisés localement (localStorage) pour les prochains patchs.
- Pas de backend, pas de build, pas de `npm install` obligatoire si tu utilises `start.bat` + Python.

---

## Licence

Usage perso / communautaire. War Thunder est une marque de Gaijin Entertainment.
