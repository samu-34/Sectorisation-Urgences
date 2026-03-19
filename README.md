# MediMap

Application de sectorisation médicale pour l'agglomération de Montpellier.

## Sectorisation "Classique"

Dans le code, la filière **Classique** correspond à la filière `divers`.

La logique n'est pas calculée dynamiquement par distance routière. Elle repose sur :

1. des règles spécifiques pour les quartiers intramuros de Montpellier
2. des règles spécifiques pour certains secteurs fins, comme Lattes
3. des règles par commune
4. un repli par défaut sur Lapeyronie si aucun cas ne correspond

### Correspondance des identifiants établissements

| Id           | Établissement                       |
| ------------ | ----------------------------------- |
| `saint_roch` | Clinique Saint-Roch                 |
| `saint_jean` | Clinique Saint - Jean Sud de France |
| `beausoleil` | Clinique Beausoleil                 |
| `lapeyronie` | Hôpital Lapeyronie                  |
| `parc`       | Clinique du Parc                    |
| `millenaire` | Clinique du Millénaire              |

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
