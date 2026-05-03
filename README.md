# MediMap

MediMap est une application web statique d'aide a l'orientation medicale pour
l'agglomeration de Montpellier. Elle permet, a partir d'un motif d'appel et
d'une commune ou d'un quartier, de proposer l'etablissement prioritaire selon
des regles de sectorisation configurees dans le code.

## Objectif

L'application est pensee pour une utilisation de regulation / orientation sur un
perimetre territorial defini. Elle ne calcule pas un itineraire routier reel et
ne remplace pas une decision medicale. Les regles appliquees sont des regles
metier statiques, maintenues dans le referentiel de sectorisation
[`data_sources/sectorization.json`](./data_sources/sectorization.json), puis
chargees dans le front via un bundle genere.

## Fonctionnalites

- detection automatique de la filiere a partir d'un catalogue de motifs
- autocompletion des motifs, communes, quartiers de Montpellier et secteurs de
  Lattes
- prise en charge locale des rues et adresses Montpellier intramuros a partir
  d'une base officielle transformee en index de rues
- affichage cartographique de la sectorisation par filiere
- proposition d'une destination prioritaire avec focus carte et trace visuelle
- affichage des coordonnees etablissements, numeros utiles et estimation
  theorique distance / duree
- prise en charge des alias de quartiers (ex. `Antigone` ->
  `Montpellier - Port Marianne`)

## Perimetre couvert

- `6` etablissements de sante
- `4` filieres (`Classique`, `Cardiologie / Pneumologie`,
  `Gastro / Visceral / Urologie`, `Traumatologie`)
- `37` motifs dans le catalogue
- `45` communes
- `3` secteurs pour Lattes
- `9` sous-zones pour Montpellier intramuros

Les metadonnees etablissements incluent une date de verification
(`verified_at`) et un statut (`reviewed` ou `needs_review`) dans
`HOSPITAL_RECORDS`.

## Stack technique

- application front statique: [index.html](./index.html),
  [style.css](./style.css), [app.js](./app.js), [application.js](./application.js),
  [domain.js](./domain.js), [data.js](./data.js)
- source sectorisation: [`data_sources/sectorization.json`](./data_sources/sectorization.json)
- bundle sectorisation charge par le front: [`generated/sectorization-data.js`](./generated/sectorization-data.js)
- referentiels additionnels (dont Beziers / Ouest Herault): cle `references` dans
  [`data_sources/sectorization.json`](./data_sources/sectorization.json)
- base locale adresses Montpellier: [`db/montpellier_addresses.sqlite`](./db/montpellier_addresses.sqlite)
- index rues -> sous-zone charge par le front: [`generated/montpellier_street_index.js`](./generated/montpellier_street_index.js)
- scripts de construction data: [`scripts/build_montpellier_address_db.py`](./scripts/build_montpellier_address_db.py),
  [`scripts/build_sectorization_bundle.py`](./scripts/build_sectorization_bundle.py),
  [`scripts/geocode_beziers_sectorization.py`](./scripts/geocode_beziers_sectorization.py)
- carte: Leaflet 1.9.4 embarque localement dans [`vendor/leaflet/`](./vendor/leaflet)
- fond de carte: tuiles OpenStreetMap
- serveur local de dev sans cache: [dev_server.py](./dev_server.py)
- tests: Node.js natif (`node:test`) avec harnais maison dans [tests/](./tests)

## Structure du projet

```text
.
├── index.html        # structure de l'interface
├── style.css         # styles de l'application
├── app.js            # couche UI / DOM
├── application.js    # cas d'usage applicatifs
├── domain.js         # regles metier pures
├── data.js           # referentiel metier derive + helpers de resolution
├── data_sources/     # sources open data Montpellier utilisees pour la base locale
│   └── sectorization.json # source de verite des zones / regles de sectorisation
├── db/               # schema SQLite + base locale adresses Montpellier
├── generated/        # artefacts generes pour le front (index de rues)
│   └── sectorization-data.js # bundle JS genere pour le navigateur
├── scripts/          # scripts de construction / regeneration des donnees
├── dev_server.py     # serveur statique local sans cache
├── vendor/leaflet/   # distribution Leaflet embarquee
├── tests/            # tests data + comportements UI
└── assets/           # logos
```

