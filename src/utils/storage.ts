/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Lead, QualificationStatus, CabinetSettings, Agent, SMTPSettings, EmailTemplate, EmailHistory } from '../types';

export const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'agent-1',
    nom: 'Courtier',
    prenom: 'Jean',
    email: 'agentassurance25@gmail.com',
    role: 'admin',
    telephone: '01 47 20 15 30',
    avatarColor: 'bg-indigo-600'
  },
  {
    id: 'agent-2',
    nom: 'Dupont',
    prenom: 'Sarah',
    email: 'sarah.dupont@alliance-courtage.fr',
    role: 'agent',
    telephone: '06 99 88 77 66',
    avatarColor: 'bg-emerald-600'
  },
  {
    id: 'agent-3',
    nom: 'Lemoine',
    prenom: 'Pierre',
    email: 'pierre.lemoine@alliance-courtage.fr',
    role: 'agent',
    telephone: '07 11 22 33 44',
    avatarColor: 'bg-amber-600'
  }
];

export const DEFAULT_QUALIFICATIONS: QualificationStatus[] = [
  { id: 'en_cours', label: 'En cours de négociation', color: 'orange', isSystem: true },
  { id: 'attente_doc', label: 'Attente document', color: 'amber', isSystem: true },
  { id: 'devis_accepte', label: 'Devis accepté', color: 'emerald', isSystem: true },
  { id: 'paiement_recu', label: 'Paiement reçu', color: 'teal', isSystem: true },
  { id: 'devis_refuse', label: 'Devis refusé', color: 'rose', isSystem: true },
  { id: 'attente_paiement', label: 'Attente paiement', color: 'sky', isSystem: true },
  { id: 'rappel', label: 'Rappel', color: 'indigo', isSystem: true }
];

export const DEFAULT_CABINET: CabinetSettings = {
  nomCabinet: "Alliance Courtage Assurances",
  adresse: "128 Rue de la Pompe",
  codePostal: "75116",
  ville: "Paris",
  tel: "01 47 20 15 30",
  email: "contact@alliance-courtage.fr",
  siret: "84390291100021",
  logoUrl: "" // Empty initially so they can upload their own logo
};

// Generating mock dates relative to current date for realistic charts
const getPastDateString = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

