# MediMap

MediMap est une application web statique d'aide a l'orientation medicale.
Elle applique des regles de sectorisation locales a partir d'un motif et d'une zone,
puis affiche une proposition de destination sur carte.

## Principes

- Frontend statique (HTML/CSS/JS), sans framework.
- Regles metier separees entre donnees, domaine et couche application.
- Donnees de sectorisation versionnees via une source JSON puis bundlees pour le front.
- Execution locale possible avec un serveur Python simple.

## Structure

```text
.
├── index.html
├── style.css
├── bootstrap.js
├── app.js
├── application.js
├── domain.js
├── data.js
├── autocomplete.js
├── city-input-controller.js
├── map-renderer.js
├── map-renderer-static.js
├── map-renderer-layout.js
├── analytics.js
├── data_sources/
│   ├── sectorization.json
│   └── montpellier_point_adresse.csv
├── generated/
│   ├── sectorization-data.js
│   └── montpellier_street_index.js
├── scripts/
│   ├── build_sectorization_bundle.py
│   ├── build_montpellier_address_db.py
│   ├── geocode_beziers_sectorization.py
│   └── export_sectors_by_specialty.js
├── db/
├── vendor/leaflet/
├── tests/
└── dev_server.py
```

## Prerequis

- Python 3.10+
- Node.js 18+ (pour les tests)
- Navigateur moderne

## Lancer en local

```bash
python3 dev_server.py
```

Application disponible sur:

```text
http://127.0.0.1:8000
```

## Regenerer les donnees

Rebuild du bundle de sectorisation:

```bash
python3 scripts/build_sectorization_bundle.py
```

Rebuild de la base / index d'adresses:

```bash
python3 scripts/build_montpellier_address_db.py
```

## Tests

```bash
node --test
```

## Fichiers sensibles et hygiene Git

Le projet utilise un `.gitignore` pour exclure certains fichiers/dossiers locaux
(volumineux ou non destines au partage).

Avant commit:

1. verifier `git status`
2. verifier qu'aucune donnee brute locale ni secret n'est stage
3. preferer des exemples anonymises dans la documentation

## Bonnes pratiques

- Ne pas commiter de token, mot de passe, ou URL privee.
- Ne pas commiter de donnees personnelles non anonymisees.
- Eviter les chemins absolus machine dans la doc et les scripts.

## Licence

Usage interne/projet prive (a adapter selon votre politique).
