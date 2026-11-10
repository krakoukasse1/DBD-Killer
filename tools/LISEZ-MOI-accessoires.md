# Compléter addons.json (accessoires de tous les tueurs)

Le script `build-addons.js` télécharge les données du wiki officiel (version française) et ajoute
dans `public/addons.json` les tueurs qui manquent encore. Les tueurs déjà présents ne sont pas touchés.

## Utilisation

Depuis la racine du projet (là où se trouve `data.json`), avec Node 18 ou plus :

```bash
git checkout -b accessoires-tueurs      # conseillé : on travaille sur une branche
node tools/build-addons.js
```

Il affiche les tueurs traités, puis une liste « À vérifier » (accessoires ignorés, pages introuvables…).
Les pages téléchargées sont gardées dans `tools/cache/` : une relance n'a pas besoin de réseau.

| Commande | Effet |
|---|---|
| `node tools/build-addons.js` | ajoute les tueurs absents |
| `node tools/build-addons.js --only=21,22` | ne traite que ces tueurs (numéros du tableau `KILLERS` dans le script) |
| `node tools/build-addons.js --all` | régénère tous les tueurs (un tueur existant n'est remplacé que si le résultat est au moins aussi complet) |
| `node tools/build-addons.js --no-fetch` | n'utilise que `tools/cache/` |

## Si le téléchargement échoue

Le site peut refuser les requêtes d'un script. Dans ce cas :
1. Le message d'erreur donne le nom du fichier attendu, par exemple `tools/cache/page_Talbot_Grimes.html`.
2. Ouvre la page du tueur sur le wiki dans ton navigateur : « Enregistrer sous » → « Page web, HTML uniquement ».
3. Copie le fichier dans `tools/cache/` avec exactement ce nom, puis relance avec `--no-fetch`.

Pour le module de données : ouvre `https://deadbydaylight.wiki.gg/fr/wiki/Module:Datatable/Loadout?action=raw`,
enregistre le texte sous `tools/cache/module_Loadout.lua`.

## Si un tueur n'est pas trouvé

Le titre de page de chaque tueur est dans le tableau `KILLERS` en haut du script (par exemple `Talbot_Grimes`).
S'il est faux, corrige-le d'après l'adresse de la page sur le wiki français (la partie après `/fr/wiki/`).

## Ce que le script produit

Pour chaque accessoire : nom français, description, rareté, lien d'image (lu directement dans la page du wiki, donc exact).
Les accessoires retirés du jeu ou d'événement sont exclus. Les textes viennent du wiki français et peuvent
dater de quelques patchs.

## Retraiter certains tueurs après une mise à jour du script

Les pages déjà téléchargées sont dans `tools/cache/`, donc inutile de les retélécharger :

```bash
node tools/build-addons.js --no-fetch --only=29,32,39,40,42,43
```

Un tueur déjà présent n'est remplacé que si le nouveau résultat est au moins aussi complet.