const getFutureDateString = (daysAhead: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
};

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-1',
    type: 'auto',
    createdAt: getPastDateString(12) + 'T10:30:00.000Z',
    updatedAt: getPastDateString(2) + 'T14:20:00.000Z',
    driver: {
      nom: 'Martin',
      prenom: 'Julien',
      adresse: '42 Avenue de la Grande Armée',
      codePostal: '75017',
      ville: 'Paris',
      tel: '06 12 34 56 78',
      email: 'julien.martin@gmail.com',
      dateNaissance: '1988-04-12',
      datePermis: '2006-05-20'
    },
    vehicle: {
      immatriculation: 'AB-123-CD',
      marque: 'Peugeot',
      modele: '3008',
      dateMiseEnCirculation: '2019-10-15',
      dateAchat: '2021-03-10',
      usage: 'Privé-Trajet',
      stationnement: 'Garage clos'
    },
    antecedent: {
      dejaAssure: true,
      nombreMoisAssure: 60,
      bonusMalus: 0.50,
      aEuSinistres: true,
      nombreSinistres: 1,
      sinistresDetails: [
        { id: 'sin-1', date: '2024-02-15', nature: 'Bris de glace', responsabilityRate: 0 }
      ],
      contratEnCours: true,
      nomCompagnie: 'AXA',
      loiHamon: true
    },
    proposition: {
      formuleSouhaitee: 'Tous Risques',
      fractionnementSouhaite: 'Mensuel',
      cotisationAnnuelle: 680,
      fraisDossier: 35,
      optionsSelectionnees: ['assistance_0km', 'vehicule_remplacement'],
      dateEffetSouhaitee: getFutureDateString(10)
    },
    documents: [
      { id: 'doc-1', name: 'permis_j_martin.pdf', type: 'application/pdf', uploadedAt: getPastDateString(12), size: '1.2 MB' },
      { id: 'doc-2', name: 'carte_grise_3008.jpg', type: 'image/jpeg', uploadedAt: getPastDateString(12), size: '450 KB' }
    ],
    qualificationId: 'devis_accepte',
    nextAction: {
      type: 'relance_devis',
      date: getFutureDateString(2),
      time: '14:30',
      details: 'Relancer pour récupérer le mandat SEPA signé',
      executed: false
    }
  },
  {
    id: 'lead-2',
    type: 'vtc',
    createdAt: getPastDateString(5) + 'T09:15:00.000Z',
    updatedAt: getPastDateString(1) + 'T11:45:00.000Z',
    driver: {
      nom: 'Sow',
      prenom: 'Mamadou',
      adresse: '8 Rue Jean Moulin',
      codePostal: '93200',
      ville: 'Saint-Denis',
      tel: '07 89 45 12 36',
      email: 'mamadou.sow.vtc@gmail.com',
      dateNaissance: '1985-11-22',
      datePermis: '2008-01-14',
      carteProVtc: 'VTC-93-2021-98765',
      dateCarteProVtc: '2021-06-18',
      experienceVtcAns: 5
    },
    vehicle: {
      immatriculation: 'FX-888-ZZ',
      marque: 'Toyota',
      modele: 'Camry Hybride',
      dateMiseEnCirculation: '2022-03-24',
      dateAchat: '2022-04-01',
      usage: 'VTC',
      stationnement: 'Parking privé'
    },
    antecedent: {
      dejaAssure: true,
      nombreMoisAssure: 120,
      bonusMalus: 0.50,
      aEuSinistres: false,
      contratEnCours: true,
      nomCompagnie: 'Allianz',
      loiHamon: false
    },
    proposition: {
      formuleSouhaitee: 'Tous Risques Professionnel VTC',
      fractionnementSouhaite: 'Mensuel',
      cotisationAnnuelle: 1850,
      fraisDossier: 50,
      optionsSelectionnees: ['assistance_0km', 'vehicule_remplacement', 'rc_pro_exploitation'],
      dateEffetSouhaitee: getFutureDateString(4)
    },
    documents: [
      { id: 'doc-3', name: 'carte_pro_vtc_sow.pdf', type: 'application/pdf', uploadedAt: getPastDateString(5), size: '890 KB' }
    ],
    qualificationId: 'en_cours',
    nextAction: {
      type: 'appel',
      date: getPastDateString(0), // Today!
      time: '16:00',
      details: 'Discuter de l option RC circulation incluse',
      executed: false
    }
  },
  {
    id: 'lead-3',
    type: 'habitation',
    createdAt: getPastDateString(8) + 'T15:40:00.000Z',
    updatedAt: getPastDateString(4) + 'T10:10:00.000Z',
    driver: {
      nom: 'Dubois',
      prenom: 'Sophie',
      adresse: '14 Rue de la Liberté',
      codePostal: '69002',
      ville: 'Lyon',
      tel: '06 55 99 88 77',
      email: 'sophie.dubois@hotmail.com',
      dateNaissance: '1992-07-30',
      datePermis: '2011-09-05'
    },
    habitation: {
      typeBien: 'appartement',
      qualiteAssure: 'locataire',
      adresseBienDiffere: false,
      nombrePieces: 3,
      etage: 4,
      dependances: true,
      cheminee: false,
      alarme: false,
      piscine: false,
      capitalMobilier: 25000
    },
    antecedent: {
      dejaAssure: true,
      nombreMoisAssure: 36,
      bonusMalus: 0.85,
      aEuSinistres: false,
      contratEnCours: false,
      nomCompagnie: 'GMF',
      motifResiliation: 'A l initiative de l assuré',
      dateResiliation: getPastDateString(30)
    },
    proposition: {
      formuleSouhaitee: 'Multirisque Habitation',
      fractionnementSouhaite: 'Annuel',
      cotisationAnnuelle: 185,
      fraisDossier: 15,
      optionsSelectionnees: ['protection_juridique', 'dommages_electriques'],
      dateEffetSouhaitee: getFutureDateString(1)
    },
    documents: [],
    qualificationId: 'attente_doc',
    nextAction: {
      type: 'envoi_mail',
      date: getFutureDateString(1),
      time: '09:00',
      details: 'Relancer pour attestation de bail et RIB',
      executed: false
    }
  }
];

