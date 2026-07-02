/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { Lead, LeadType } from '../types';

// Helper to normalize strings for mapping
const normalizeKey = (key: string): string => {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, ''); // remove special chars
};

export const parseExcelFile = (file: File): Promise<Partial<Lead>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Impossible de lire les données du fichier'));
          return;
        }
        
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON array
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);
        
        const mappedLeads: Partial<Lead>[] = rawRows.map((row, index) => {
          // Initialize structures
          const driver: any = {
            nom: '',
            prenom: '',
            adresse: '',
            codePostal: '',
            ville: '',
            tel: '',
            email: '',
            dateNaissance: '',
            datePermis: ''
          };
          
          const vehicle: any = {
            immatriculation: '',
            marque: '',
            modele: '',
            dateMiseEnCirculation: '',
            dateAchat: '',
            usage: 'Privé-Trajet',
            stationnement: 'Voie publique'
          };

          const habitation: any = {
            typeBien: 'appartement',
            qualiteAssure: 'locataire',
            adresseBienDiffere: false,
            nombrePieces: 3,
            etage: 0,
            dependances: false,
            cheminee: false,
            alarme: false,
            piscine: false,
            capitalMobilier: 15000
          };

          const antecedent: any = {
            dejaAssure: false,
            aEuSinistres: false,
            contratEnCours: false
          };

          const proposition: any = {
            formuleSouhaitee: 'Standard',
            fractionnementSouhaite: 'Mensuel',
            cotisationAnnuelle: 0,
            fraisDossier: 0,
            optionsSelectionnees: [],
            dateEffetSouhaitee: new Date().toISOString().split('T')[0]
          };

          let type: LeadType = 'auto';
          let qualificationId = 'en_cours';

          // Iterate through columns of this row and map to corresponding fields
          Object.entries(row).forEach(([rawKey, val]) => {
            const key = normalizeKey(rawKey);
            const valueStr = String(val).trim();

            if (key === 'type' || key === 'typeassurance') {
              const lowerVal = valueStr.toLowerCase();
              if (lowerVal.includes('vtc')) type = 'vtc';
              else if (lowerVal.includes('hab') || lowerVal.includes('maison') || lowerVal.includes('appart')) type = 'habitation';
              else type = 'auto';
            } else if (key === 'nom' || key === 'lastname') {
              driver.nom = valueStr;
            } else if (key === 'prenom' || key === 'firstname') {
              driver.prenom = valueStr;
            } else if (key === 'tel' || key === 'telephone' || key === 'phone' || key === 'mobile') {
              driver.tel = valueStr;
            } else if (key === 'email' || key === 'mail') {
              driver.email = valueStr;
            } else if (key === 'adresse' || key === 'address') {
              driver.adresse = valueStr;
            } else if (key === 'codepostal' || key === 'cp' || key === 'zip') {
              driver.codePostal = valueStr;
            } else if (key === 'ville' || key === 'city') {
              driver.ville = valueStr;
            } else if (key === 'datenaissance' || key === 'dob' || key === 'naissance') {
              driver.dateNaissance = valueStr;
            } else if (key === 'datepermis' || key === 'permis') {
              driver.datePermis = valueStr;
            } else if (key === 'carteprovtc' || key === 'cartevtc') {
              driver.carteProVtc = valueStr;
            }
            
            // Vehicle mapping
            else if (key === 'immatriculation' || key === 'immat' || key === 'plaque') {
              vehicle.immatriculation = valueStr;
            } else if (key === 'marque' || key === 'brand') {
              vehicle.marque = valueStr;
            } else if (key === 'modele' || key === 'car') {
              vehicle.modele = valueStr;
            } else if (key === 'datemiseencirculation' || key === 'mec') {
              vehicle.dateMiseEnCirculation = valueStr;
            } else if (key === 'dateachat' || key === 'achat') {
              vehicle.dateAchat = valueStr;
            } else if (key === 'usage') {
              vehicle.usage = valueStr;
            } else if (key === 'stationnement') {
              vehicle.stationnement = valueStr;
            }

            // Habitation mapping
            else if (key === 'typebien' || key === 'bien') {
              habitation.typeBien = valueStr.toLowerCase().includes('mais') ? 'maison' : 'appartement';
            } else if (key === 'qualite' || key === 'qualiteassure') {
              const q = valueStr.toLowerCase();
              if (q.includes('prop') && q.includes('occup')) habitation.qualiteAssure = 'proprietaire_occupant';
              else if (q.includes('prop') && !q.includes('occup')) habitation.qualiteAssure = 'proprietaire_non_occupant';
              else habitation.qualiteAssure = 'locataire';
            } else if (key === 'pieces' || key === 'nombrepieces' || key === 'nbrpieces') {
              habitation.nombrePieces = parseInt(valueStr) || 3;
            } else if (key === 'etage') {
              habitation.etage = parseInt(valueStr) || 0;
            } else if (key === 'capital' || key === 'capitalmobilier' || key === 'mobilier') {
              habitation.capitalMobilier = parseFloat(valueStr) || 15000;
            }

            // Antecedents mapping
            else if (key === 'dejaassure' || key === 'assure') {
              antecedent.dejaAssure = ['oui', 'yes', 'true', '1'].includes(valueStr.toLowerCase());
            } else if (key === 'nbmois' || key === 'nombremois' || key === 'moisassure') {
              antecedent.nombreMoisAssure = parseInt(valueStr) || undefined;
            } else if (key === 'bonus' || key === 'malus' || key === 'crm') {
              antecedent.bonusMalus = parseFloat(valueStr) || 1.0;
            } else if (key === 'sinistres' || key === 'sinistre') {
              antecedent.aEuSinistres = ['oui', 'yes', 'true', '1', 'sinistre'].includes(valueStr.toLowerCase());
            } else if (key === 'contratencours') {
              antecedent.contratEnCours = ['oui', 'yes', 'true', '1'].includes(valueStr.toLowerCase());
            } else if (key === 'compagnie' || key === 'assureur') {
              antecedent.nomCompagnie = valueStr;
            } else if (key === 'hamon' || key === 'loihamon') {
              antecedent.loiHamon = ['oui', 'yes', 'true', '1'].includes(valueStr.toLowerCase());
            }

            // Proposition mapping
            else if (key === 'formule' || key === 'formulesouhaitee') {
              proposition.formuleSouhaitee = valueStr;
            } else if (key === 'cotisation' || key === 'prix' || key === 'prime') {
              proposition.cotisationAnnuelle = parseFloat(valueStr) || 0;
            } else if (key === 'frais' || key === 'fraisdossier') {
              proposition.fraisDossier = parseFloat(valueStr) || 0;
            } else if (key === 'dateeffet' || key === 'effet') {
              proposition.dateEffetSouhaitee = valueStr;
            }

            // Status mapping
            else if (key === 'status' || key === 'statut' || key === 'qualification') {
              const rawStat = valueStr.toLowerCase();
              if (rawStat.includes('negoc') || rawStat.includes('cours')) qualificationId = 'en_cours';
              else if (rawStat.includes('doc') || rawStat.includes('piece')) qualificationId = 'attente_doc';
              else if (rawStat.includes('accepte') || rawStat.includes('ok')) qualificationId = 'devis_accepte';
              else if (rawStat.includes('recu') || rawStat.includes('paye')) qualificationId = 'paiement_recu';
              else if (rawStat.includes('refus')) qualificationId = 'devis_refuse';
              else if (rawStat.includes('attente p') || rawStat.includes('regle')) qualificationId = 'attente_paiement';
              else if (rawStat.includes('rapel') || rawStat.includes('rappel')) qualificationId = 'rappel';
            }
          });

          // Construct final partial lead object
          return {
            id: `lead-import-${Date.now()}-${index}`,
            type,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            driver,
            vehicle: (type as string) !== 'habitation' ? vehicle : undefined,
            habitation: (type as string) === 'habitation' ? habitation : undefined,
            antecedent,
            proposition,
            documents: [],
            qualificationId
          };
        });
        
        resolve(mappedLeads);
      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

