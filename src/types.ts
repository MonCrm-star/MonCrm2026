/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LeadType = 'auto' | 'vtc' | 'habitation';

export interface Sinistre {
  id: string;
  date: string;
  nature: string;
  responsabilityRate: number; // 0%, 50%, 100%
}

export interface DriverInfo {
  nom: string;
  prenom: string;
  adresse: string;
  codePostal: string;
  ville: string;
  tel: string;
  email: string;
  dateNaissance: string;
  datePermis: string;
  // Specific to VTC
  carteProVtc?: string;
  dateCarteProVtc?: string;
  experienceVtcAns?: number;
}

export interface VehicleInfo {
  immatriculation: string;
  marque: string;
  modele?: string;
  dateMiseEnCirculation: string;
  dateAchat: string;
  usage: string; // e.g., Privé, Privé-Trajet, Professionnel, VTC
  stationnement: string; // e.g., Garage clos, Parking privé, Voie publique
}

export interface HabitationInfo {
  typeBien: 'maison' | 'appartement';
  qualiteAssure: 'proprietaire_occupant' | 'locataire' | 'proprietaire_non_occupant';
  adresseBienDiffere: boolean;
  adresseBien?: string;
  codePostalBien?: string;
  villeBien?: string;
  nombrePieces: number;
  etage?: number;
  dependances: boolean;
  cheminee: boolean;
  alarme: boolean;
  piscine: boolean;
  capitalMobilier: number;
}

export interface AntecedentInfo {
  dejaAssure: boolean;
  nombreMoisAssure?: number;
  bonusMalus?: number; // e.g., 0.50
  aEuSinistres: boolean;
  nombreSinistres?: number;
  sinistresDetails?: Sinistre[];
  contratEnCours: boolean;
  nomCompagnie?: string;
  loiHamon?: boolean;
  motifResiliation?: string;
  dateResiliation?: string;
  
  // Specific to License suspension/cancellation
  aEuSuspensionPermis?: boolean;
  dateSuspensionPermis?: string;
  periodeSuspensionPermis?: string;
  motifSuspensionPermis?: string;
}

export interface PropositionInfo {
  formuleSouhaitee: string; // e.g., Tiers, Tiers Vol-Incendie, Tous Risques, Multirisque
  fractionnementSouhaite: 'Mensuel' | 'Trimestriel' | 'Semestriel' | 'Annuel';
  cotisationAnnuelle: number;
  fraisDossier: number;
  optionsSelectionnees: string[]; // e.g., ["assistance_0km", "vehicule_remplacement", "protection_juridique"]
  dateEffetSouhaitee: string;
}

export interface LeadDocument {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  size: string;
  contentBase64?: string; // Stored in memory or localDB
}

export interface QualificationStatus {
  id: string;
  label: string;
  color: string; // Tailwind color class like 'bg-amber-100 text-amber-800 border-amber-200'
  isSystem?: boolean;
}

export interface NextAction {
  type: 'appel' | 'envoi_mail' | 'relance_devis' | 'envoi_devis';
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  details?: string;
  executed: boolean;
}

export interface Agent {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: 'admin' | 'agent';
  telephone?: string;
  avatarColor?: string; // e.g. bg-indigo-600
  motDePasse?: string;
  active?: boolean;
}

export interface Lead {
  id: string;
  type: LeadType;
  createdAt: string;
  updatedAt: string;
  
  driver: DriverInfo;
  secondDriver?: DriverInfo;
  vehicle?: VehicleInfo; // For auto / vtc
  habitation?: HabitationInfo; // For habitation
  
  antecedent: AntecedentInfo;
  proposition: PropositionInfo;
  documents: LeadDocument[];
  
  qualificationId: string; // linked to QualificationStatus
  nextAction?: NextAction;
  assignedAgentId?: string; // linked to Agent.id
}

export interface CabinetSettings {
  nomCabinet: string;
  adresse: string;
  codePostal: string;
  ville: string;
  tel: string;
  email: string;
  siret: string;
  logoUrl?: string; // base64 logo
}

export interface ReminderNotification {
  id: string;
  leadId: string;
  leadName: string;
  leadType: LeadType;
  actionType: string;
  scheduledAt: string; // ISO string
  notified: boolean;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatarColor?: string;
  content: string;
  createdAt: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  type: 'direct' | 'group';
  memberIds: string[];
  createdBy?: string;
  createdAt: string;
}

export interface SMTPSettings {
  host: string;
  port: number;
  user: string;
  pass: string;
  senderName: string;
  senderEmail: string;
  sslTls: boolean;
  configured: boolean;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export interface EmailHistory {
  id: string;
  leadId: string;
  senderId: string;
  senderName: string;
  recipientEmail: string;
  subject: string;
  body: string;
  sentAt: string;
  attachments?: string[];
}