## Prerequis

- navigateur moderne avec JavaScript active
- Python 3 pour lancer le serveur local recommande
- Node.js 18+ recommande pour executer les tests
- acces reseau pour charger les tuiles OpenStreetMap

## Lancement local

Depuis la racine du projet:

```bash
python3 dev_server.py
```

L'application est ensuite disponible sur:

```text
http://127.0.0.1:8000
```

Options utiles:

```bash
python3 dev_server.py --host 0.0.0.0 --port 8080
```

Le serveur fourni desactive le cache navigateur pour faciliter les iterations
sur `html/css/js`.

## Tests

Execution de l'ensemble des tests:

```bash
node --test
```

Couverture actuelle:

- validation de la coherence des donnees et des regles de sectorisation
- verification des zones Montpellier / Lattes et des alias de recherche
- verification du comportement principal de l'UI via un harnais DOM / Leaflet
  simule

## Base adresses Montpellier

La base locale repose sur:

1. le jeu officiel point-adresse de la Ville de Montpellier
2. le jeu officiel des sous-quartiers de Montpellier
3. une correspondance de ces sous-quartiers vers les `9` sous-zones MediMap

Construction / regeneration:

```bash
python3 scripts/build_montpellier_address_db.py
```

Le script produit:

- [`db/montpellier_addresses.sqlite`](./db/montpellier_addresses.sqlite) avec les adresses et leur rattachement de sous-zone
- [`generated/montpellier_street_index.js`](./generated/montpellier_street_index.js) charge par le front pour resoudre une rue comme `rue Joffre`

## Base sectorisation

La sectorisation n'est plus maintenue en dur dans `data.js`.

Source de verite:

- [`data_sources/sectorization.json`](./data_sources/sectorization.json)

Generation du bundle front:

```bash
python3 scripts/build_sectorization_bundle.py
```

Le script produit:

- [`generated/sectorization-data.js`](./generated/sectorization-data.js), charge avant [`data.js`](./data.js)

## Deploiement GitHub Pages

Le projet peut etre publie tel quel sur GitHub Pages car:

- tous les chemins applicatifs sont relatifs
- Leaflet est embarque localement dans le repo
- l'application ne depend d'aucun backend

Points a verifier avant publication:

1. pousser aussi le dossier [`vendor/leaflet/`](./vendor/leaflet)
2. activer GitHub Pages sur la branche / le dossier qui contient `index.html`
3. conserver les suffixes `?v=...` dans `index.html` quand un asset change pour eviter les caches agressifs
4. garder un acces reseau public vers les tuiles OpenStreetMap, sinon seule l'UI chargera sans fond de carte

Exemples d'URLs:

- site utilisateur: `https://<user>.github.io/`
- site de projet: `https://<user>.github.io/<repo>/`

Comme les liens sont relatifs, aucun changement de `basePath` n'est necessaire pour ces deux cas.

## Analytics Cloudflare (gratuit)

Le projet inclut un branchement Cloudflare Web Analytics pret a l'emploi:

- script local: [`analytics.js`](./analytics.js)
- token a renseigner dans [`index.html`](./index.html) via:
  `<meta name="cloudflare-analytics-token" content="" />`

Pour activer la collecte:

1. creer le site dans Cloudflare Web Analytics
2. recuperer le `token` fourni par Cloudflare
3. renseigner ce token dans la balise meta `cloudflare-analytics-token`
4. deployer sur GitHub Pages

Notes:

- sans token, le script ne charge rien (comportement volontaire)
- la CSP de [`index.html`](./index.html) est deja adaptee pour autoriser
  `static.cloudflareinsights.com` et `cloudflareinsights.com`

## Utilisation