export const exportLeadsToExcel = (leads: Lead[]) => {
  const data = leads.map(lead => {
    return {
      'ID': lead.id,
      'Type': lead.type.toUpperCase(),
      'Date de création': lead.createdAt.split('T')[0],
      'Statut': lead.qualificationId,
      'Nom Conducteur / Assuré': lead.driver.nom,
      'Prénom Conducteur / Assuré': lead.driver.prenom,
      'Téléphone': lead.driver.tel,
      'Email': lead.driver.email,
      'Adresse': lead.driver.adresse,
      'Code Postal': lead.driver.codePostal,
      'Ville': lead.driver.ville,
      'Date de Naissance': lead.driver.dateNaissance,
      'Date de Permis': lead.driver.datePermis || 'N/A',
      // Auto / VTC specific
      'Immatriculation': lead.vehicle?.immatriculation || 'N/A',
      'Marque': lead.vehicle?.marque || 'N/A',
      'Modèle': lead.vehicle?.modele || 'N/A',
      'MEC': lead.vehicle?.dateMiseEnCirculation || 'N/A',
      // Habitation specific
      'Bien': lead.habitation ? `${lead.habitation.typeBien} (${lead.habitation.nombrePieces}p)` : 'N/A',
      'Qualité': lead.habitation?.qualiteAssure || 'N/A',
      // Antécédents Permis
      'Suspension Permis': lead.antecedent.aEuSuspensionPermis ? 'Oui' : 'Non',
      'Suspension Date': lead.antecedent.dateSuspensionPermis || '',
      'Suspension Durée': lead.antecedent.periodeSuspensionPermis || '',
      'Suspension Motif': lead.antecedent.motifSuspensionPermis || '',
      // Financials
      'Formule': lead.proposition.formuleSouhaitee,
      'Fractionnement': lead.proposition.fractionnementSouhaite,
      'Cotisation (€)': lead.proposition.cotisationAnnuelle,
      'Frais de Dossier (€)': lead.proposition.fraisDossier,
      'Total direct (€)': lead.proposition.cotisationAnnuelle + lead.proposition.fraisDossier,
      'Date d effet souhaitée': lead.proposition.dateEffetSouhaitee,
      // Next Action
      'Prochaine action': lead.nextAction ? `${lead.nextAction.type.toUpperCase()} le ${lead.nextAction.date} à ${lead.nextAction.time}` : 'Aucune'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads Exportés');
  
  XLSX.writeFile(workbook, `leads_crm_assurances_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const downloadSimpleTemplateExcel = () => {
  const sampleData = [
    {
      'Nom': 'Martin',
      'Prénom': 'Lucas',
      'Téléphone': '0612345678',
      'Email': 'lucas.martin@email.com',
      'Type Assurance (auto / vtc / habitation)': 'auto'
    },
    {
      'Nom': 'Bernard',
      'Prénom': 'Emma',
      'Téléphone': '0789123456',
      'Email': 'emma.bernard@gmail.com',
      'Type Assurance (auto / vtc / habitation)': 'habitation'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Exemple Simplifié');
  
  XLSX.writeFile(workbook, 'modele_importation_simple_leads.xlsx');
};

export const downloadTemplateExcel = () => {
  const sampleData = [
    {
      'Type Assurance (auto / vtc / habitation)': 'auto',
      'Nom': 'Dupont',
      'Prénom': 'Jean',
      'Téléphone': '0612345678',
      'Email': 'jean.dupont@email.com',
      'Adresse': '15 Avenue des Champs-Élysées',
      'Code Postal': '75008',
      'Ville': 'Paris',
      'Date Naissance (AAAA-MM-JJ)': '1990-05-15',
      'Date Permis (AAAA-MM-JJ)': '2008-06-20',
      'Immatriculation': 'AA-123-BB',
      'Marque': 'Renault',
      'Modèle': 'Clio 5',
      'Mise En Circulation (AAAA-MM-JJ)': '2020-01-10',
      'Date Achat (AAAA-MM-JJ)': '2021-04-12',
      'Usage (Privé / Professionnel)': 'Privé-Trajet',
      'Stationnement': 'Garage clos',
      'Deja Assure (Oui / Non)': 'Oui',
      'Nombre Mois Assure': '48',
      'Bonus Malus (ex: 0.5)': '0.5',
      'Sinistres (Oui / Non)': 'Non',
      'Contrat En Cours (Oui / Non)': 'Oui',
      'Compagnie': 'Allianz',
      'Loi Hamon (Oui / Non)': 'Oui',
      'Formule Souhaitee': 'Tous Risques',
      'Fractionnement (Mensuel / Annuel)': 'Mensuel',
      'Cotisation': '450',
      'Frais Dossier': '30',
      'Date Effet (AAAA-MM-JJ)': '2026-07-01'
    },
    {
      'Type Assurance (auto / vtc / habitation)': 'vtc',
      'Nom': 'Kovacs',
      'Prénom': 'Sandor',
      'Téléphone': '0712435678',
      'Email': 's.kovacs@gmail.com',
      'Adresse': '28 Boulevard Magenta',
      'Code Postal': '75010',
      'Ville': 'Paris',
      'Date Naissance (AAAA-MM-JJ)': '1983-09-12',
      'Date Permis (AAAA-MM-JJ)': '2003-11-20',
      'Immatriculation': 'XX-999-YY',
      'Marque': 'Peugeot',
      'Modèle': '508',
      'Mise En Circulation (AAAA-MM-JJ)': '2021-02-18',
      'Date Achat (AAAA-MM-JJ)': '2021-05-12',
      'Usage (Privé / Professionnel)': 'VTC',
      'Stationnement': 'Parking privé',
      'Deja Assure (Oui / Non)': 'Oui',
      'Nombre Mois Assure': '120',
      'Bonus Malus (ex: 0.5)': '0.5',
      'Sinistres (Oui / Non)': 'Oui',
      'Contrat En Cours (Oui / Non)': 'Oui',
      'Compagnie': 'AXA Coppet',
      'Loi Hamon (Oui / Non)': 'Non',
      'Formule Souhaitee': 'Tous Risques VTC',
      'Fractionnement (Mensuel / Annuel)': 'Mensuel',
      'Cotisation': '1650',
      'Frais Dossier': '45',
      'Date Effet (AAAA-MM-JJ)': '2026-07-15'
    },
    {
      'Type Assurance (auto / vtc / habitation)': 'habitation',
      'Nom': 'Lemoine',
      'Prénom': 'Claire',
      'Téléphone': '0688776655',
      'Email': 'claire.lemoine@outlook.com',
      'Adresse': '5 Rue du Lac',
      'Code Postal': '74000',
      'Ville': 'Annecy',
      'Date Naissance (AAAA-MM-JJ)': '1995-12-05',
      'Date Permis (AAAA-MM-JJ)': '',
      'Immatriculation': '',
      'Marque': '',
      'Modèle': '',
      'Mise En Circulation (AAAA-MM-JJ)': '',
      'Date Achat (AAAA-MM-JJ)': '',
      'Usage (Privé / Professionnel)': '',
      'Stationnement': '',
      'Deja Assure (Oui / Non)': 'Oui',
      'Nombre Mois Assure': '12',
      'Bonus Malus (ex: 0.5)': '0.9',
      'Sinistres (Oui / Non)': 'Non',
      'Contrat En Cours (Oui / Non)': 'Non',
      'Compagnie': '',
      'Loi Hamon (Oui / Non)': '',
      'Formule Souhaitee': 'Multirisque',
      'Fractionnement (Mensuel / Annuel)': 'Annuel',
      'Cotisation': '210',
      'Frais Dossier': '15',
      'Date Effet (AAAA-MM-JJ)': '2026-07-01'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Exemple Leads');
  
  XLSX.writeFile(workbook, `modele_importation_crm_leads.xlsx`);
};