export const loadCRMData = () => {
  try {
    const storedLeads = localStorage.getItem('crm_leads');
    const storedQualifications = localStorage.getItem('crm_qualifications');
    const storedCabinet = localStorage.getItem('crm_cabinet');
    const storedAgents = localStorage.getItem('crm_agents');

    const rawLeads = storedLeads ? JSON.parse(storedLeads) : INITIAL_LEADS;
    const leads = rawLeads.map((l: any, idx: number) => {
      if (!l.assignedAgentId) {
        l.assignedAgentId = `agent-${(idx % 3) + 1}`;
      }
      return l;
    });

    const qualifications = storedQualifications ? JSON.parse(storedQualifications) : DEFAULT_QUALIFICATIONS;
    const cabinet = storedCabinet ? JSON.parse(storedCabinet) : DEFAULT_CABINET;
    const agents = storedAgents ? JSON.parse(storedAgents) : DEFAULT_AGENTS;

    return { leads, qualifications, cabinet, agents };
  } catch (error) {
    console.error('Error loading CRM data from localStorage:', error);
    return {
      leads: INITIAL_LEADS,
      qualifications: DEFAULT_QUALIFICATIONS,
      cabinet: DEFAULT_CABINET,
      agents: DEFAULT_AGENTS
    };
  }
};

export const saveLeads = (leads: Lead[]) => {
  try {
    localStorage.setItem('crm_leads', JSON.stringify(leads));
  } catch (error) {
    console.error('Error saving leads to localStorage:', error);
  }
};

export const saveQualifications = (quals: QualificationStatus[]) => {
  try {
    localStorage.setItem('crm_qualifications', JSON.stringify(quals));
  } catch (error) {
    console.error('Error saving qualifications to localStorage:', error);
  }
};

