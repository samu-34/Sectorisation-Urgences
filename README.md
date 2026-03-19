# MediMap

MediMap est une application web statique d'aide a l'orientation medicale pour
l'agglomeration de Montpellier. Elle permet, a partir d'un motif d'appel et
d'une commune ou d'un quartier, de proposer l'etablissement prioritaire selon
des regles de sectorisation configurees dans le code.

## Objectif

L'application est pensee pour une utilisation de regulation / orientation sur un
perimetre territorial defini. Elle ne calcule pas un itineraire routier reel et
ne remplace pas une decision medicale. Les regles appliquees sont des regles
metier statiques, maintenues dans [data.js](./data.js).

## Fonctionnalites

- detection automatique de la filiere a partir d'un catalogue de motifs
- autocompletion des motifs, communes, quartiers de Montpellier et secteurs de
  Lattes
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
  [style.css](./style.css), [app.js](./app.js), [data.js](./data.js)
- carte: Leaflet charge via CDN `unpkg`
- fond de carte: tuiles OpenStreetMap
- serveur local de dev sans cache: [dev_server.py](./dev_server.py)
- tests: Node.js natif (`node:test`) avec harnais maison dans [tests/](./tests)

## Structure du projet

```text
.
├── index.html        # structure de l'interface
├── style.css         # styles de l'application
├── app.js            # logique UI, carte, orientation, interactions
├── data.js           # donnees metier et regles de sectorisation
├── dev_server.py     # serveur statique local sans cache
├── tests/            # tests data + comportements UI
└── assets/           # logos
```

## Prerequis

- navigateur moderne avec JavaScript active
- Python 3 pour lancer le serveur local recommande
- Node.js 18+ recommande pour executer les tests
- acces reseau pour charger Leaflet et les tuiles OpenStreetMap

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

## Utilisation

1. saisir un motif d'appel dans `Motif d'appel`
2. saisir une commune, un quartier de Montpellier, un secteur de Lattes ou un
   alias reconnu
3. verifier la filiere detectee dans `Filiere`
4. cliquer sur `Orientation` si necessaire
5. consulter la destination proposee sur la carte et dans le popup
6. utiliser `Effacer` pour reinitialiser la selection

Les puces de filiere permettent aussi d'afficher la sectorisation cartographique
par specialite, independamment de la saisie courante.

## Referentiel technique et metier

### Fichiers clefs

| Element | Role |
| ------- | ---- |
| `HOSPITAL_RECORDS` | Referentiel etablissements: coordonnees, adresses, numeros, statut de verification |
| `SPECIALTIES` | Liste des filieres disponibles |
| `MOTIF_CATALOG` | Catalogue de motifs et alias pour la detection de filiere |
| `CITY_AREAS` | Communes + secteurs de Lattes |
| `MTP_SUBAREAS` | Quartiers / sous-zones de Montpellier |
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
[app.js](./app.js), a partir des libelles et alias definis dans
`MOTIF_CATALOG`.

Priorite de detection:

1. `trauma`
2. `gastro_uro`
3. `cardio_pneumo`
4. `divers`

Si aucun motif n'est reconnu, l'orientation retombe sur `divers`.

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