1. saisir un motif d'appel dans `Motif d'appel`
2. saisir une commune, un quartier de Montpellier, une adresse Montpellier
   intramuros, un secteur de Lattes ou un alias reconnu
3. verifier la filiere detectee dans `Filiere`
4. cliquer sur `Orientation` si necessaire
5. consulter la destination proposee sur la carte et dans le popup
6. utiliser `Effacer` pour reinitialiser la selection

Les puces de filiere permettent aussi d'afficher la sectorisation cartographique
par specialite, independamment de la saisie courante.

Pour les adresses Montpellier, l'application:

1. tente d'abord une resolution locale a partir du quartier, de la rue ou d'un
   repere de voie deja connu
2. s'appuie sur l'index de rues genere depuis la base locale Montpellier
3. ignore le numero de voie pour privilegier le rattachement territorial

## Referentiel technique et metier

### Fichiers clefs

| Element | Role |
| ------- | ---- |
| `HOSPITAL_RECORDS` | Referentiel etablissements: coordonnees, adresses, numeros, statut de verification |
| `SPECIALTIES` | Liste des filieres disponibles |
| `MOTIF_CATALOG` | Catalogue de motifs et alias pour la detection de filiere |
| `CITY_AREAS` | Communes + secteurs de Lattes |
| `MTP_SUBAREAS` | Quartiers / sous-zones de Montpellier |
| `AREA_SPECIALTY_RULES` | Affectations explicites par zone et par filiere |
| `RULES` | Regles de sectorisation par commune pour les filieres specialisees |
| `MTP_RULES` / `MTP_AREA_RULES` | Regles dediees a Montpellier |
| `DIVERS_MTP_RULES` / `DIVERS_AREA_RULES` / `DIVERS_CITY_RULES` | Regles de la filiere Classique |
| `SPECIAL_AREA_RULES` | Surcharges locales pour certaines communes |
| `resolveHospitalForArea(...)` | Fonction centrale de resolution de destination |

### Correspondance des identifiants etablissements

| Id | Etablissement |
| -- | ------------- |
| `saint_roch` | Clinique Saint-Roch |
| `saint_jean` | Clinique Saint - Jean Sud de France |
| `beausoleil` | Clinique Beausoleil |
| `lapeyronie` | Hopital Lapeyronie |
| `parc` | Clinique du Parc |
| `millenaire` | Clinique du Millenaire |

### Logique d'orientation

Pour la filiere `divers` (`Classique`), l'ordre de priorite est:

1. regles Montpellier intramuros via `DIVERS_MTP_RULES`
2. regles specifiques de zone via `DIVERS_AREA_RULES`
3. regles communales via `DIVERS_CITY_RULES`
4. repli par defaut sur `lapeyronie`

Pour les autres filieres, l'ordre de priorite est:

1. regles Montpellier intramuros via `MTP_AREA_RULES`, puis `MTP_RULES`
2. surcharges locales via `SPECIAL_AREA_RULES`
3. cas specifiques Lattes codes en dur dans `resolveHospitalForArea(...)`
4. regles communales via `RULES[specialty]`
5. repli par defaut sur `lapeyronie`

### Detection de filiere

La detection automatique repose sur `detectSpecialty(...)` dans
[domain.js](./domain.js), a partir des libelles et alias definis dans
`MOTIF_CATALOG`.

Priorite de detection:

1. `trauma`
2. `gastro_uro`
3. `cardio_pneumo`
4. `divers`

Si aucun motif saisi n'est reconnu, l'orientation n'est pas lancee.
En revanche, si aucun motif n'est saisi, l'application conserve son comportement
historique et peut afficher l'orientation de la filiere `divers`.

### Estimation de trajet

L'application affiche une estimation theorique basee sur la distance a vol
d'oiseau entre la zone selectionnee et l'etablissement cible. Ce n'est pas un
calcul d'itineraire routier.

## Reference de sectorisation detaillee

## Sectorisation "Classique"

Dans le code, la filière **Classique** correspond à la filière `divers`.

La logique n'est pas calculée dynamiquement par distance routière. Elle repose sur :

1. des règles spécifiques pour les quartiers intramuros de Montpellier
2. des règles spécifiques pour certains secteurs fins, comme Lattes
3. des règles par commune
4. un repli par défaut sur Lapeyronie si aucun cas ne correspond

### Quartiers de Montpellier intramuros

| Quartier / secteur               | Destination            |
| -------------------------------- | ---------------------- |
| Montpellier - Centre historique  | Hôpital Lapeyronie     |
| Montpellier - Hôpitaux facultés  | Hôpital Lapeyronie     |
| Montpellier - Mosson             | Hôpital Lapeyronie     |
| Montpellier - Près d'Arènes      | Clinique Saint-Roch    |
| Montpellier - Croix d'Argent     | Clinique Saint-Roch    |
| Montpellier - Cévennes           | Clinique Beausoleil    |
| Montpellier - Arceaux / Gambetta | Clinique Beausoleil    |
| Montpellier - Port Marianne      | Clinique du Millénaire |
| Montpellier - Millénaire         | Clinique du Millénaire |

Source technique : `DIVERS_MTP_RULES` dans [data.js](./data.js).

### Secteurs spécifiques

| Secteur             | Destination            |
| ------------------- | ---------------------- |
| Lattes - Centre     | Clinique Saint-Roch    |
| Lattes - Boirargues | Clinique du Millénaire |
| Lattes - Maurin     | Clinique Saint-Roch    |

Source technique : `DIVERS_AREA_RULES` dans [data.js](./data.js).

### Communes

#### Hôpital Lapeyronie

- Grabels
- Montarnaud
- Combaillaux
- Vailhauquès
- Murles
- Saint-Gély-du-Fesc
- Saint-Clément-de-Rivière
- Montferrier-sur-Lez
- Prades-le-Lez
- Assas

#### Clinique Saint-Roch

- Palavas-les-Flots

#### Clinique Beausoleil

- Murviel-lès-Montpellier
- Saint-Georges-d'Orques
- Juvignac

#### Clinique du Millénaire

- Carnon
- Mauguio
- Saint-Aunès
- Pérols

#### Clinique du Parc

- Castelnau-le-Lez
- Baillargues
- Vendargues
- Saint-Brès
- Clapiers
- Jacou
- Teyran
- Le Crès
- Castries
- Sussargues
- Saint-Drézéry
- Beaulieu
- Restinclières
- Saint-Geniès-des-Mourgues
- Montaud

#### Clinique Saint - Jean Sud de France

- Saint-Jean-de-Védas
- Villeneuve-lès-Maguelone
- Vic-la-Gardiole
- Gigean
- Fabrègues
- Montbazin
- Cournonsec
- Cournonterral
- Pignan
- Saussan
- Lavérune
- Mireval

Source technique : `DIVERS_CITY_RULES` dans [data.js](./data.js).

### Repli par défaut

Si aucune règle `divers` ne correspond, la destination par défaut est :

- Hôpital Lapeyronie

Source technique : `resolveHospitalForArea(...)` dans [data.js](./data.js).

## Sectorisation "Cardiologie / Pneumologie"

### Quartiers de Montpellier intramuros

| Quartier / secteur               | Destination            |
| -------------------------------- | ---------------------- |
| Montpellier - Centre historique  | Hôpital Lapeyronie     |
| Montpellier - Hôpitaux facultés  | Hôpital Lapeyronie     |
| Montpellier - Mosson             | Hôpital Lapeyronie     |
| Montpellier - Près d'Arènes      | Clinique Saint-Roch    |
| Montpellier - Croix d'Argent     | Clinique Saint-Roch    |
| Montpellier - Cévennes           | Clinique Beausoleil    |
| Montpellier - Arceaux / Gambetta | Clinique Beausoleil    |
| Montpellier - Port Marianne      | Clinique du Millénaire |
| Montpellier - Millénaire         | Clinique du Millénaire |

Source technique : `MTP_AREA_RULES.cardio_pneumo` dans [data.js](./data.js).

### Secteurs spécifiques

| Secteur             | Destination            |
| ------------------- | ---------------------- |
| Lattes - Centre     | Clinique du Millénaire |
| Lattes - Boirargues | Clinique du Millénaire |
| Lattes - Maurin     | Clinique Saint-Roch    |

Source technique : `resolveHospitalForArea(...)` et `SPECIAL_AREA_RULES` dans [data.js](./data.js).

### Communes

#### Hôpital Lapeyronie

- Grabels
- Montarnaud
- Combaillaux
- Vailhauquès
- Murles
- Saint-Gély-du-Fesc
- Saint-Clément-de-Rivière
- Montferrier-sur-Lez
- Prades-le-Lez
- Assas

#### Clinique Beausoleil

- Murviel-lès-Montpellier
- Saint-Georges-d'Orques
- Juvignac

#### Clinique du Millénaire

- Carnon
- Mauguio
- Saint-Aunès
- Pérols
- Saint-Brès
- Baillargues
- Palavas-les-Flots

#### Clinique du Parc

- Castelnau-le-Lez
- Vendargues
- Clapiers
- Jacou
- Teyran
- Le Crès
- Castries
- Sussargues
- Saint-Drézéry
- Beaulieu
- Restinclières
- Saint-Geniès-des-Mourgues
- Montaud

#### Clinique Saint - Jean Sud de France

- Saint-Jean-de-Védas
- Villeneuve-lès-Maguelone
- Vic-la-Gardiole
- Gigean
- Fabrègues
- Montbazin
- Cournonsec
- Cournonterral
- Pignan
- Saussan
- Lavérune
- Mireval

Source technique : `RULES.cardio_pneumo` et `SPECIAL_AREA_RULES` dans [data.js](./data.js).

## Sectorisation "Gastro / Viscéral / Urologie"

### Quartiers de Montpellier intramuros

| Quartier / secteur | Destination |
| --- | --- |
| Montpellier - Centre historique | Hôpital Lapeyronie |
| Montpellier - Hôpitaux facultés | Hôpital Lapeyronie |
| Montpellier - Mosson | Hôpital Lapeyronie |
| Montpellier - Près d'Arènes | Clinique Beausoleil |
| Montpellier - Croix d'Argent | Clinique Saint-Roch |
| Montpellier - Cévennes | Clinique Beausoleil |
| Montpellier - Arceaux / Gambetta | Clinique Beausoleil |
| Montpellier - Port Marianne | Clinique du Millénaire |
| Montpellier - Millénaire | Clinique du Millénaire |

Source technique : `MTP_AREA_RULES.gastro_uro` dans [data.js](./data.js).

### Secteurs spécifiques

| Secteur | Destination |
| --- | --- |
| Lattes - Centre | Clinique du Millénaire |
| Lattes - Boirargues | Clinique du Millénaire |
| Lattes - Maurin | Clinique Saint - Jean Sud de France |

Source technique : `resolveHospitalForArea(...)` et `SPECIAL_AREA_RULES` dans [data.js](./data.js).

### Communes

#### Hôpital Lapeyronie

- Grabels
- Montarnaud
- Combaillaux
- Vailhauquès
- Murles
- Saint-Gély-du-Fesc
- Saint-Clément-de-Rivière
- Montferrier-sur-Lez
- Prades-le-Lez
- Assas

#### Clinique Saint-Roch

#### Clinique Beausoleil

- Murviel-lès-Montpellier
- Saint-Georges-d'Orques
- Juvignac

#### Clinique du Millénaire

- Carnon
- Mauguio
- Saint-Aunès
- Pérols

#### Clinique du Parc

- Castelnau-le-Lez
- Baillargues
- Vendargues
- Saint-Brès
- Clapiers
- Jacou
- Teyran
- Le Crès
- Castries
- Sussargues
- Saint-Drézéry
- Beaulieu
- Restinclières
- Saint-Geniès-des-Mourgues
- Montaud

#### Clinique Saint - Jean Sud de France

- Saint-Jean-de-Védas
- Villeneuve-lès-Maguelone
- Vic-la-Gardiole
- Gigean
- Fabrègues
- Montbazin
- Cournonsec
- Cournonterral
- Palavas-les-Flots
- Pignan
- Saussan
- Lavérune
- Mireval

Source technique : `RULES.gastro_uro` et `SPECIAL_AREA_RULES` dans [data.js](./data.js).

## Sectorisation "Traumatologie"

### Quartiers de Montpellier intramuros

| Quartier / secteur               | Destination         |
| -------------------------------- | ------------------- |
| Montpellier - Centre historique  | Hôpital Lapeyronie  |
| Montpellier - Hôpitaux facultés  | Hôpital Lapeyronie  |
| Montpellier - Mosson             | Hôpital Lapeyronie  |
| Montpellier - Près d'Arènes      | Clinique Saint-Roch |
| Montpellier - Croix d'Argent     | Clinique Saint-Roch |
| Montpellier - Cévennes           | Clinique Beausoleil |
| Montpellier - Arceaux / Gambetta | Clinique Beausoleil |
| Montpellier - Port Marianne      | Clinique Saint-Roch |
| Montpellier - Millénaire         | Clinique Saint-Roch |

Source technique : `MTP_AREA_RULES.trauma` dans [data.js](./data.js).

### Secteurs spécifiques

| Secteur             | Destination         |
| ------------------- | ------------------- |
| Lattes - Centre     | Clinique Saint-Roch |
| Lattes - Boirargues | Clinique Saint-Roch |
| Lattes - Maurin     | Clinique Saint-Roch |

Source technique : `resolveHospitalForArea(...)` et `SPECIAL_AREA_RULES` dans [data.js](./data.js).

### Communes

#### Hôpital Lapeyronie

- Grabels
- Montarnaud
- Combaillaux
- Vailhauquès
- Murles
- Saint-Gély-du-Fesc
- Saint-Clément-de-Rivière
- Montferrier-sur-Lez
- Prades-le-Lez
- Assas

#### Clinique Saint-Roch

- Palavas-les-Flots
- Carnon
- Pérols

#### Clinique Beausoleil

- Murviel-lès-Montpellier
- Saint-Georges-d'Orques
- Juvignac

#### Clinique du Millénaire

- Aucune commune dédiée

#### Clinique du Parc

- Castelnau-le-Lez
- Vendargues
- Clapiers
- Jacou
- Teyran
- Le Crès
- Castries
- Sussargues
- Saint-Drézéry
- Beaulieu
- Restinclières
- Saint-Geniès-des-Mourgues
- Montaud
- Mauguio
- Saint-Aunès
- Saint-Brès
- Baillargues

#### Clinique Saint - Jean Sud de France

- Saint-Jean-de-Védas
- Villeneuve-lès-Maguelone
- Vic-la-Gardiole
- Gigean
- Fabrègues
- Montbazin
- Cournonsec
- Cournonterral
- Pignan
- Saussan
- Lavérune
- Mireval

Source technique : `RULES.trauma` et `SPECIAL_AREA_RULES` dans [data.js](./data.js).

## Maintenance

### Mettre a jour un etablissement

Modifier `HOSPITAL_RECORDS` dans [data.js](./data.js):

- `location.lat` / `location.lng`
- `location.address`
- `phones.urgences` / `phones.specialites`
- `verified_at`
- `verification_status`
- `source`

Chaque enregistrement doit rester unique et coherent; les tests valident deja:

- presence des champs obligatoires
- format de date `YYYY-MM-DD`
- unicite des adresses et coordonnees
- bornes geographiques compatibles avec la zone couverte

### Ajouter ou modifier un motif

Mettre a jour `MOTIF_CATALOG` dans [data.js](./data.js) avec:

- `label`
- `filiere`
- `aliases`

La detection et l'autocompletion utiliseront automatiquement ces nouvelles
entrees.

### Ajouter ou modifier une zone

Selon le cas:

- commune ou secteur de Lattes: `CITY_AREAS`
- quartier de Montpellier: `MTP_SUBAREAS`
- nuage / geometrie carte: `CLOUDS`, `CLOUD_ANCHORS`, `CLOUD_STYLE`
- regles d'affectation: `RULES`, `MTP_RULES`, `MTP_AREA_RULES`,
  `DIVERS_*`, `SPECIAL_AREA_RULES`

### Styles et interface

- structure HTML: [index.html](./index.html)
- styles: [style.css](./style.css)
- logique UI / carte / autocomplete: [app.js](./app.js)

## Points d'attention

- l'application depend de ressources externes pour Leaflet et les tuiles de
  carte
- la "duree" affichee est une approximation theorique et non un temps reel
- la logique medicale est entierement statique: toute evolution doit passer par
  une mise a jour des donnees metier
- les sections `Disclaimer` et `Orientation proposee` presentes dans le HTML
  sont masquees par la logique d'initialisation actuelle dans [app.js](./app.js)