export const saveCabinetSettings = (settings: CabinetSettings) => {
  try {
    localStorage.setItem('crm_cabinet', JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving cabinet settings to localStorage:', error);
  }
};

export const loadCabinetSettings = (): CabinetSettings => {
  try {
    const stored = localStorage.getItem('crm_cabinet');
    return stored ? JSON.parse(stored) : DEFAULT_CABINET;
  } catch (error) {
    return DEFAULT_CABINET;
  }
};

export const saveAgents = (agents: Agent[]) => {
  try {
    localStorage.setItem('crm_agents', JSON.stringify(agents));
  } catch (error) {
    console.error('Error saving agents to localStorage:', error);
  }
};

export const loadConnectedAgent = (agents: Agent[]): Agent | null => {
  try {
    const stored = localStorage.getItem('crm_connected_agent');
    if (stored) {
      const parsed = JSON.parse(stored);
      const matched = agents.find(a => a.id === parsed.id);
      if (matched) return matched;
    }
    return null; // Return null if not logged in
  } catch (error) {
    return null;
  }
};

export const saveConnectedAgent = (agent: Agent | null) => {
  try {
    if (agent) {
      localStorage.setItem('crm_connected_agent', JSON.stringify(agent));
    } else {
      localStorage.removeItem('crm_connected_agent');
    }
  } catch (error) {
    console.error('Error saving connected agent:', error);
  }
};

export const DEFAULT_SMTP_SETTINGS: SMTPSettings = {
  host: 'smtp.agence-assurance.fr',
  port: 587,
  user: 'contact@cabinet.fr',
  pass: 'password123',
  senderName: 'Cabinet Alliance Courtage',
  senderEmail: 'contact@cabinet.fr',
  sslTls: true,
  configured: false
};

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'template-devis',
    name: 'Proposition de Devis d\'Assurance',
    subject: 'Votre devis d\'assurance personnalisé - {cabinet_nom}',
    body: 'Bonjour {client_prenom} {client_nom},\n\nNous avons le plaisir de vous transmettre votre proposition d\'assurance personnalisée pour votre dossier.\n\nVoici le résumé de l\'offre :\n- Cotisation annuelle : {cotisation_annuelle} €\n- Fractionnement : {fractionnement}\n- Date d\'effet souhaitée : {date_effet}\n\nVous pouvez nous envoyer vos justificatifs pour finaliser la souscription directement en répondant à ce mail.\n\nRestant à votre entière disposition pour toute question.\n\nCordialement,\n{conseiller_prenom} {conseiller_nom}\n{cabinet_nom}'
  },
  {
    id: 'template-relance',
    name: 'Relance Documents Manquants',
    subject: 'Documents manquants pour votre dossier - {cabinet_nom}',
    body: 'Bonjour {client_prenom} {client_nom},\n\nPour pouvoir valider définitivement votre contrat d\'assurance, notre service de gestion a besoin de recevoir les justificatifs suivants :\n- Copie de votre permis de conduire (recto/verso)\n- Relevé d\'information de votre précédente compagnie d\'assurance\n- Relevé d\'Identité Bancaire (RIB)\n\nVous pouvez nous les envoyer en répondant directement à cet e-mail ou en les téléversant sur votre espace CRM.\n\nCordialement,\n{conseiller_prenom} {conseiller_nom}\n{cabinet_nom}'
  },
  {
    id: 'template-rdv',
    name: 'Confirmation de Rendez-vous',
    subject: 'Confirmation de notre entretien téléphonique - {cabinet_nom}',
    body: 'Bonjour {client_prenom} {client_nom},\n\nJe vous confirme notre rendez-vous téléphonique planifié pour faire le point sur votre dossier d\'assurance.\n\nNous validerons ensemble les meilleures garanties pour votre couverture d\'assurance.\n\nEn cas d\'indisponibilité, merci de m\'en informer par retour d\'e-mail.\n\nCordialement,\n{conseiller_prenom} {conseiller_nom}\n{cabinet_nom}'
  }
];

export const loadSMTPSettings = (): SMTPSettings => {
  try {
    const stored = localStorage.getItem('crm_smtp_settings');
    return stored ? JSON.parse(stored) : DEFAULT_SMTP_SETTINGS;
  } catch (error) {
    return DEFAULT_SMTP_SETTINGS;
  }
};

export const saveSMTPSettings = (settings: SMTPSettings) => {
  try {
    localStorage.setItem('crm_smtp_settings', JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving SMTP settings:', error);
  }
};

export const loadEmailTemplates = (): EmailTemplate[] => {
  try {
    const stored = localStorage.getItem('crm_email_templates');
    return stored ? JSON.parse(stored) : DEFAULT_EMAIL_TEMPLATES;
  } catch (error) {
    return DEFAULT_EMAIL_TEMPLATES;
  }
};

export const saveEmailTemplates = (templates: EmailTemplate[]) => {
  try {
    localStorage.setItem('crm_email_templates', JSON.stringify(templates));
  } catch (error) {
    console.error('Error saving Email templates:', error);
  }
};

export const loadEmailHistory = (): EmailHistory[] => {
  try {
    const stored = localStorage.getItem('crm_email_history');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
};

export const saveEmailHistory = (history: EmailHistory[]) => {
  try {
    localStorage.setItem('crm_email_history', JSON.stringify(history));
  } catch (error) {
    console.error('Error saving email history:', error);
  }
};

