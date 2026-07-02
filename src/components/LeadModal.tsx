/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  X, 
  User, 
  Car, 
  History, 
  HandCoins, 
  FileUp, 
  Tag, 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  FileText,
  Home,
  CheckCircle,
  Download,
  AlertCircle,
  Briefcase,
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  Paperclip,
  Upload
} from 'lucide-react';
import { Lead, LeadType, QualificationStatus, Sinistre, LeadDocument, NextAction, Agent, EmailTemplate, EmailHistory } from '../types';
import { loadSMTPSettings, loadEmailTemplates, loadEmailHistory, saveEmailHistory, loadCabinetSettings } from '../utils/storage';
import { jsPDF } from 'jspdf';

interface LeadModalProps {
  lead?: Lead | null; // If null, we are creating a new lead
  defaultType?: LeadType;
  qualifications: QualificationStatus[];
  agents?: Agent[];
  connectedAgent?: Agent | null;
  onClose: () => void;
  onSave: (lead: Lead) => void;
}

type TabType = 'conducteur' | 'vehicule_bien' | 'antecedents' | 'proposition' | 'documents' | 'qualification' | 'email';

export default function LeadModal({
  lead,
  defaultType = 'auto',
  qualifications,
  agents = [],
  connectedAgent,
  onClose,
  onSave
}: LeadModalProps) {
  const isEdit = !!lead;
  
  // Lead general metadata
  const [type, setType] = React.useState<LeadType>(lead?.type || defaultType);
  const [qualificationId, setQualificationId] = React.useState<string>(lead?.qualificationId || 'en_cours');
  const [assignedAgentId, setAssignedAgentId] = React.useState<string>(
    lead?.assignedAgentId || (connectedAgent && connectedAgent.role !== 'admin' ? connectedAgent.id : '')
  );
  const [createdAt] = React.useState<string>(lead?.createdAt || new Date().toISOString());

  // Tab state
  const [activeTab, setActiveTab] = React.useState<TabType>('conducteur');

  // Tab 1: Driver / Proposer
  const [driver, setDriver] = React.useState({
    nom: lead?.driver?.nom || '',
    prenom: lead?.driver?.prenom || '',
    adresse: lead?.driver?.adresse || '',
    codePostal: lead?.driver?.codePostal || '',
    ville: lead?.driver?.ville || '',
    tel: lead?.driver?.tel || '',
    email: lead?.driver?.email || '',
    dateNaissance: lead?.driver?.dateNaissance || '',
    datePermis: lead?.driver?.datePermis || '',
    carteProVtc: lead?.driver?.carteProVtc || '',
    dateCarteProVtc: lead?.driver?.dateCarteProVtc || '',
    experienceVtcAns: lead?.driver?.experienceVtcAns || 0
  });

  // Second Driver / Co-conducteur (optional)
  const [hasSecondDriver, setHasSecondDriver] = React.useState<boolean>(!!lead?.secondDriver);
  const [secondDriver, setSecondDriver] = React.useState({
    nom: lead?.secondDriver?.nom || '',
    prenom: lead?.secondDriver?.prenom || '',
    adresse: lead?.secondDriver?.adresse || '',
    codePostal: lead?.secondDriver?.codePostal || '',
    ville: lead?.secondDriver?.ville || '',
    tel: lead?.secondDriver?.tel || '',
    email: lead?.secondDriver?.email || '',
    dateNaissance: lead?.secondDriver?.dateNaissance || '',
    datePermis: lead?.secondDriver?.datePermis || ''
  });

  // Tab 2: Vehicle or Habitation details
  const [vehicle, setVehicle] = React.useState({
    immatriculation: lead?.vehicle?.immatriculation || '',
    marque: lead?.vehicle?.marque || '',
    modele: lead?.vehicle?.modele || '',
    dateMiseEnCirculation: lead?.vehicle?.dateMiseEnCirculation || '',
    dateAchat: lead?.vehicle?.dateAchat || '',
    usage: lead?.vehicle?.usage || (type === 'vtc' ? 'VTC' : 'Privé-Trajet'),
    stationnement: lead?.vehicle?.stationnement || 'Voie publique'
  });

  const [habitation, setHabitation] = React.useState({
    typeBien: lead?.habitation?.typeBien || 'appartement',
    qualiteAssure: lead?.habitation?.qualiteAssure || 'locataire',
    adresseBienDiffere: lead?.habitation?.adresseBienDiffere || false,
    adresseBien: lead?.habitation?.adresseBien || '',
    codePostalBien: lead?.habitation?.codePostalBien || '',
    villeBien: lead?.habitation?.villeBien || '',
    nombrePieces: lead?.habitation?.nombrePieces || 3,
    etage: lead?.habitation?.etage || 0,
    dependances: lead?.habitation?.dependances || false,
    cheminee: lead?.habitation?.cheminee || false,
    alarme: lead?.habitation?.alarme || false,
    piscine: lead?.habitation?.piscine || false,
    capitalMobilier: lead?.habitation?.capitalMobilier || 15000
  });

  // Tab 3: History (Antécédents)
  const [antecedent, setAntecedent] = React.useState({
    dejaAssure: lead?.antecedent?.dejaAssure ?? true,
    nombreMoisAssure: lead?.antecedent?.nombreMoisAssure || undefined,
    bonusMalus: lead?.antecedent?.bonusMalus ?? 0.85,
    aEuSinistres: lead?.antecedent?.aEuSinistres ?? false,
    nombreSinistres: lead?.antecedent?.nombreSinistres || 0,
    contratEnCours: lead?.antecedent?.contratEnCours ?? true,
    nomCompagnie: lead?.antecedent?.nomCompagnie || '',
    loiHamon: lead?.antecedent?.loiHamon ?? true,
    motifResiliation: lead?.antecedent?.motifResiliation || '',
    dateResiliation: lead?.antecedent?.dateResiliation || '',
    // Specific to License suspension/cancellation
    aEuSuspensionPermis: lead?.antecedent?.aEuSuspensionPermis ?? false,
    dateSuspensionPermis: lead?.antecedent?.dateSuspensionPermis || '',
    periodeSuspensionPermis: lead?.antecedent?.periodeSuspensionPermis || '',
    motifSuspensionPermis: lead?.antecedent?.motifSuspensionPermis || ''
  });

  const [sinistres, setSinistres] = React.useState<Sinistre[]>(lead?.antecedent?.sinistresDetails || []);

  // Tab 4: Proposition details
  const [proposition, setProposition] = React.useState({
    formuleSouhaitee: lead?.proposition?.formuleSouhaitee || '',
    fractionnementSouhaite: lead?.proposition?.fractionnementSouhaite || 'Mensuel',
    cotisationAnnuelle: lead?.proposition?.cotisationAnnuelle || 0,
    fraisDossier: lead?.proposition?.fraisDossier || 0,
    optionsSelectionnees: lead?.proposition?.optionsSelectionnees || [],
    dateEffetSouhaitee: lead?.proposition?.dateEffetSouhaitee || new Date().toISOString().split('T')[0]
  });

  // Tab 5: Attached Documents
  const [documents, setDocuments] = React.useState<LeadDocument[]>(lead?.documents || []);

  // Tab 6: Follow-up Next Action
  const [nextAction, setNextAction] = React.useState<NextAction>({
    type: lead?.nextAction?.type || 'appel',
    date: lead?.nextAction?.date || '',
    time: lead?.nextAction?.time || '10:00',
    details: lead?.nextAction?.details || '',
    executed: lead?.nextAction?.executed || false
  });
  const [hasScheduledNextAction, setHasScheduledNextAction] = React.useState(!!lead?.nextAction);

  // Tab 7: Email Composer states
  const [smtpConfig, setSmtpConfig] = React.useState(() => loadSMTPSettings());
  const [cabinetSettings] = React.useState(() => loadCabinetSettings());
  const [emailTemplates, setEmailTemplates] = React.useState(() => loadEmailTemplates());
  const [emailHistory, setEmailHistory] = React.useState<EmailHistory[]>(() => loadEmailHistory());
  const [trackingData, setTrackingData] = React.useState<Record<string, { openCount: number, opens: string[] }>>({});
  const [selectedTplId, setSelectedTplId] = React.useState('');
  const [emailSubject, setEmailSubject] = React.useState('');
  const [emailBody, setEmailBody] = React.useState('');
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);
  const [emailSendStatus, setEmailSendStatus] = React.useState<{ success: boolean; message: string } | null>(null);
  
  // Attachments states for Tab 7 Email
  const [includeDevisPDF, setIncludeDevisPDF] = React.useState(false);
  const [selectedDossierDocIds, setSelectedDossierDocIds] = React.useState<string[]>([]);
  const [customUploadedFiles, setCustomUploadedFiles] = React.useState<Array<{ filename: string; content: string }>>([]);

  // Helper to replace placeholders
  const replacePlaceholders = (text: string) => {
    let result = text;
    result = result.replace(/{client_nom}/g, driver.nom || '');
    result = result.replace(/{client_prenom}/g, driver.prenom || '');

    const freqSuffix = proposition.fractionnementSouhaite === 'Mensuel' ? 'par mois' :
                       proposition.fractionnementSouhaite === 'Trimestriel' ? 'par trimestre' :
                       proposition.fractionnementSouhaite === 'Semestriel' ? 'par semestre' : 'par an';

    const labelText = proposition.fractionnementSouhaite === 'Mensuel' ? 'mensuelle' :
                      proposition.fractionnementSouhaite === 'Trimestriel' ? 'trimestrielle' :
                      proposition.fractionnementSouhaite === 'Semestriel' ? 'semestrielle' : 'annuelle';

    // Smart replace of old label + value
    result = result.replace(/Cotisation annuelle\s*:\s*{cotisation_annuelle}\s*€/gi, `Cotisation ${labelText} : ${proposition.cotisationAnnuelle || '0'} €`);
    result = result.replace(/Cotisation annuelle\s*:\s*{cotisation_annuelle}/gi, `Cotisation ${labelText} : ${proposition.cotisationAnnuelle || '0'}`);

    // Fallback replacements
    result = result.replace(/{cotisation_annuelle}/g, String(proposition.cotisationAnnuelle || '0'));
    result = result.replace(/{cotisation}/g, `${proposition.cotisationAnnuelle || '0'} € (${freqSuffix})`);
    result = result.replace(/{cotisation_label}/g, `Cotisation ${labelText}`);

    result = result.replace(/{fractionnement}/g, proposition.fractionnementSouhaite || 'Mensuel');
    result = result.replace(/{date_effet}/g, proposition.dateEffetSouhaitee || '');
    result = result.replace(/{conseiller_nom}/g, connectedAgent?.nom || 'Votre Conseiller');
    result = result.replace(/{conseiller_prenom}/g, connectedAgent?.prenom || '');

    let cabinetNom = 'Votre Agence';
    try {
      const storedCabinet = localStorage.getItem('crm_cabinet');
      if (storedCabinet) {
        const parsed = JSON.parse(storedCabinet);
        if (parsed.nomCabinet) cabinetNom = parsed.nomCabinet;
      }
    } catch (e) {}
    result = result.replace(/{cabinet_nom}/g, cabinetNom);

    return result;
  };

  // Triggered when selecting a template
  const handleSelectTemplate = (tplId: string) => {
    setSelectedTplId(tplId);
    if (!tplId) {
      setEmailSubject('');
      setEmailBody('');
      return;
    }
    const found = emailTemplates.find(t => t.id === tplId);
    if (found) {
      setEmailSubject(replacePlaceholders(found.subject));
      setEmailBody(replacePlaceholders(found.body));
    }
  };

  // Submit send email via Express SMTP backend
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver.email) {
      setEmailSendStatus({ success: false, message: "L'adresse e-mail du client est manquante." });
      return;
    }

    setIsSendingEmail(true);
    setEmailSendStatus(null);

    try {
      const emailId = `email-${Date.now()}`;
      
      // Build custom attachments list
      const customAttachments: Array<{ filename: string; content: string }> = [];

      // 1. Check if we should auto-generate and include the Devis PDF
      if (includeDevisPDF) {
        const devisPDF = generateDevisPDF(true);
        if (devisPDF) {
          customAttachments.push({
            filename: devisPDF.filename,
            content: devisPDF.content
          });
        }
      }

      // 2. Add selected dossier documents
      selectedDossierDocIds.forEach(docId => {
        const doc = documents.find(d => d.id === docId);
        if (doc && doc.contentBase64) {
          customAttachments.push({
            filename: doc.name,
            content: doc.contentBase64
          });
        }
      });

      // 3. Add custom uploaded files for this mail
      customUploadedFiles.forEach(file => {
        customAttachments.push({
          filename: file.filename,
          content: file.content
        });
      });

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId,
          origin: window.location.origin,
          smtp: smtpConfig,
          to: driver.email,
          subject: emailSubject,
          body: emailBody,
          cabinet: cabinetSettings,
          agent: connectedAgent,
          customAttachments
        }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response received:", text);
        throw new Error(`Le serveur a renvoyé une réponse inattendue (Code ${response.status}). Veuillez réessayer d'ici quelques instants (le serveur est en cours de démarrage).`);
      }

      const data = await response.json();

      if (data.success) {
        // Track attachment filenames
        const attachmentNames = customAttachments.map(att => att.filename);

        // Store in email history list
        const newHistoryItem: EmailHistory = {
          id: emailId,
          leadId: lead?.id || 'unknown',
          senderId: connectedAgent?.id || 'unknown',
          senderName: connectedAgent ? `${connectedAgent.prenom} ${connectedAgent.nom}` : 'Conseiller',
          recipientEmail: driver.email,
          subject: emailSubject,
          body: emailBody,
          sentAt: new Date().toISOString(),
          attachments: attachmentNames
        };

        const updatedHistory = [newHistoryItem, ...emailHistory];
        setEmailHistory(updatedHistory);
        saveEmailHistory(updatedHistory);

        setEmailSendStatus({
          success: true,
          message: data.message || `L'e-mail a été envoyé avec succès via le serveur SMTP ${smtpConfig.host} !`
        });

        // Clear composer & attachments
        setSelectedTplId('');
        setEmailSubject('');
        setEmailBody('');
        setCustomUploadedFiles([]);
        setSelectedDossierDocIds([]);
      } else {
        setEmailSendStatus({
          success: false,
          message: data.message || "L'envoi a échoué. Veuillez vérifier la configuration SMTP dans l'onglet Paramètres."
        });
      }
    } catch (error: any) {
      setEmailSendStatus({
        success: false,
        message: `Erreur de communication avec le serveur : ${error.message || error}`
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const generateDevisPDF = (onlyReturnBase64 = false): { filename: string; content: string } | undefined => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Margins & Dimensions
      const marginX = 15;
      const rightX = 195; // 210 - 15
      const totalPages = 8;

      // Color scheme (Spring Theme - deep blues and bright orange accents)
      const springDeepBlue = [10, 50, 110];
      const springSkyBlue = [10, 80, 160];
      const springLightBlue = [235, 243, 252];
      const springOrange = [244, 117, 33];
      const textGrayDark = [30, 41, 59];
      const textGrayMedium = [100, 116, 139];
      const lineGray = [226, 232, 240];

      // Format dynamic / fallback client details
      const clientName = driver.nom && driver.prenom ? `${driver.prenom} ${driver.nom}` : "Madame SAB Kremer";
      const clientAddress = driver.adresse || "12 Rue de la République";
      const clientCity = driver.codePostal && driver.ville ? `${driver.codePostal} ${driver.ville}` : "69610 GREZIEU LE MARCHE";
      const clientPhone = driver.tel || "0662000000";
      const clientEmail = driver.email || "sab0000@gmail.com";

      // Date calculations
      let formattedDateEffet = "";
      if (proposition.dateEffetSouhaitee) {
        const parts = proposition.dateEffetSouhaitee.split('-');
        if (parts.length === 3) {
          formattedDateEffet = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
          formattedDateEffet = new Date(proposition.dateEffetSouhaitee).toLocaleDateString('fr-FR');
        }
      } else {
        formattedDateEffet = new Date().toLocaleDateString('fr-FR');
      }

      const todayDateObj = new Date();
      const today = todayDateObj.toLocaleDateString('fr-FR');

      const validityDateObj = new Date(todayDateObj.getTime() + 30 * 24 * 60 * 60 * 1000);
      const validityDate = validityDateObj.toLocaleDateString('fr-FR');

      const quoteNo = lead?.id ? lead.id.toUpperCase() : "NOUVEAU";
      const formula = proposition.formuleSouhaitee || 'Tous Risques Plénitude';

      // -------------------------------------------------------------
      // REUSABLE HEADER FUNCTION FOR ALL PAGES
      // -------------------------------------------------------------
      const drawHeader = (pageNumber: number) => {
        // Left Column: Intermédiaire
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(springDeepBlue[0], springDeepBlue[1], springDeepBlue[2]);
        doc.text("INTERMÉDIAIRE :", marginX, 12);
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(textGrayDark[0], textGrayDark[1], textGrayDark[2]);
        doc.text(cabinetSettings.nomCabinet || "CELESTE ASSURANCES", marginX, 16.5);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(textGrayDark[0], textGrayDark[1], textGrayDark[2]);
        doc.text(cabinetSettings.adresse || "12 RUE DE LA PART-DIEU", marginX, 21);
        doc.text(`${cabinetSettings.codePostal || "69003"} ${cabinetSettings.ville || "LYON"}`, marginX, 25.5);
        
        // Phone icon & text
        const iconX = marginX;
        doc.setDrawColor(springSkyBlue[0], springSkyBlue[1], springSkyBlue[2]);
        doc.setLineWidth(0.3);
        doc.rect(iconX, 28.2, 1.6, 2.8, 'S');
        doc.setFillColor(springSkyBlue[0], springSkyBlue[1], springSkyBlue[2]);
        doc.circle(iconX + 0.8, 30.2, 0.2, 'F');

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(textGrayDark[0], textGrayDark[1], textGrayDark[2]);
        doc.text(cabinetSettings.tel || "0481916266", marginX + 3.5, 30);

        // Email icon & text
        const mailY = 32.7;
        doc.setDrawColor(springSkyBlue[0], springSkyBlue[1], springSkyBlue[2]);
        doc.setLineWidth(0.3);
        doc.rect(iconX, mailY + 0.5, 2.2, 1.6, 'S');
        doc.line(iconX, mailY + 0.5, iconX + 1.1, mailY + 1.3);
        doc.line(iconX + 1.1, mailY + 1.3, iconX + 2.2, mailY + 0.5);

        doc.text(cabinetSettings.email || "celesteassurances@gmail.com", marginX + 3.5, mailY + 1.7);

        // Center Column: Custom Cabinet Logo & Name
        const logoX = 105;
        const logoY = 18;
        let logoDrawn = false;

        if (cabinetSettings.logoUrl) {
          try {
            // Scale and draw custom logo image centered at logoX, logoY
            const maxW = 34;
            const maxH = 14;
            doc.addImage(cabinetSettings.logoUrl, 'PNG', logoX - (maxW / 2), logoY - (maxH / 2) - 0.5, maxW, maxH, undefined, 'FAST');
            logoDrawn = true;
          } catch (err) {
            console.error("Failed to draw custom cabinet logo in PDF:", err);
          }
        }

        if (!logoDrawn) {
          // Draw a beautiful elegant minimalist badge with the cabinet's initials
          const rawCabinetName = cabinetSettings.nomCabinet || "CELESTE ASSURANCES";
          const initials = rawCabinetName
            .split(/[\s'-]+/)
            .filter(word => word.length > 0)
            .map(word => word[0])
            .slice(0, 3)
            .join("")
            .toUpperCase();

          doc.setFillColor(springDeepBlue[0], springDeepBlue[1], springDeepBlue[2]);
          doc.circle(logoX, logoY - 1, 6.5, 'F');
          
          doc.setDrawColor(springOrange[0], springOrange[1], springOrange[2]);
          doc.setLineWidth(0.3);
          doc.circle(logoX, logoY - 1, 5.8, 'S');

          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(initials.length > 2 ? 7 : 8);
          doc.setTextColor(255, 255, 255);
          doc.text(initials, logoX, logoY + 1.5, { align: 'center' });
        }
        
        // Brand Name Text: Custom Cabinet Name
        const brandName = (cabinetSettings.nomCabinet || "CELESTE ASSURANCES").toUpperCase();
        doc.setFont('Helvetica', 'bold');
        
        if (brandName.length > 22) {
          doc.setFontSize(8.5);
        } else if (brandName.length > 15) {
          doc.setFontSize(10.5);
        } else {
          doc.setFontSize(12);
        }
        doc.setTextColor(springDeepBlue[0], springDeepBlue[1], springDeepBlue[2]);
        doc.text(brandName, logoX, 29, { align: 'center' });
        
        // Thin horizontal lines framing the slogan
        doc.setDrawColor(springDeepBlue[0], springDeepBlue[1], springDeepBlue[2]);
        doc.setLineWidth(0.2);
        doc.line(logoX - 12, 30.8, logoX + 12, 30.8);
        doc.line(logoX - 12, 34.6, logoX + 12, 34.6);

        // Slogan Text
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(springDeepBlue[0], springDeepBlue[1], springDeepBlue[2]);
        const sloganText = cabinetSettings.nomCabinet ? "COURTAGE EN ASSURANCES" : "SIMPLE ET EFFICACE";
        doc.text(sloganText, logoX, 33.2, { align: 'center' });

        // Right Column: Prospect
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(springDeepBlue[0], springDeepBlue[1], springDeepBlue[2]);
        doc.text("PROSPECT :", rightX, 12, { align: 'right' });
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(textGrayDark[0], textGrayDark[1], textGrayDark[2]);
        doc.text(clientName, rightX, 16.5, { align: 'right' });
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(textGrayDark[0], textGrayDark[1], textGrayDark[2]);
        doc.text(clientAddress, rightX, 21, { align: 'right' });
        doc.text(clientCity, rightX, 25.5, { align: 'right' });

        // Dynamic Right Phone icon & text
        const phoneWidth = doc.getTextWidth(clientPhone);
        const rPhoneX = rightX - phoneWidth - 3.5;
        doc.setDrawColor(springSkyBlue[0], springSkyBlue[1], springSkyBlue[2]);
        doc.setLineWidth(0.3);
        doc.rect(rPhoneX, 28.2, 1.6, 2.8, 'S');
        doc.setFillColor(springSkyBlue[0], springSkyBlue[1], springSkyBlue[2]);
        doc.circle(rPhoneX + 0.8, 30.2, 0.2, 'F');

        doc.text(clientPhone, rightX, 30, { align: 'right' });

        // Dynamic Right Email icon & text
        const emailWidth = doc.getTextWidth(clientEmail);
        const rMailX = rightX - emailWidth - 3.5;
        doc.setDrawColor(springSkyBlue[0], springSkyBlue[1], springSkyBlue[2]);
        doc.setLineWidth(0.3);
        doc.rect(rMailX, mailY + 0.5, 2.2, 1.6, 'S');
        doc.line(rMailX, mailY + 0.5, rMailX + 1.1, mailY + 1.3);
        doc.line(rMailX + 1.1, mailY + 1.3, rMailX + 2.2, mailY + 0.5);

        doc.text(clientEmail, rightX, mailY + 1.7, { align: 'right' });
      };

      // -------------------------------------------------------------
      // REUSABLE FOOTER FUNCTION FOR ALL PAGES
      // -------------------------------------------------------------
      const drawFooter = (pageNumber: number) => {
        doc.setDrawColor(lineGray[0], lineGray[1], lineGray[2]);
        doc.setLineWidth(0.3);
        doc.line(marginX, 274, rightX, 274);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(textGrayMedium[0], textGrayMedium[1], textGrayMedium[2]);

        const disclaimer1 = "La présente offre ne constitue en aucun cas une garantie mais une offre tarifaire basée sur les déclarations faites par le Souscripteur.";
        const disclaimer2 = "Le présent document n'a aucune valeur contractuelle et le candidat à l'assurance ne pourra se prévaloir d'une quelconque garantie à ce titre.";
        doc.text(disclaimer1, marginX, 278);
        doc.text(disclaimer2, marginX, 281);

        const regulatoryText = `${cabinetSettings.nomCabinet || "CELESTE ASSURANCES"} - Société de courtage d'assurances. Adresse : ${cabinetSettings.adresse || "12 RUE DE LA PART-DIEU"} ${cabinetSettings.codePostal || "69003"} ${cabinetSettings.ville || "LYON"} - Tél : ${cabinetSettings.tel || "0481916266"} - Email : ${cabinetSettings.email || "celesteassurances@gmail.com"}. Siret : ${cabinetSettings.siret || "818 097 503"} - N° immatriculation ORIAS : ${cabinetSettings.orias || "16 001 238"} (www.orias.fr). Garantie financière et assurance de responsabilité civile professionnelle conformes aux articles L512-6 et L512-7 du Code des Assurances - Exerce sous contrôle de l'ACPR - 4, Place de Budapest - CS 92459 - 75436 PARIS CEDEX 09.`;
        const regulatoryLines = doc.splitTextToSize(regulatoryText, 140);
        doc.text(regulatoryLines, marginX, 284);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(textGrayDark[0], textGrayDark[1], textGrayDark[2]);
        doc.text(`Proposition d'Assurance N° ${quoteNo}`, rightX, 271, { align: 'right' });
        doc.text(`Page ${pageNumber} / ${totalPages}`, rightX, 284, { align: 'right' });
      };

      // Helper to draw a styled section header banner
      const drawSectionBanner = (title: string, yPos: number) => {
        doc.setFillColor(springLightBlue[0], springLightBlue[1], springLightBlue[2]);
        doc.setDrawColor(springSkyBlue[0], springSkyBlue[1], springSkyBlue[2]);
        doc.setLineWidth(0.4);
        doc.rect(marginX, yPos, 180, 6.5, 'FD');
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(springDeepBlue[0], springDeepBlue[1], springDeepBlue[2]);
        doc.text(title.toUpperCase(), 105, yPos + 4.5, { align: 'center' });
      };

      // -------------------------------------------------------------
      // PAGE 1: DESCRIPTION DU RISQUE ET DE L'ASSURÉ
      // -------------------------------------------------------------
      drawHeader(1);
      
      let y = 47;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(textGrayDark[0], textGrayDark[1], textGrayDark[2]);
      const insuranceTypeLabel = type === 'habitation' ? 'HABITATION' : type === 'vtc' ? 'AUTOMOBILE VTC' : 'AUTOMOBILE';
      doc.text(`Nous avons le plaisir de vous remettre votre PROPOSITION D'ASSURANCE ${insuranceTypeLabel} N° ${quoteNo}`, marginX, y);
      
      y += 5.5;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`Date d'effet souhaitée : ${formattedDateEffet}`, marginX, y);
      
      y += 5;
      doc.text(`Cette étude personnalisée est valable jusqu'au ${validityDate}`, marginX, y);
      
      y += 5.5;
      doc.setFontSize(7.5);
      doc.setTextColor(textGrayMedium[0], textGrayMedium[1], textGrayMedium[2]);
      const page1Intro = "Les prix indiqués sont établis en fonction des réponses aux questions qui vous ont été posées, des informations communiquées ainsi que des garanties choisies.";
      doc.text(page1Intro, marginX, y);

      y += 6;
      if (type === 'habitation') {
        drawSectionBanner("LE BIEN IMMOBILIER", y);
        y += 10;
        
        const hType = habitation.typeBien === 'maison' ? "Maison" : "Appartement";
        const hPieces = habitation.nombrePieces ? `${habitation.nombrePieces} pièces` : "4 pièces";
        const hStatut = habitation.qualiteAssure === 'proprietaire_occupant' ? "Propriétaire occupant" : 
                        habitation.qualiteAssure === 'locataire' ? "Locataire" : "Propriétaire non-occupant";
        const hCapital = habitation.capitalMobilier ? `${habitation.capitalMobilier.toLocaleString('fr-FR')} €` : "30 000 €";
        const hAdresse = habitation.adresseBienDiffere && habitation.adresseBien 
          ? habitation.adresseBien 
          : (driver.adresse || "12 rue de la Paix");
        const hVille = habitation.adresseBienDiffere && habitation.codePostalBien && habitation.villeBien
          ? `${habitation.codePostalBien} ${habitation.villeBien}`
          : (`${driver.codePostal || '69003'} ${driver.ville || 'LYON'}`);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(textGrayDark[0], textGrayDark[1], textGrayDark[2]);

        // Left col
        doc.text("Type de Bien :", marginX + 2, y);
        doc.text("Nombre de pièces :", marginX + 2, y + 5);
        doc.text("Qualité de l'assuré :", marginX + 2, y + 10);
        doc.text("Capital mobilier :", marginX + 2, y + 15);
        
        // Right col
        doc.text("Adresse du Bien :", 100, y);
        doc.text("Code postal / Ville :", 100, y + 5);
        doc.text("Présence d'alarmes :", 100, y + 10);
        doc.text("Dépendances / Garages :", 100, y + 15);

        doc.setFont('Helvetica', 'bold');
        doc.text(hType, marginX + 44, y);
        doc.text(hPieces, marginX + 44, y + 5);
        doc.text(hStatut, marginX + 44, y + 10);
        doc.text(hCapital, marginX + 44, y + 15);

        doc.text(hAdresse, 145, y);
        doc.text(hVille, 145, y + 5);
        doc.text("Oui (Standard de sécurité)", 145, y + 10);
        doc.text("Oui (Box fermé attenant)", 145, y + 15);
        
        y += 20;
      } else {
        // Auto / VTC
        drawSectionBanner("LE VEHICULE", y);
        y += 10;

        const vMarque = vehicle.marque || "DS";
        const vModele = vehicle.modele || "DS7 CROSSBACK";
        const vVersion = vehicle.version || "E-TENSE SO CHIC";
        const vGenre = vehicle.genre || "VEHICULE TOUT CHEMIN";
        const vTypeMine = vehicle.typeMine || "J4DGZU/DS04101";
        const vPower = vehicle.puissance ? `${vehicle.puissance} CV` : "10 CV";
        const vRemorque = vehicle.remorque || "jusqu'à 750KG";
        const vFinancement = vehicle.modeFinancement || "Comptant";
        
        const vMiseEnCirc = vehicle.dateMiseEnCirculation ? new Date(vehicle.dateMiseEnCirculation).toLocaleDateString('fr-FR') : "18/12/2020";
        const vAcquisition = vehicle.dateAchat ? new Date(vehicle.dateAchat).toLocaleDateString('fr-FR') : "18/12/2020";
        const vProprio = vehicle.proprietaire || "Le souscripteur (personne physique)";
        const vStationnement = vehicle.stationnement || "Box/Garage fermé";
        const vLieuStat = vehicle.codePostal && vehicle.ville ? `${vehicle.codePostal} ${vehicle.ville}` : "69610 GREZIEU LE MARCHE";
        const vImmat = vehicle.immatriculation || "FV-591-ZE";
        const vUsage = vehicle.usage || "Déplacements privés et Trajet travail";

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(textGrayDark[0], textGrayDark[1], textGrayDark[2]);

        // Left Col labels
        doc.text("Marque :", marginX + 2, y);
        doc.text("Modèle :", marginX + 2, y + 5);
        doc.text("Version :", marginX + 2, y + 10);
        doc.text("Puissance :", marginX + 2, y + 15);
        doc.text("Mode de financement :", marginX + 2, y + 20);

        // Right Col labels
        doc.text("Date de première mise en circulation :", 100, y);
        doc.text("Date d'acquisition :", 100, y + 5);
        doc.text("Propriétaire :", 100, y + 10);
        doc.text("Type de stationnement la nuit :", 100, y + 15);
        doc.text("Immatriculation :", 100, y + 20);
        doc.text("Quel est l'usage du véhicule?", 100, y + 25);

        // Left Col values
        doc.setFont('Helvetica', 'bold');
        doc.text(vMarque, marginX + 44, y);
        doc.text(vModele, marginX + 44, y + 5);
        doc.text(vVersion, marginX + 44, y + 10);
        doc.text(vPower, marginX + 44, y + 15);
        doc.text(vFinancement, marginX + 44, y + 20);

        // Right Col values
        doc.text(vMiseEnCirc, 148, y);
        doc.text(vAcquisition, 148, y + 5);
        doc.text(vProprio, 148, y + 10);
        doc.text(vStationnement, 148, y + 15);
        doc.text(vImmat, 148, y + 20);
        doc.text(vUsage, 148, y + 25);

        y += 30;
      }

      // Conductor Details
      drawSectionBanner(type === 'habitation' ? "LE(S) OCCUPANT(S)" : "LE(S) CONDUCTEUR(S)", y);
      y += 8;

      // Draw Conductor Comparison Table
      const tableStartY = y;
      doc.setFillColor(243, 244, 246);
      doc.rect(marginX, y, 180, 6.5, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(textGrayDark[0], textGrayDark[1], textGrayDark[2]);
      doc.text("CONDUCTEUR PRINCIPAL", marginX + 97.5, y + 4.5, { align: 'center' });
      doc.text("AUTRE CONDUCTEUR", marginX + 152.5, y + 4.5, { align: 'center' });

      y += 6.5;

      const condRows = [
        { label: "Titre - Nom - Prénom :", v1: clientName, v2: "Néant" },
        { label: "Date de naissance :", v1: driver.dateNaissance ? new Date(driver.dateNaissance).toLocaleDateString('fr-FR') : "17/11/1968", v2: "" },
        { label: "Lieu et département de naissance :", v1: driver.lieuNaissance && driver.departementNaissance ? `${driver.lieuNaissance} (${driver.departementNaissance})` : "FR (69)", v2: "" },
        { label: "Quel est votre lien avec l'assuré :", v1: "L'assuré lui-même", v2: "" },
        { label: "Situation :", v1: driver.situation || "Marié(e)", v2: "" },
        { label: "Profession :", v1: driver.profession || "Salarié", v2: "" },
        { label: "Permis valable en France et obtenu le :", v1: driver.datePermis ? new Date(driver.datePermis).toLocaleDateString('fr-FR') : "01/08/1991", v2: "" },
        { label: "Apprentissage anticipée de la conduite :", v1: driver.apprentissageAnticipe ? "Oui" : "Non", v2: "" },
        { label: "Au cours des 36 derniers mois, combien de mois assuré :", v1: "36", v2: "" },
        { label: "Au cours des 36 derniers mois, combien d'interruption :", v1: "0", v2: "" },
        { label: "Cette interruption concerne-t-elle le véhicule :", v1: "Non", v2: "" },
        { label: "Quel est votre CRM? :", v1: antecedent.bonusMalus !== undefined ? antecedent.bonusMalus.toFixed(2) : "0.50", v2: "0.50" }
      ];

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      condRows.forEach((r, idx) => {
        // Draw row bottom line
        doc.setDrawColor(lineGray[0], lineGray[1], lineGray[2]);
        doc.setLineWidth(0.2);
        doc.line(marginX, y + 5.5, rightX, y + 5.5);

        // Print values
        doc.setFont('Helvetica', 'bold');
        doc.text(r.label, marginX + 2, y + 4);
        
        doc.setFont('Helvetica', 'normal');
        doc.text(r.v1, marginX + 97.5, y + 4, { align: 'center' });
        doc.text(r.v2, marginX + 152.5, y + 4, { align: 'center' });

        y += 5.5;
      });

      // Draw table vertical borders
      doc.setDrawColor(lineGray[0], lineGray[1], lineGray[2]);
      doc.setLineWidth(0.3);
      doc.line(marginX, tableStartY, marginX, y);
      doc.line(marginX + 70, tableStartY, marginX + 70, y);
      doc.line(marginX + 125, tableStartY, marginX + 125, y);
      doc.line(rightX, tableStartY, rightX, y);
      doc.line(marginX, tableStartY, rightX, tableStartY);
      doc.line(marginX, y, rightX, y);

      drawFooter(1);

      // -------------------------------------------------------------
      // PAGE 2: ANTÉCÉDENTS ET ANALYSE DES BESOINS
      // -------------------------------------------------------------
      doc.addPage();
      drawHeader(2);

      y = 47;
      drawSectionBanner("LES ANTÉCÉDENTS", y);
      y += 10;

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(textGrayDark[0], textGrayDark[1], textGrayDark[2]);
      doc.text(`Nombre de sinistres responsables ou non, au cours des 36 derniers mois : ${sinistres.length}`, marginX, y);

      y += 4;
      // Draw grid headers
      doc.setFillColor(243, 244, 246);
      doc.rect(marginX, y, 180, 6, 'F');
      doc.setDrawColor(lineGray[0], lineGray[1], lineGray[2]);
      doc.rect(marginX, y, 180, 6, 'S');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text("Type", marginX + 5, y + 4);
      doc.text("Date", marginX + 40, y + 4);
      doc.text("Responsabilité", marginX + 75, y + 4);
      doc.text("Nature", marginX + 115, y + 4);
      doc.text("Conducteur", marginX + 155, y + 4);

      y += 6;
      if (sinistres.length === 0) {
        doc.setFont('Helvetica', 'normal');
        doc.text("Néant", marginX + 5, y + 4.5);
        doc.line(marginX, y + 7, rightX, y + 7);
        y += 7;
      } else {
        sinistres.forEach(s => {
          doc.setFont('Helvetica', 'normal');
          doc.text(s.type || "Accident", marginX + 5, y + 4.5);
          doc.text(s.date ? new Date(s.date).toLocaleDateString('fr-FR') : today, marginX + 40, y + 4.5);
          doc.text(`${s.responsabilite || 0}%`, marginX + 75, y + 4.5);
          doc.text(s.nature || "Matériel", marginX + 115, y + 4.5);
          doc.text("Principal", marginX + 155, y + 4.5);
          
          doc.line(marginX, y + 7, rightX, y + 7);
          y += 7;
        });
      }

      y += 2;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text("Dans les 36 derniers mois ou depuis sa date d'achat, le véhicule assuré n'a subi ni provoqué de dommages", marginX, y);
      doc.text("autres que les éventuels sinistres déclarés ci-dessus.", marginX, y + 3.5);

      y += 10;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text("Résiliation par ancien assureur", marginX, y);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Sur les 36 derniers mois, avez-vous été résilié par un précédent assureur ? : ${antecedent.dejaAssure ? 'Oui' : 'Non'}`, marginX, y + 4.5);
      
      y += 11;
      doc.text(`Avez-vous fait preuve d'une condamnation pour refus d'obtempérer ou défaut d'assurance ou délit de fuite ? : ${antecedent.aEuRefusObtemperer ? 'Oui' : 'Non'}`, marginX, y);
      y += 5;
      doc.text(`Avez-vous fait preuve d'une annulation de permis ? : ${antecedent.aEuAnnulationPermis ? 'Oui' : 'Non'}`, marginX, y);

      // Section Vos Besoins
      y += 11;
      drawSectionBanner("VOS BESOINS", y);
      y += 10;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      const vosBesoinsTxt = "Le présent document est établi conformément aux articles L 520-1 et R 520-1 du Code des Assurances. Il a pour finalité de définir vos besoins et de vous proposer le contrat le plus adapté à votre situation.\nVous avez défini les besoins suivants : disposer d'une protection renforcée avec une assistance étendue et une garantie du conducteur étendue.";
      const vosBesoinsLines = doc.splitTextToSize(vosBesoinsTxt, 180);
      doc.text(vosBesoinsLines, marginX, y);

      // Section Analyse des conseils
      y += 22;
      drawSectionBanner("ANALYSE DE VOS BESOINS ET NOS CONSEILS", y);
      y += 10;

      const conseilsTxt = `Après étude de vos besoins nous vous conseillons : une assistance confort complète (incluant l'assistance 0km panne et accident), une garantie personnelle du conducteur pour la couverture de votre dommage corporel à hauteur de 1 000 000 € en cas de sinistre responsable et compte tenu des caractéristiques de votre véhicule. Par conséquent, la souscription de la formule '${formula}' est recommandée pour assurer la pérennité totale de vos déplacements.`;
      const conseilsLines = doc.splitTextToSize(conseilsTxt, 180);
      doc.text(conseilsLines, marginX, y);

      // Section Votre Choix
      y += 25;
      drawSectionBanner(`VOTRE CHOIX : FORMULE ${formula.toUpperCase()}`, y);
      y += 10;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text("Suite à cette analyse, vous avez décidé de retenir parmi toutes les garanties et options proposées, celles qui apparaissent", marginX, y);
      doc.text("cochées ci-dessous dans notre catalogue de garanties :", marginX, y + 4);

      drawFooter(2);

      // -------------------------------------------------------------
      // PAGE 3: COMPARAISON DES GARANTIES DES 3 FORMULES
      // -------------------------------------------------------------
      doc.addPage();
      drawHeader(3);

      y = 47;
      drawSectionBanner("COMPARAISON DES GARANTIES DES 3 FORMULES", y);
      y += 10;

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(springDeepBlue[0], springDeepBlue[1], springDeepBlue[2]);
      doc.text(`Tableau comparatif - Votre choix : Formule ${formula.toUpperCase()}`, marginX, y);

      y += 5;

      // Determine active column based on selected formula
      let activeCol: number = 3; // Default to Formule 3
      const normFormula = formula.toLowerCase();
      if (type === 'habitation') {
        if (normFormula.includes('éco') || normFormula.includes('eco') || normFormula.includes('basique')) {
          activeCol = 1;
        } else if (normFormula.includes('standard') || normFormula.includes('multirisque') || normFormula.includes('moyen')) {
          activeCol = 2;
        } else {
          activeCol = 3;
        }
      } else if (type === 'vtc') {
        if (normFormula.includes('tiers pro') || normFormula.includes('tiers vtc') || normFormula.includes('simple')) {
          activeCol = 1;
        } else if (normFormula.includes('tiers vol') || normFormula.includes('vol-incendie') || normFormula.includes('étendu') || normFormula.includes('etendu') || normFormula.includes('+ vol')) {
          activeCol = 2;
        } else {
          activeCol = 3;
        }
      } else {
        // Auto Particulier
        if (normFormula.includes('tiers simple') || normFormula.includes('tiers/simple') || normFormula.includes('simple')) {
          activeCol = 1;
        } else if (normFormula.includes('tiers vol') || normFormula.includes('vol-incendie') || normFormula.includes('étendu') || normFormula.includes('etendu')) {
          activeCol = 2;
        } else {
          activeCol = 3;
        }
      }

      let headers = [];
      let guaranteesList = [];
      if (type === 'habitation') {
        headers = ["GARANTIES", "FORMULE ÉCONOMIQUE", "STANDARD / MULTIRISQUE", "CONFORT INTÉGRAL"];
        guaranteesList = [
          { name: "Responsabilité Civile (RC Vie Privée)", activeCols: [1, 2, 3] },
          { name: "Défense Pénale & Recours suite à sinistre", activeCols: [1, 2, 3] },
          { name: "Incendie, Tempête & Attentats", activeCols: [1, 2, 3] },
          { name: "Dégâts des Eaux (Recherche de fuite incluse)", activeCols: [2, 3] },
          { name: "Catastrophes Naturelles & Technologiques", activeCols: [2, 3] },
          { name: "Vol et Vandalisme", activeCols: [3] },
          { name: "Bris de Glace (Remplacement à neuf)", activeCols: [3] },
          { name: "Assistance Habitation 24h/24 Urgence", activeCols: [1, 2, 3] }
        ];
      } else if (type === 'vtc') {
        // VTC - completely separate from auto particulier
        headers = ["GARANTIES", "TIERS PRO VTC", "TIERS + VOL/INCENDIE PRO VTC", "TOUS RISQUES PROFESSIONNEL VTC"];
        guaranteesList = [
          { name: "Responsabilité Civile Professionnelle VTC", activeCols: [1, 2, 3] },
          { name: "Défense Pénale & Recours suite à accident", activeCols: [1, 2, 3] },
          { name: "Bris des Glaces", activeCols: [2, 3] },
          { name: "Vol, Tentative de Vol & Incendie", activeCols: [2, 3] },
          { name: "Dommages tous accidents & Vandalisme", activeCols: [3] },
          { name: "Assistance Professionnelle VTC 0 km", activeCols: [2, 3] },
          { name: "Garantie Personnelle du Conducteur VTC", activeCols: [1, 2, 3] },
          { name: "Aménagements Professionnels VTC", activeCols: [3] }
        ];
      } else {
        // Auto Particulier
        headers = ["GARANTIES", "TIERS SIMPLE", "TIERS ÉTENDU / CONFORT", "TOUS RISQUES"];
        guaranteesList = [
          { name: "Responsabilité Civile Corporelle & Matérielle", activeCols: [1, 2, 3] },
          { name: "Défense Pénale et Recours suite à accident", activeCols: [1, 2, 3] },
          { name: "Bris des Glaces", activeCols: [2, 3] },
          { name: "Vol et Tentative de Vol", activeCols: [2, 3] },
          { name: "Incendies & Forces de la nature", activeCols: [2, 3] },
          { name: "Dommages tous accidents / Vandalisme", activeCols: [3] },
          { name: "Assistance Confort (0 km Panne & Accident)", activeCols: [2, 3] },
          { name: "Garantie Personnelle du Conducteur (1 M€)", activeCols: [1, 2, 3] }
        ];
      }

      // Draw table header background
      doc.setFillColor(springDeepBlue[0], springDeepBlue[1], springDeepBlue[2]);
      doc.rect(marginX, y, 180, 9, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      
      // Draw headers
      doc.text(headers[0], marginX + 3, y + 5.8);
      doc.text(headers[1], marginX + 85, y + 5.8, { align: 'center' });
      doc.text(headers[2], marginX + 118, y + 5.8, { align: 'center' });
      doc.text(headers[3], marginX + 158, y + 5.8, { align: 'center' });

      y += 9;
      const comparisonTableStartY = y - 9;

      doc.setFontSize(7.5);
      guaranteesList.forEach((g, idx) => {
        // Alternating background
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(marginX, y, 180, 8.5, 'F');
        }

        doc.setDrawColor(lineGray[0], lineGray[1], lineGray[2]);
        doc.setLineWidth(0.2);
        doc.line(marginX, y + 8.5, rightX, y + 8.5);

        // Name
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(textGrayDark[0], textGrayDark[1], textGrayDark[2]);
        doc.text(g.name, marginX + 3, y + 5.5);

        // Columns checkmarks
        [1, 2, 3].forEach((colIdx) => {
          const isIncluded = g.activeCols.includes(colIdx);
          const colX = colIdx === 1 ? marginX + 85 : colIdx === 2 ? marginX + 118 : marginX + 158;
          
          if (isIncluded) {
            if (colIdx === activeCol) {
              // Chosen formula - Draw a beautiful bold GREEN checkmark!
              doc.setFont('Helvetica', 'bold');
              doc.setTextColor(16, 185, 129); // Beautiful emerald green
              doc.setFontSize(10.5);
              doc.text("✓", colX, y + 6, { align: 'center' });
            } else {
              // Other formula - Draw a soft gray checkmark
              doc.setFont('Helvetica', 'normal');
              doc.setTextColor(190, 200, 210); // Standard soft grey
              doc.setFontSize(8);
              doc.text("✓", colX, y + 5.5, { align: 'center' });
            }
          } else {
            // Not included
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(210, 220, 230);
            doc.setFontSize(8);
            doc.text("-", colX, y + 5.5, { align: 'center' });
          }
        });

        doc.setFontSize(7.5); // Reset size
        y += 8.5;
      });

      // Draw table vertical columns partition lines
      doc.setDrawColor(lineGray[0], lineGray[1], lineGray[2]);
      doc.setLineWidth(0.25);
      doc.line(marginX + 70, comparisonTableStartY, marginX + 70, y);
      doc.line(marginX + 102, comparisonTableStartY, marginX + 102, y);
      doc.line(marginX + 135, comparisonTableStartY, marginX + 135, y);

      // Draw table outline
      doc.setLineWidth(0.35);
      doc.line(marginX, comparisonTableStartY, marginX, y);
      doc.line(rightX, comparisonTableStartY, rightX, y);
      doc.line(marginX, y, rightX, y);

      // Add a visual legend
      y += 10;
      doc.setFillColor(16, 185, 129); // Emerald Green
      doc.rect(marginX, y - 2, 3, 3, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(textGrayDark[0], textGrayDark[1], textGrayDark[2]);
      doc.text(`En vert : garanties de votre formule choisie "${formula}"`, marginX + 5, y + 0.5);

      y += 6;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(textGrayMedium[0], textGrayMedium[1], textGrayMedium[2]);
      doc.text("Les garanties présentées ci-dessus sont définies conformément aux Dispositions Générales d'Assurance et d'Assistance en vigueur.", marginX, y);

      drawFooter(3);

      // -------------------------------------------------------------
      // PAGE 4: LES CLAUSES APPLICABLES
      // -------------------------------------------------------------
      doc.addPage();
      drawHeader(4);

      y = 47;
      drawSectionBanner("LES CLAUSES APPLICABLES", y);
      y += 10;

      // Clause Bonus-Malus
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(textGrayDark[0], textGrayDark[1], textGrayDark[2]);
      doc.text("Clause de réduction-majoration (bonus/malus)", marginX, y);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(textGrayDark[0], textGrayDark[1], textGrayDark[2]);
      doc.text("Les Conditions d'applications du CRM selon l'annexe à l'article A 121-1 du Code des Assurances et indiquées dans vos Dispositions Générales.", marginX, y + 4.5);

      y += 12;
      doc.setFont('Helvetica', 'bold');
      doc.text("Clauses usage", marginX, y);
      y += 4;
      doc.setFont('Helvetica', 'normal');
      doc.text("• Clause Déplacements privés ou professionnels :", marginX, y);
      y += 4;
      const clauseUsageTxt = "Le véhicule assuré est utilisé pour des déplacements privés, le trajet entre le domicile et le lieu de travail et des déplacements professionnels. Il ne sert en aucun cas à des tournées régulières de clientèle par des commerciaux, ni pour des transports à titre onéreux de voyageurs ou de marchandises.";
      doc.text(doc.splitTextToSize(clauseUsageTxt, 180), marginX, y);

      y += 14;
      doc.setFont('Helvetica', 'bold');
      doc.text("Clauses CSP", marginX, y);
      y += 4;
      doc.setFont('Helvetica', 'normal');
      doc.text("• Clause 104 - Salarié sédentaire :", marginX, y);
      y += 4;
      const clauseCSPTxt = "Vous déclarez que le conducteur habituel exerce uniquement la profession de salarié sédentaire, à l'exclusion de toute autre activité professionnelle, même occasionnelle.";
      doc.text(doc.splitTextToSize(clauseCSPTxt, 180), marginX, y);

      y += 12;
      doc.setFont('Helvetica', 'bold');
      doc.text("Clauses diverses", marginX, y);
      
      y += 4;
      doc.setFont('Helvetica', 'normal');
      doc.text("• Franchise conducteur novice (clause CN1) :", marginX, y);
      y += 4;
      const clauseCN1Txt = "Il sera fait application de la franchise de 750 €, si le véhicule assuré est conduit, au moment du sinistre totalement ou partiellement responsable, par une personne titulaire du permis de conduire depuis moins de 3 ans.\nToutefois, elle ne s'applique pas lorsque le véhicule est conduit par vous-même ou le conducteur principal.";
      doc.text(doc.splitTextToSize(clauseCN1Txt, 180), marginX, y);

      y += 12;
      doc.text("• Franchise conduite exclusive (clause CE1) :", marginX, y);
      y += 4;
      const clauseCE1Txt = "Il sera fait application de la franchise de 1500 €, si le véhicule assuré est conduit, au moment du sinistre totalement ou partiellement responsable, par une personne autre que le conducteur habituel ou son conjoint.";
      doc.text(doc.splitTextToSize(clauseCE1Txt, 180), marginX, y);

      y += 12;
      doc.text("• Présence de garage (clause CG1) :", marginX, y);
      y += 4;
      const clauseCG1Txt = "Vous déclarez disposer d'un garage clos et/ou couvert, individuel ou collectif et dans lequel vous remisez habituellement le véhicule assuré. Votre cotisation en tient compte. Si, au moment du sinistre, nous constatons que votre véhicule n'est pas garé dans votre garage clos et/ou couvert, le montant de votre indemnisation sera diminué en proportion.";
      doc.text(doc.splitTextToSize(clauseCG1Txt, 180), marginX, y);

      drawFooter(4);

      // -------------------------------------------------------------
      // PAGE 5: LES CLAUSES APPLICABLES
      // -------------------------------------------------------------
      doc.addPage();
      drawHeader(5);

      y = 47;
      drawSectionBanner("LES DECLARATIONS", y);
      y += 10;

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(textGrayDark[0], textGrayDark[1], textGrayDark[2]);
      
      const declHeader = `Je soussigné(e) ${clientName}, demeurant ${clientAddress} ${clientCity}, certifie que les informations précédentes et les réponses posées aux questions sont exactes.`;
      doc.text(doc.splitTextToSize(declHeader, 180), marginX, y);

      y += 10;
      doc.text("Je reconnais avoir été informé(e) que :", marginX, y);
      doc.setFont('Helvetica', 'normal');
      
      const informPoints = [
        "Toute fausse déclaration intentionnelle, omission ou déclaration inexacte m'expose aux sanctions prévues aux articles L.113-8 (nullité du contrat) et L.113-9 (réduction des indemnités en cas de sinistre) du Code des Assurances ;",
        "En cas de résiliation ou de suspension d'un contrat affecté d'au moins un sinistre survenu au cours des 24 derniers mois, ou par suite de manquement à ses obligations contractuelles, cette résiliation peut être enregistrée dans un fichier central professionnel ;",
        "Les garanties du contrat sont sans effet lorsqu'une interdiction de fournir un contrat ou un service s'impose à l'assureur du fait de sanction, restriction ou prohibition prévues par les lois et règlements."
      ];

      informPoints.forEach(p => {
        y += 4.5;
        doc.text("•", marginX + 2, y);
        doc.text(doc.splitTextToSize(p, 172), marginX + 6, y);
        y += doc.splitTextToSize(p, 172).length * 3.5;
      });

      y += 3;
      doc.setFont('Helvetica', 'bold');
      doc.text("Je certifie que :", marginX, y);
      doc.setFont('Helvetica', 'normal');

      const certifPoints1 = [
        "Je suis le titulaire du certificat d'immatriculation (ou mon conjoint) ;",
        "J'ai une résidence habituelle fixe ;",
        "Je suis le conducteur habituel du véhicule ;",
        `J'ai été informé(e) que je peux adresser toute réclamation à : ${cabinetSettings.email || "celesteassurances@gmail.com"}.`
      ];

      certifPoints1.forEach(p => {
        y += 4;
        doc.text("•", marginX + 2, y);
        doc.text(p, marginX + 6, y);
      });

      y += 8;
      doc.setFont('Helvetica', 'bold');
      doc.text("Je certifie que le véhicule assuré :", marginX, y);
      doc.setFont('Helvetica', 'normal');

      const certifPoints2 = [
        "Est immatriculé en France ;",
        "Est strictement de série courante avec le moteur standard du constructeur sans modification ;",
        "Ne présente aucun dommage de carrosserie ou de bris de glaces ;",
        "N'est pas utilisé pour le transport public de matériel, de voyageurs, taxi, ambulance ou auto-école."
      ];

      certifPoints2.forEach(p => {
        y += 4;
        doc.text("•", marginX + 2, y);
        doc.text(p, marginX + 6, y);
      });

      y += 8;
      doc.setFont('Helvetica', 'bold');
      doc.text("Je m'engage à transmettre à l'assureur à la conclusion du contrat :", marginX, y);
      doc.setFont('Helvetica', 'normal');

      const certifPoints3 = [
        "Le(s) relevé(s) d'information du conducteur désigné justifiant de ses antécédents d'assurance des 36 derniers mois ;",
        "Une photocopie du certificat d'immatriculation du véhicule assuré ;",
        "Une photocopie recto et verso du permis de conduire en cours de validité du conducteur désigné."
      ];

      certifPoints3.forEach(p => {
        y += 4;
        doc.text("•", marginX + 2, y);
        doc.text(doc.splitTextToSize(p, 172), marginX + 6, y);
        y += doc.splitTextToSize(p, 172).length * 2.8;
      });

      drawFooter(5);

      // -------------------------------------------------------------
      // PAGE 6: PROTECTIONS DES DONNÉES PERSONNELLES
      // -------------------------------------------------------------
      doc.addPage();
      drawHeader(6);

      y = 47;
      drawSectionBanner("DISPOSITIONS RELATIVES À LA PROTECTION DES DONNÉES PERSONNELLES", y);
      y += 10;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(textGrayDark[0], textGrayDark[1], textGrayDark[2]);

      const gdprTxt = `Nous recueillons vos données personnelles et les utilisons pour la gestion de cette demande et pour notre relation commerciale. Elles sont destinées prioritairement à votre courtier et aux entreprises du Groupe Allianz ; mais également aux différents organismes et partenaires directement impliqués dans votre contrat. Ces destinataires se situent parfois en dehors de l'Union européenne. Dans ce cas, nous concevons des garanties spécifiques pour assurer la protection complète de vos données.

Vos informations personnelles nous aident à mieux vous connaître et ainsi à vous proposer des solutions et services qui vous correspondent. Nous les conservons tout au long de la vie de votre contrat. Une fois ce dernier fermé, elles sont conservées pendant le délai de prescription.

Vous gardez bien sûr tout loisir d'y accéder, de demander leur rectification, portabilité ou effacement et de vous opposer à leur utilisation. Vous pouvez également prendre contact avec le Délégué à la Protection des Données Personnelles (DPO) pour toute information ou contestation (loi « Informatique et Libertés » du 6 janvier 1978). Pour cela, il vous suffit d'adresser une demande écrite à votre courtier dont les coordonnées figurent sur le présent document. Vous pouvez également vous adresser à la CNIL.

J'accepte de recevoir les offres commerciales personnalisées distribuées par mon courtier : Non

Le ciblage des offres commerciales peut être automatisé et basé sur des profils de clients ou de prospects. Pour plus de détails, reportez-vous aux documents contractuels, notamment les dispositions générales ou notices d'information et, de manière générale, aux sites internet d'Allianz et de votre courtier. Protéger nos clients et nous protéger nous-mêmes est au cœur de la politique de maîtrise des risques d'Allianz et de la lutte anti-fraude. Aussi, nous gardons la possibilité de vérifier ces informations et de saisir, si nécessaire, les autorités compétentes.`;

      doc.text(doc.splitTextToSize(gdprTxt, 180), marginX, y);

      drawFooter(6);

      // -------------------------------------------------------------
      // PAGE 7: COTISATIONS & ÉCHÉANCES Financières
      // -------------------------------------------------------------
      doc.addPage();
      drawHeader(7);

      y = 47;
      drawSectionBanner("COTISATIONS", y);
      y += 10;

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(textGrayDark[0], textGrayDark[1], textGrayDark[2]);

      // Pricing structure matching Spring style exactly
      const annualCotisation = proposition.cotisationAnnuelle || 1427.66;
      const taxes = annualCotisation * 0.1441; // estimate taxes
      const monthlyInstallments = ((annualCotisation - (proposition.fraisDossier || 110.0)) / 12).toFixed(2);

      // Simple Table layout
      doc.setFillColor(243, 244, 246);
      doc.rect(marginX, y, 180, 6.5, 'F');
      
      doc.text("Date d'effet souhaitée :", marginX + 3, y + 4.5);
      doc.setFont('Helvetica', 'normal');
      doc.text(formattedDateEffet, marginX + 50, y + 4.5);
      doc.setFont('Helvetica', 'bold');
      doc.text("Échéance principale :", marginX + 90, y + 4.5);
      doc.setFont('Helvetica', 'normal');
      doc.text("01/02", marginX + 130, y + 4.5);
      doc.setFont('Helvetica', 'bold');
      doc.text("Fractionnement :", marginX + 150, y + 4.5);
      doc.setFont('Helvetica', 'normal');
      doc.text(proposition.fractionnementSouhaite || "Mensuel", marginX + 175, y + 4.5);

      y += 12;

      // Cotisation details
      doc.setFillColor(springLightBlue[0], springLightBlue[1], springLightBlue[2]);
      doc.rect(marginX, y, 180, 7.5, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.text("Détail de la Cotisation", marginX + 3, y + 5);
      doc.text("Montant", marginX + 110, y + 5);
      doc.text("dont Taxes", marginX + 155, y + 5);

      y += 7.5;
      const feeLines = [
        { label: "Cotisation annuelle TTC ** :", val: `${annualCotisation.toFixed(2)} €`, tax: `${taxes.toFixed(2)} €` },
        { label: "- Dont DPRSA :", val: "12,71 €", tax: "1,05 €" },
        { label: "- Dont Catastrophes naturelles :", val: "20,69 €", tax: "3,16 €" },
        { label: "- Dont Assistance :", val: "75,14 €", tax: "11,46 €" }
      ];

      feeLines.forEach((l, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(marginX, y, 180, 7.5, 'F');
        }
        doc.setFont('Helvetica', 'bold');
        doc.text(l.label, marginX + 3, y + 5);
        doc.setFont('Helvetica', 'normal');
        doc.text(l.val, marginX + 110, y + 5);
        doc.text(l.tax, marginX + 155, y + 5);
        
        doc.line(marginX, y + 7.5, rightX, y + 7.5);
        y += 7.5;
      });

      y += 3;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(textGrayMedium[0], textGrayMedium[1], textGrayMedium[2]);
      doc.text("** TTC : Y compris les Taxes et les frais de répertoire au jour du quittancement (TVA sur les prestations d'assistance, Taxe de 6,50€).", marginX, y);
      doc.text(`Le tarif annuel TTC tient compte des frais de souscription de ${proposition.fraisDossier || 55.0} € et de courtage.`, marginX, y + 3);

      y += 8;
      // Cotisation due Box
      doc.setFillColor(springLightBlue[0], springLightBlue[1], springLightBlue[2]);
      doc.rect(marginX, y, 180, 10, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(springDeepBlue[0], springDeepBlue[1], springDeepBlue[2]);
      doc.text("Cotisation due TTC ***", marginX + 4, y + 6.5);
      doc.text(`${(annualCotisation - 67).toFixed(2)} €`, rightX - 5, y + 6.5, { align: 'right' });

      y += 15;
      drawSectionBanner("REGLEMENT A LA SOUSCRIPTION", y);
      y += 10;

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(textGrayDark[0], textGrayDark[1], textGrayDark[2]);
      
      doc.text("1er règlement pour souscription de * :", marginX + 3, y + 4);
      doc.setFont('Helvetica', 'normal');
      const firstReg = (annualCotisation * 0.18).toFixed(2);
      doc.text(`${firstReg} €`, marginX + 120, y + 4);

      y += 6;
      doc.setFont('Helvetica', 'bold');
      doc.text("dont frais de gestion :", marginX + 3, y + 4);
      doc.setFont('Helvetica', 'normal');
      doc.text(`${proposition.fraisDossier || 106.35} €`, marginX + 120, y + 4);

      y += 8;
      doc.setFillColor(243, 244, 246);
      doc.rect(marginX, y, 180, 8, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.text(`Puis 10 mensualités de :`, marginX + 3, y + 5.5);
      doc.text(`${monthlyInstallments} € *`, marginX + 120, y + 5.5);

      // Section Mentions Légales
      y += 14;
      drawSectionBanner("MENTIONS LEGALES", y);
      y += 10;

      doc.setFont('Helvetica', 'bold');
      doc.text("Compagnie d'assurance", marginX, y);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      const mAllianz = "Les garanties du contrat sont souscrites auprès d'Allianz IARD, Entreprise régie par le code des assurances. Société anonyme au capital de 991 967 200 euros, dont le siège social est situé : 1 cours Michelet, CS30051, 92076 Paris La Défense cedex. 542 110 291 RCS Nanterre et soumises à l'Autorité de contrôle prudentiel et de résolution (ACPR) sise 4, Place de Budapest-CS 92459-75436 PARIS cedex 09.";
      doc.text(doc.splitTextToSize(mAllianz, 180), marginX, y + 4);

      y += 18;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.text("Assisteur", marginX, y);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      const mAssist = "FILASSISTANCE, Société Anonyme au capital de 4 100 000 €, entreprise régie par le Code des assurances, inscrite au RCS de Nanterre sous le n° 433 012 689, enregistrée sous l'identifiant unique ADEME : FR329780_01LOPR, dont le siège social se situe au 108 Bureaux de la Colline, 92213 SAINT-CLOUD Cedex";
      doc.text(doc.splitTextToSize(mAssist, 180), marginX, y + 4);

      drawFooter(7);

      // -------------------------------------------------------------
      // PAGE 8: LE PROPOSANT ET SIGNATURES
      // -------------------------------------------------------------
      doc.addPage();
      drawHeader(8);

      y = 47;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(textGrayDark[0], textGrayDark[1], textGrayDark[2]);
      doc.text("Le présent document est notre réponse aux besoins et souhaits que vous avez exprimés.", marginX, y);
      doc.text("Toutefois, il ne constitue pas votre contrat d'assurance et ne vaut pas acceptation du risque et engage ni le proposant ni la", marginX, y + 4);
      doc.text("compagnie. Seule une police délivrée avec l'accord de la compagnie constatera l'engagement réciproque (article L 112-2 du Code des", marginX, y + 8);
      doc.text("Assurances).", marginX, y + 12);

      y += 18;
      drawSectionBanner("LE PROPOSANT", y);
      y += 6.5;

      // Draw signature box
      const sigStartY = y;
      doc.setDrawColor(lineGray[0], lineGray[1], lineGray[2]);
      doc.setLineWidth(0.4);
      doc.rect(marginX, y, 180, 50, 'S');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.text("Signature :", marginX + 4, y + 6);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text("Mention manuscrite \"Lu et approuvé\"", marginX + 4, y + 10);
      doc.text("Date :", marginX + 4, y + 18);
      doc.text("Lieu de signature :", marginX + 4, y + 26);

      // Courtier sign column on right
      doc.setFont('Helvetica', 'bold');
      doc.text("Le courtier, par délégation de la Compagnie", 120, y + 6);

      // Draw dynamic courtier signature path
      doc.setDrawColor(springSkyBlue[0], springSkyBlue[1], springSkyBlue[2]);
      doc.setLineWidth(0.55);
      doc.lines([
        [5, -3], [12, 8], [-4, -12], [8, 4], [14, -6], [-10, 8], [15, 0]
      ], 145, y + 24, [1, 1], 'S', true);

      drawFooter(8);

      // Save PDF
      const cleanCabinetName = (cabinetSettings.nomCabinet || "celeste").toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const prefix = type === 'habitation' ? 'habitation' : type === 'vtc' ? 'vtc' : 'auto';
      const pdfFileName = `devis_${prefix}_${cleanCabinetName}_${driver.nom?.toLowerCase() || 'client'}.pdf`;
      
      if (onlyReturnBase64) {
        const base64String = doc.output('datauristring');
        return { filename: pdfFileName, content: base64String };
      }

      doc.save(pdfFileName);
    } catch (err) {
      console.error("Failed to generate PDF quote:", err);
      if (!onlyReturnBase64) {
        alert("Une erreur s'est produite lors de la génération du devis PDF. Veuillez vérifier les informations saisies.");
      }
    }
  };

  // Load email tracking data from server
  const fetchTrackingData = React.useCallback(async () => {
    try {
      const response = await fetch('/api/email-status');
      if (response.ok) {
        const data = await response.json();
        setTrackingData(data);
      }
    } catch (error) {
      console.error("Error fetching email tracking data:", error);
    }
  }, []);

  React.useEffect(() => {
    if (activeTab === 'email') {
      fetchTrackingData();
      const interval = setInterval(fetchTrackingData, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchTrackingData]);

  // Synchronize dynamic default usage and presets based on type changes
  React.useEffect(() => {
    if (!isEdit) {
      if (type === 'vtc') {
        setVehicle(prev => ({ ...prev, usage: 'VTC' }));
        setProposition(prev => ({ ...prev, formuleSouhaitee: 'Tous Risques Professionnel VTC' }));
      } else if (type === 'auto') {
        setVehicle(prev => ({ ...prev, usage: 'Privé-Trajet' }));
        setProposition(prev => ({ ...prev, formuleSouhaitee: 'Tous Risques' }));
      } else if (type === 'habitation') {
        setProposition(prev => ({ ...prev, formuleSouhaitee: 'Multirisque Habitation' }));
      }
    }
  }, [type, isEdit]);

  // Handle adding claims in antecedents
  const handleAddSinistre = () => {
    const newSin: Sinistre = {
      id: `sin-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      date: new Date().toISOString().split('T')[0],
      nature: 'Accident non-responsable',
      responsabilityRate: 0
    };
    setSinistres([...sinistres, newSin]);
    setAntecedent(prev => ({ ...prev, nombreSinistres: sinistres.length + 1 }));
  };

  const handleRemoveSinistre = (id: string) => {
    const filtered = sinistres.filter(s => s.id !== id);
    setSinistres(filtered);
    setAntecedent(prev => ({ ...prev, nombreSinistres: filtered.length }));
  };

  const handleUpdateSinistre = (id: string, key: keyof Sinistre, val: any) => {
    const updated = sinistres.map(s => {
      if (s.id === id) {
        return { ...s, [key]: val };
      }
      return s;
    });
    setSinistres(updated);
  };

  // Simulated local file uploader
  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const newDoc: LeadDocument = {
          id: `doc-${Date.now()}-${i}`,
          name: file.name,
          type: file.type,
          uploadedAt: new Date().toISOString().split('T')[0],
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          contentBase64: base64
        };
        setDocuments(prev => [...prev, newDoc]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleToggleOption = (opt: string) => {
    const list = [...proposition.optionsSelectionnees];
    const index = list.indexOf(opt);
    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(opt);
    }
    setProposition(prev => ({ ...prev, optionsSelectionnees: list }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Verification
    if (!driver.nom || !driver.prenom || !driver.tel) {
      alert("Veuillez renseigner au moins le nom, le prénom et le téléphone du conducteur.");
      setActiveTab('conducteur');
      return;
    }

    const compiledLead: Lead = {
      id: lead?.id || `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      createdAt,
      updatedAt: new Date().toISOString(),
      driver: { ...driver },
      secondDriver: hasSecondDriver ? { ...secondDriver } : undefined,
      vehicle: type !== 'habitation' ? { ...vehicle } : undefined,
      habitation: type === 'habitation' ? { ...habitation } : undefined,
      antecedent: {
        ...antecedent,
        sinistresDetails: antecedent.aEuSinistres ? sinistres : []
      },
      proposition: { ...proposition },
      documents,
      qualificationId,
      nextAction: hasScheduledNextAction ? { ...nextAction } : undefined,
      assignedAgentId: assignedAgentId || undefined
    };

    onSave(compiledLead);
  };

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'conducteur', label: '1. Conducteur / Assuré', icon: User },
    { id: 'vehicule_bien', label: type === 'habitation' ? '2. Bien Habitation' : '2. Véhicule', icon: type === 'habitation' ? Home : Car },
    { id: 'antecedents', label: '3. Antécédents', icon: History },
    { id: 'proposition', label: '4. Proposition commerciale', icon: HandCoins },
    { id: 'documents', label: '5. Documents', icon: FileUp },
    { id: 'qualification', label: '6. Qualification & Rappel', icon: Tag },
    ...(isEdit ? [{ id: 'email' as TabType, label: '7. Envoyer un E-mail', icon: Mail }] : [])
  ];

  const getQualBadgeColor = (id: string) => {
    const qual = qualifications.find(q => q.id === id);
    if (!qual) return 'bg-slate-100 text-slate-800 border-slate-200';
    
    switch (qual.color) {
      case 'orange': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'amber': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'emerald': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'teal': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'rose': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'sky': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'indigo': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all overflow-y-auto" id="lead-editor-modal">
      <div className="bg-white rounded shadow-xl border border-slate-200 w-full max-w-5xl flex flex-col h-[90vh] overflow-hidden">
        
        {/* Header bar */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded text-white font-bold text-sm ${type === 'auto' ? 'bg-emerald-500' : type === 'vtc' ? 'bg-blue-500' : 'bg-amber-500'}`}>
              {type === 'auto' && <Car className="w-4 h-4" />}
              {type === 'vtc' && <Briefcase className="w-4 h-4" />}
              {type === 'habitation' && <Home className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {isEdit ? `Fiche Prospect : ${driver.prenom} ${driver.nom}` : "Création d'une nouvelle fiche prospect"}
              </h3>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                Type : {type === 'auto' ? 'Assurance Auto Particulier' : type === 'vtc' ? 'Assurance Auto VTC' : 'Assurance Habitation'} 
                {isEdit && ` • ID: ${lead.id}`}
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal content body split into sidebar tab-rail and form-panel */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Navigation rail */}
          <div className="w-56 border-r border-slate-200 bg-slate-50/50 p-3 space-y-4 flex flex-col shrink-0 overflow-y-auto">
            <div className="space-y-1">
              <div className="px-1 mb-2">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Catégorie d'Assurance</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['auto', 'vtc', 'habitation'] as LeadType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={isEdit} // cannot change type of existing lead to prevent database corruption
                      onClick={() => setType(t)}
                      className={`py-1 rounded text-[9px] font-bold border transition-all text-center ${
                        type === t 
                          ? 'bg-slate-900 text-white border-slate-900' 
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100 disabled:opacity-50'
                      }`}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200/60 my-2" />

              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block px-1 mb-1">Étapes du dossier</label>
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                const isCurrent = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-semibold border transition-all text-left ${
                      isCurrent 
                        ? 'bg-white border-slate-200 text-blue-600 shadow-xs font-bold' 
                        : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                  >
                    <TabIcon className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick status selection */}
            <div className="bg-white border border-slate-200 p-2.5 rounded space-y-2">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Qualification Actuelle</label>
              <select
                value={qualificationId}
                onChange={(e) => setQualificationId(e.target.value)}
                className="w-full text-xs font-semibold py-1 px-1.5 border border-slate-200 rounded bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
              >
                {qualifications.map(q => (
                  <option key={q.id} value={q.id}>{q.label}</option>
                ))}
              </select>
              <div className="text-[9px] mt-1 text-center font-mono">
                <span className={`px-2 py-0.5 rounded font-bold border ${getQualBadgeColor(qualificationId)}`}>
                  Visuel Actif
                </span>
              </div>
            </div>

            {/* Agent / Advisor assignment selection */}
            <div className="bg-white border border-slate-200 p-2.5 rounded space-y-2">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Affectation Conseiller</label>
              <select
                value={assignedAgentId}
                onChange={(e) => setAssignedAgentId(e.target.value)}
                disabled={connectedAgent?.role !== 'admin'}
                className="w-full text-xs font-semibold py-1 px-1.5 border border-slate-200 rounded bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 disabled:opacity-75 disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="">-- Non affecté --</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>
                    👤 {a.prenom} {a.nom}{a.active === false ? ' (Inactif)' : ''}
                  </option>
                ))}
              </select>
              {connectedAgent?.role !== 'admin' ? (
                <div className="text-[9px] mt-1 text-center font-mono text-slate-400">
                  ⚠️ Seul l'administrateur peut dispatcher ce prospect.
                </div>
              ) : (
                <div className="text-[9px] mt-1 text-center font-mono">
                  {assignedAgentId ? (
                    <span className="px-2 py-0.5 rounded font-bold border border-blue-200 bg-blue-50 text-blue-700">
                      Assigné
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded font-bold border border-slate-200 bg-slate-50 text-slate-400">
                      Non dispatché
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Form scrollable panel */}
          <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 bg-white flex flex-col justify-between">
            <div className="space-y-6">
              
              {/* TAB 1: Driver info */}
              {activeTab === 'conducteur' && (
                <div className="space-y-4">
                  <div className="pb-2 border-b border-slate-100">
                    <h4 className="font-bold text-slate-800 text-sm">Informations Personnelles de l'Assuré / Conducteur</h4>
                    <p className="text-xs text-slate-400">Renseignez les données d'identité du conducteur principal.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nom <strong className="text-rose-500">*</strong></label>
                      <input 
                        type="text" 
                        required
                        value={driver.nom} 
                        onChange={(e) => setDriver({...driver, nom: e.target.value})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
                        placeholder="DUPONT"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Prénom <strong className="text-rose-500">*</strong></label>
                      <input 
                        type="text" 
                        required
                        value={driver.prenom} 
                        onChange={(e) => setDriver({...driver, prenom: e.target.value})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
                        placeholder="Jean"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Téléphone portable <strong className="text-rose-500">*</strong></label>
                      <input 
                        type="tel" 
                        required
                        value={driver.tel} 
                        onChange={(e) => setDriver({...driver, tel: e.target.value})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-mono"
                        placeholder="06 12 34 56 78"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Adresse e-mail</label>
                      <input 
                        type="email" 
                        value={driver.email} 
                        onChange={(e) => setDriver({...driver, email: e.target.value})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
                        placeholder="jean.dupont@gmail.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Adresse postale</label>
                      <input 
                        type="text" 
                        value={driver.adresse} 
                        onChange={(e) => setDriver({...driver, adresse: e.target.value})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
                        placeholder="14 Avenue des Ternes"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Code Postal</label>
                      <input 
                        type="text" 
                        value={driver.codePostal} 
                        onChange={(e) => setDriver({...driver, codePostal: e.target.value})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-mono"
                        placeholder="75017"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ville</label>
                      <input 
                        type="text" 
                        value={driver.ville} 
                        onChange={(e) => setDriver({...driver, ville: e.target.value})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
                        placeholder="Paris"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date de naissance</label>
                      <input 
                        type="date" 
                        value={driver.dateNaissance} 
                        onChange={(e) => setDriver({...driver, dateNaissance: e.target.value})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date d'obtention du permis</label>
                      <input 
                        type="date" 
                        disabled={type === 'habitation'}
                        value={driver.datePermis} 
                        onChange={(e) => setDriver({...driver, datePermis: e.target.value})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-mono disabled:bg-slate-100 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* VTC specific fields */}
                  {type === 'vtc' && (
                    <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-4">
                      <h5 className="font-bold text-indigo-900 text-xs uppercase tracking-wider">Habilitation & Expérience VTC</h5>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">N° Carte Pro VTC</label>
                          <input 
                            type="text" 
                            value={driver.carteProVtc} 
                            onChange={(e) => setDriver({...driver, carteProVtc: e.target.value})}
                            className="w-full text-xs px-3 py-2 border border-indigo-200 rounded-lg bg-white focus:outline-none text-slate-700 font-mono"
                            placeholder="VTC-75-2023-12345"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">Délivrance carte VTC</label>
                          <input 
                            type="date" 
                            value={driver.dateCarteProVtc} 
                            onChange={(e) => setDriver({...driver, dateCarteProVtc: e.target.value})}
                            className="w-full text-xs px-3 py-2 border border-indigo-200 rounded-lg bg-white focus:outline-none text-slate-700 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">Expérience VTC (années)</label>
                          <input 
                            type="number" 
                            min="0"
                            value={driver.experienceVtcAns} 
                            onChange={(e) => setDriver({...driver, experienceVtcAns: parseInt(e.target.value) || 0})}
                            className="w-full text-xs px-3 py-2 border border-indigo-200 rounded-lg bg-white focus:outline-none text-slate-700 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Co-conducteur toggler */}
                  <div className="pt-4 mt-2 border-t border-slate-100">
                    <label className="inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={hasSecondDriver}
                        onChange={(e) => setHasSecondDriver(e.target.checked)}
                      />
                      <div className="relative w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                      <span className="ms-3 text-xs font-semibold text-slate-700">Ajouter un deuxième conducteur (Co-conducteur)</span>
                    </label>
                  </div>

                  {hasSecondDriver && (
                    <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-xl space-y-4 transition-all animate-fade-in">
                      <div className="pb-1 border-b border-emerald-100/50">
                        <h5 className="font-bold text-emerald-900 text-xs uppercase tracking-wider">Informations du deuxième conducteur</h5>
                        <p className="text-[10px] text-emerald-600/80">Saisissez les détails du co-conducteur désigné.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">Nom <strong className="text-rose-500">*</strong></label>
                          <input 
                            type="text" 
                            required={hasSecondDriver}
                            value={secondDriver.nom} 
                            onChange={(e) => setSecondDriver({...secondDriver, nom: e.target.value.toUpperCase()})}
                            className="w-full text-xs px-3 py-2 border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 bg-white"
                            placeholder="MARTIN"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">Prénom <strong className="text-rose-500">*</strong></label>
                          <input 
                            type="text" 
                            required={hasSecondDriver}
                            value={secondDriver.prenom} 
                            onChange={(e) => setSecondDriver({...secondDriver, prenom: e.target.value})}
                            className="w-full text-xs px-3 py-2 border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 bg-white"
                            placeholder="Sophie"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">Téléphone portable <strong className="text-rose-500">*</strong></label>
                          <input 
                            type="tel" 
                            required={hasSecondDriver}
                            value={secondDriver.tel} 
                            onChange={(e) => setSecondDriver({...secondDriver, tel: e.target.value})}
                            className="w-full text-xs px-3 py-2 border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 font-mono bg-white"
                            placeholder="06 00 00 00 00"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">Adresse e-mail</label>
                          <input 
                            type="email" 
                            value={secondDriver.email} 
                            onChange={(e) => setSecondDriver({...secondDriver, email: e.target.value})}
                            className="w-full text-xs px-3 py-2 border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 bg-white"
                            placeholder="sophie.martin@gmail.com"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">Adresse postale</label>
                          <input 
                            type="text" 
                            value={secondDriver.adresse} 
                            onChange={(e) => setSecondDriver({...secondDriver, adresse: e.target.value})}
                            className="w-full text-xs px-3 py-2 border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 bg-white"
                            placeholder="14 Avenue des Ternes"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">Code Postal</label>
                          <input 
                            type="text" 
                            value={secondDriver.codePostal} 
                            onChange={(e) => setSecondDriver({...secondDriver, codePostal: e.target.value})}
                            className="w-full text-xs px-3 py-2 border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 font-mono bg-white"
                            placeholder="75017"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">Ville</label>
                          <input 
                            type="text" 
                            value={secondDriver.ville} 
                            onChange={(e) => setSecondDriver({...secondDriver, ville: e.target.value})}
                            className="w-full text-xs px-3 py-2 border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 bg-white"
                            placeholder="Paris"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">Date de naissance</label>
                          <input 
                            type="date" 
                            value={secondDriver.dateNaissance} 
                            onChange={(e) => setSecondDriver({...secondDriver, dateNaissance: e.target.value})}
                            className="w-full text-xs px-3 py-2 border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 font-mono bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">Date d'obtention du permis</label>
                          <input 
                            type="date" 
                            value={secondDriver.datePermis} 
                            onChange={(e) => setSecondDriver({...secondDriver, datePermis: e.target.value})}
                            className="w-full text-xs px-3 py-2 border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 font-mono bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Vehicle details (for Auto / VTC) */}
              {activeTab === 'vehicule_bien' && type !== 'habitation' && (
                <div className="space-y-4">
                  <div className="pb-2 border-b border-slate-100">
                    <h4 className="font-bold text-slate-800 text-sm">Description du Véhicule à Assurer</h4>
                    <p className="text-xs text-slate-400">Renseignez les caractéristiques techniques du véhicule.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">N° Immatriculation</label>
                      <input 
                        type="text" 
                        value={vehicle.immatriculation} 
                        onChange={(e) => setVehicle({...vehicle, immatriculation: e.target.value})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-mono uppercase"
                        placeholder="AB-123-CD"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Marque du véhicule</label>
                      <input 
                        type="text" 
                        value={vehicle.marque} 
                        onChange={(e) => setVehicle({...vehicle, marque: e.target.value})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none text-slate-700"
                        placeholder="Peugeot, Toyota, Renault..."
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Modèle précis</label>
                      <input 
                        type="text" 
                        value={vehicle.modele} 
                        onChange={(e) => setVehicle({...vehicle, modele: e.target.value})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none text-slate-700"
                        placeholder="3008, Clio 5, Camry..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date de première mise en circulation</label>
                      <input 
                        type="date" 
                        value={vehicle.dateMiseEnCirculation} 
                        onChange={(e) => setVehicle({...vehicle, dateMiseEnCirculation: e.target.value})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date d'achat par le client</label>
                      <input 
                        type="date" 
                        value={vehicle.dateAchat} 
                        onChange={(e) => setVehicle({...vehicle, dateAchat: e.target.value})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Usage du véhicule</label>
                      <select 
                        value={vehicle.usage} 
                        onChange={(e) => setVehicle({...vehicle, usage: e.target.value})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none text-slate-700 bg-white"
                      >
                        {type === 'vtc' ? (
                          <>
                            <option value="VTC">VTC (Usage Professionnel spécifique)</option>
                            <option value="VTC_prive">VTC + Privé Trajet Personnel</option>
                          </>
                        ) : (
                          <>
                            <option value="Privé">Privé uniquement (Loisirs)</option>
                            <option value="Privé-Trajet">Privé - Trajet Travail quotidien</option>
                            <option value="Professionnel">Professionnel (Commercial, artisans)</option>
                            <option value="Tournées">Tournées de livraison</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Lieu de stationnement</label>
                      <select 
                        value={vehicle.stationnement} 
                        onChange={(e) => setVehicle({...vehicle, stationnement: e.target.value})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none text-slate-700 bg-white"
                      >
                        <option value="Garage clos">Garage clos individuel (Box)</option>
                        <option value="Parking privé">Parking privé intérieur collectif</option>
                        <option value="Parking privé clos">Parking privé extérieur clos</option>
                        <option value="Voie publique">Voie publique (Rue, trottoir)</option>
                        <option value="Jardin clos">Jardin clos individuel</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Habitation details (for Habitation) */}
              {activeTab === 'vehicule_bien' && type === 'habitation' && (
                <div className="space-y-4">
                  <div className="pb-2 border-b border-slate-100">
                    <h4 className="font-bold text-slate-800 text-sm">Description du Bien Immobilier</h4>
                    <p className="text-xs text-slate-400">Renseignez les caractéristiques de l'habitation.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Type de bien</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                          <input 
                            type="radio" 
                            name="typeBien" 
                            checked={habitation.typeBien === 'appartement'} 
                            onChange={() => setHabitation({...habitation, typeBien: 'appartement'})}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          Appartement
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                          <input 
                            type="radio" 
                            name="typeBien" 
                            checked={habitation.typeBien === 'maison'} 
                            onChange={() => setHabitation({...habitation, typeBien: 'maison'})}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          Maison Individuelle
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Qualité de l'assuré</label>
                      <select 
                        value={habitation.qualiteAssure} 
                        onChange={(e: any) => setHabitation({...habitation, qualiteAssure: e.target.value})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg text-slate-700 bg-white"
                      >
                        <option value="locataire">Locataire</option>
                        <option value="proprietaire_occupant">Propriétaire Occupant</option>
                        <option value="proprietaire_non_occupant">Propriétaire Non-Occupant (PNO)</option>
                      </select>
                    </div>
                  </div>

                  {/* Different address than driver? */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input 
                        type="checkbox" 
                        checked={habitation.adresseBienDiffere}
                        onChange={(e) => setHabitation({...habitation, adresseBienDiffere: e.target.checked})}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      L'adresse du bien à assurer est différente de l'adresse du conducteur/souscripteur
                    </label>

                    {habitation.adresseBienDiffere && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                        <div className="md:col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Adresse précise du bien</label>
                          <input 
                            type="text" 
                            value={habitation.adresseBien}
                            onChange={(e) => setHabitation({...habitation, adresseBien: e.target.value})}
                            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700"
                            placeholder="12 rue des Fleurs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Code Postal / Ville</label>
                          <div className="flex gap-1">
                            <input 
                              type="text" 
                              value={habitation.codePostalBien}
                              onChange={(e) => setHabitation({...habitation, codePostalBien: e.target.value})}
                              className="w-16 text-xs px-2 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 font-mono"
                              placeholder="69001"
                            />
                            <input 
                              type="text" 
                              value={habitation.villeBien}
                              onChange={(e) => setHabitation({...habitation, villeBien: e.target.value})}
                              className="flex-1 text-xs px-2 py-2 border border-slate-200 rounded-lg bg-white text-slate-700"
                              placeholder="Lyon"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Pièces principales</label>
                      <input 
                        type="number" 
                        min="1"
                        value={habitation.nombrePieces} 
                        onChange={(e) => setHabitation({...habitation, nombrePieces: parseInt(e.target.value) || 1})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg text-slate-700 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Étage (0 = RDC)</label>
                      <input 
                        type="number" 
                        min="0"
                        disabled={habitation.typeBien === 'maison'}
                        value={habitation.etage} 
                        onChange={(e) => setHabitation({...habitation, etage: parseInt(e.target.value) || 0})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg text-slate-700 font-mono disabled:bg-slate-100 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Capital Mobilier estimé (€)</label>
                      <input 
                        type="number" 
                        min="0"
                        step="5000"
                        value={habitation.capitalMobilier} 
                        onChange={(e) => setHabitation({...habitation, capitalMobilier: parseInt(e.target.value) || 0})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg text-slate-700 font-mono"
                        placeholder="30000"
                      />
                    </div>
                  </div>

                  {/* Yes/no checkboxes */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <h5 className="font-bold text-slate-600 text-xs mb-3">Éléments de sécurité & Aménagements</h5>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <label className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                        <input 
                          type="checkbox" 
                          checked={habitation.dependances}
                          onChange={(e) => setHabitation({...habitation, dependances: e.target.checked})}
                          className="rounded border-slate-300 text-indigo-600"
                        />
                        Dépendance / Cave
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                        <input 
                          type="checkbox" 
                          checked={habitation.cheminee}
                          onChange={(e) => setHabitation({...habitation, cheminee: e.target.checked})}
                          className="rounded border-slate-300 text-indigo-600"
                        />
                        Cheminée
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                        <input 
                          type="checkbox" 
                          checked={habitation.alarme}
                          onChange={(e) => setHabitation({...habitation, alarme: e.target.checked})}
                          className="rounded border-slate-300 text-indigo-600"
                        />
                        Alarme reliée
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                        <input 
                          type="checkbox" 
                          checked={habitation.piscine}
                          onChange={(e) => setHabitation({...habitation, piscine: e.target.checked})}
                          className="rounded border-slate-300 text-indigo-600"
                        />
                        Piscine
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: History (Antécédents) */}
              {activeTab === 'antecedents' && (
                <div className="space-y-5">
                  <div className="pb-2 border-b border-slate-100">
                    <h4 className="font-bold text-slate-800 text-sm">Historique d'Assurance du Client (Antécédents)</h4>
                    <p className="text-xs text-slate-400">Configurez le passif d'assurance et la sinistralité du prospect.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Insured before ? */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Le client a-t-il déjà été assuré ?</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                          <input 
                            type="radio" 
                            name="dejaAssure" 
                            checked={antecedent.dejaAssure === true} 
                            onChange={() => setAntecedent({...antecedent, dejaAssure: true})}
                            className="text-indigo-600"
                          />
                          Oui
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                          <input 
                            type="radio" 
                            name="dejaAssure" 
                            checked={antecedent.dejaAssure === false} 
                            onChange={() => setAntecedent({...antecedent, dejaAssure: false})}
                            className="text-indigo-600"
                          />
                          Non
                        </label>
                      </div>

                      {antecedent.dejaAssure && (
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 mt-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre de mois</label>
                            <input 
                              type="number" 
                              min="1"
                              value={antecedent.nombreMoisAssure || ''} 
                              onChange={(e) => setAntecedent({...antecedent, nombreMoisAssure: parseInt(e.target.value) || undefined})}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 font-mono"
                              placeholder="ex: 36"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Bonus / Malus CRM</label>
                            <input 
                              type="number" 
                              step="0.01" 
                              min="0.50" 
                              max="1.50"
                              value={antecedent.bonusMalus} 
                              onChange={(e) => setAntecedent({...antecedent, bonusMalus: parseFloat(e.target.value) || 1.00})}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 font-mono"
                              placeholder="ex: 0.50"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Contrat en cours details */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Un contrat est-il toujours en cours ?</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                          <input 
                            type="radio" 
                            name="contratEnCours" 
                            checked={antecedent.contratEnCours === true} 
                            onChange={() => setAntecedent({...antecedent, contratEnCours: true})}
                            className="text-indigo-600"
                          />
                          Oui
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                          <input 
                            type="radio" 
                            name="contratEnCours" 
                            checked={antecedent.contratEnCours === false} 
                            onChange={() => setAntecedent({...antecedent, contratEnCours: false})}
                            className="text-indigo-600"
                          />
                          Non (Résilié)
                        </label>
                      </div>

                      {/* Case A: contract in progress */}
                      {antecedent.contratEnCours ? (
                        <div className="pt-3 border-t border-slate-200 space-y-2 mt-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Nom de la compagnie actuelle</label>
                            <input 
                              type="text" 
                              value={antecedent.nomCompagnie}
                              onChange={(e) => setAntecedent({...antecedent, nomCompagnie: e.target.value})}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700"
                              placeholder="AXA, Allianz, Generali..."
                            />
                          </div>
                          <label className="flex items-center gap-2 text-[11px] text-indigo-700 font-semibold mt-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={antecedent.loiHamon}
                              onChange={(e) => setAntecedent({...antecedent, loiHamon: e.target.checked})}
                              className="rounded text-indigo-600"
                            />
                            Bénéficier de la résiliation Loi Hamon ?
                          </label>
                        </div>
                      ) : (
                        /* Case B: Cancelled contract */
                        <div className="pt-3 border-t border-slate-200 space-y-2 mt-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">Dernière Compagnie</label>
                              <input 
                                type="text" 
                                value={antecedent.nomCompagnie}
                                onChange={(e) => setAntecedent({...antecedent, nomCompagnie: e.target.value})}
                                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700"
                                placeholder="GMF, MACIF..."
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">Date de résiliation</label>
                              <input 
                                type="date" 
                                value={antecedent.dateResiliation}
                                onChange={(e) => setAntecedent({...antecedent, dateResiliation: e.target.value})}
                                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 font-mono"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Motif de la résiliation</label>
                            <select 
                              value={antecedent.motifResiliation}
                              onChange={(e) => setAntecedent({...antecedent, motifResiliation: e.target.value})}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700"
                            >
                              <option value="">Sélectionnez le motif...</option>
                              <option value="A l initiative de l assuré">À l'initiative de l'assuré (Échéance, Hamon)</option>
                              <option value="Non-paiement">Non-paiement de prime (Sinistre critique)</option>
                              <option value="Sinistralite">Résiliation Compagnie après sinistres</option>
                              <option value="Fausse declaration">Fausse déclaration ou omission</option>
                              <option value="Retrait de permis">Retrait de permis ou suspension</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Suspension / Annulation de permis (Specific to auto / vtc) */}
                  {(type === 'auto' || type === 'vtc') && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 flex-wrap gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                            Suspension ou annulation de permis ?
                          </label>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Le client a-t-il déjà fait l'objet d'une suspension ou annulation de son permis ?
                          </p>
                        </div>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer">
                            <input 
                              type="radio" 
                              name="aEuSuspensionPermis" 
                              checked={antecedent.aEuSuspensionPermis === true} 
                              onChange={() => setAntecedent({...antecedent, aEuSuspensionPermis: true})}
                              className="text-blue-600"
                            />
                            Oui
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer">
                            <input 
                              type="radio" 
                              name="aEuSuspensionPermis" 
                              checked={antecedent.aEuSuspensionPermis === false} 
                              onChange={() => setAntecedent({...antecedent, aEuSuspensionPermis: false})}
                              className="text-blue-600"
                            />
                            Non
                          </label>
                        </div>
                      </div>

                      {antecedent.aEuSuspensionPermis && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Date de la décision</label>
                            <input 
                              type="date" 
                              value={antecedent.dateSuspensionPermis}
                              onChange={(e) => setAntecedent({...antecedent, dateSuspensionPermis: e.target.value})}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Période / Durée (ex: 3 mois)</label>
                            <input 
                              type="text" 
                              value={antecedent.periodeSuspensionPermis}
                              onChange={(e) => setAntecedent({...antecedent, periodeSuspensionPermis: e.target.value})}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700"
                              placeholder="ex: 6 mois"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Motif de la suspension/annulation</label>
                            <select 
                              value={antecedent.motifSuspensionPermis}
                              onChange={(e) => setAntecedent({...antecedent, motifSuspensionPermis: e.target.value})}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700"
                            >
                              <option value="">Sélectionnez un motif...</option>
                              <option value="Alcoolemie">Alcoolémie positive</option>
                              <option value="Stupefiants">Usage de stupéfiants</option>
                              <option value="Exces de vitesse">Grand excès de vitesse</option>
                              <option value="Perte de points">Perte totale de points (Solde nul)</option>
                              <option value="Delit de fuite">Délit de fuite / Refus d'obtempérer</option>
                              <option value="Autre motif">Autre motif de suspension</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sinistres (Claims) */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Le client a-t-il eu des sinistres ?</label>
                        <div className="flex gap-4 mt-2">
                          <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                            <input 
                              type="radio" 
                              name="aEuSinistres" 
                              checked={antecedent.aEuSinistres === true} 
                              onChange={() => setAntecedent({...antecedent, aEuSinistres: true})}
                              className="text-indigo-600"
                            />
                            Oui
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                            <input 
                              type="radio" 
                              name="aEuSinistres" 
                              checked={antecedent.aEuSinistres === false} 
                              onChange={() => setAntecedent({...antecedent, aEuSinistres: false})}
                              className="text-indigo-600"
                            />
                            Non (Aucun incident)
                          </label>
                        </div>
                      </div>

                      {antecedent.aEuSinistres && (
                        <button
                          type="button"
                          onClick={handleAddSinistre}
                          className="px-3 py-1.5 text-[10px] font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Ajouter un sinistre
                        </button>
                      )}
                    </div>

                    {/* Sinistres Nested Rows */}
                    {antecedent.aEuSinistres && (
                      <div className="space-y-3">
                        {sinistres.length === 0 ? (
                          <div className="text-center py-4 text-xs text-slate-400">
                            Cliquez sur "Ajouter un sinistre" pour déclarer un incident.
                          </div>
                        ) : (
                          sinistres.map((sin, idx) => (
                            <div key={sin.id} className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col md:flex-row items-center gap-3">
                              <span className="text-xs font-bold text-slate-400 font-mono">#{idx+1}</span>
                              
                              {/* Date */}
                              <div className="w-full md:w-36">
                                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Date</label>
                                <input 
                                  type="date" 
                                  value={sin.date}
                                  onChange={(e) => handleUpdateSinistre(sin.id, 'date', e.target.value)}
                                  className="w-full text-xs px-2 py-1 border border-slate-200 rounded focus:outline-none font-mono"
                                />
                              </div>

                              {/* Nature */}
                              <div className="flex-1 w-full">
                                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Nature du sinistre</label>
                                <select
                                  value={sin.nature}
                                  onChange={(e) => handleUpdateSinistre(sin.id, 'nature', e.target.value)}
                                  className="w-full text-xs px-2 py-1 border border-slate-200 rounded focus:outline-none"
                                >
                                  {type === 'habitation' ? (
                                    <>
                                      <option value="Degat des eaux">Dégât des eaux</option>
                                      <option value="Incendie">Incendie / Explosion</option>
                                      <option value="Vol et vandalisme">Vol, Cambriolage & Vandalisme</option>
                                      <option value="Bris de glace">Bris de glace</option>
                                      <option value="Catastrophe naturelle">Catastrophe Naturelle / Tempête</option>
                                      <option value="Responsabilite civile">Responsabilité Civile Privée</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="Accident non-responsable">Accident non-responsable (0%)</option>
                                      <option value="Accident responsable">Accident responsable (100%)</option>
                                      <option value="Accident torts partages">Accident à torts partagés (50%)</option>
                                      <option value="Bris de glace">Bris de glace</option>
                                      <option value="Vol de vehicule">Vol ou tentative de vol</option>
                                      <option value="Incendie vandalisme">Incendie ou vandalisme</option>
                                      <option value="Sinistre parking">Choc à l'arrêt / Parking sans tiers</option>
                                    </>
                                  )}
                                </select>
                              </div>

                              {/* Responsibility Rate */}
                              <div className="w-full md:w-32">
                                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Responsabilité</label>
                                <select
                                  value={sin.responsabilityRate}
                                  onChange={(e) => handleUpdateSinistre(sin.id, 'responsabilityRate', parseInt(e.target.value))}
                                  className="w-full text-xs px-2 py-1 border border-slate-200 rounded focus:outline-none font-mono"
                                >
                                  <option value={0}>0% (Tiers responsable)</option>
                                  <option value={50}>50% (Partagée)</option>
                                  <option value={100}>100% (Responsable)</option>
                                </select>
                              </div>

                              {/* Remove */}
                              <button
                                type="button"
                                onClick={() => handleRemoveSinistre(sin.id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded mt-3 md:mt-0 transition-all self-end md:self-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Proposition details */}
              {activeTab === 'proposition' && (
                <div className="space-y-4">
                  <div className="pb-2 border-b border-slate-100">
                    <h4 className="font-bold text-slate-800 text-sm">Tarification et Options du Devis (Proposition)</h4>
                    <p className="text-xs text-slate-400">Renseignez la formule, les primes et les dates d'effet du dossier.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Formule souhaitée</label>
                      <input 
                        type="text" 
                        value={proposition.formuleSouhaitee} 
                        onChange={(e) => setProposition({...proposition, formuleSouhaitee: e.target.value})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none text-slate-700"
                        placeholder="ex: Tous Risques, Tiers étendu, Multirisque Confort..."
                      />
                      
                      {/* Formule Presets Helper */}
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {type === 'habitation' ? (
                          ['Économique', 'Standard / Multirisque', 'Confort Intégral'].map(f => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => setProposition({...proposition, formuleSouhaitee: f})}
                              className="text-[10px] px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md font-medium text-slate-600"
                            >
                              {f}
                            </button>
                          ))
                        ) : type === 'vtc' ? (
                          ['Tiers VTC', 'Tiers Vol-Incendie VTC', 'Tous Risques Pro VTC'].map(f => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => setProposition({...proposition, formuleSouhaitee: f})}
                              className="text-[10px] px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md font-medium text-slate-600"
                            >
                              {f}
                            </button>
                          ))
                        ) : (
                          ['Tiers Simple', 'Tiers Vol-Incendie', 'Tous Risques'].map(f => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => setProposition({...proposition, formuleSouhaitee: f})}
                              className="text-[10px] px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md font-medium text-slate-600"
                            >
                              {f}
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Fractionnement souhaité</label>
                      <select 
                        value={proposition.fractionnementSouhaite} 
                        onChange={(e: any) => setProposition({...proposition, fractionnementSouhaite: e.target.value})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none text-slate-700 bg-white"
                      >
                        <option value="Mensuel">Mensuel</option>
                        <option value="Trimestriel">Trimestriel</option>
                        <option value="Semestriel">Semestriel</option>
                        <option value="Annuel">Annuel</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Cotisation {
                          proposition.fractionnementSouhaite === 'Mensuel' ? 'Mensuelle' :
                          proposition.fractionnementSouhaite === 'Trimestriel' ? 'Trimestrielle' :
                          proposition.fractionnementSouhaite === 'Semestriel' ? 'Semestrielle' : 'Annuelle'
                        } TTC (€) <strong className="text-rose-500">*</strong>
                      </label>
                      <input 
                        type="number" 
                        min="0"
                        value={proposition.cotisationAnnuelle || ''} 
                        onChange={(e) => setProposition({...proposition, cotisationAnnuelle: parseFloat(e.target.value) || 0})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-mono font-bold"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Frais de dossier du cabinet (€) <strong className="text-rose-500">*</strong></label>
                      <input 
                        type="number" 
                        min="0"
                        value={proposition.fraisDossier || ''} 
                        onChange={(e) => setProposition({...proposition, fraisDossier: parseFloat(e.target.value) || 0})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-mono"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date d'effet souhaitée</label>
                      <input 
                        type="date" 
                        value={proposition.dateEffetSouhaitee} 
                        onChange={(e) => setProposition({...proposition, dateEffetSouhaitee: e.target.value})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-mono"
                      />
                    </div>
                  </div>

                  {/* Financial helper info */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                    <span className="font-semibold">Résumé financier pour le client :</span>
                    <span className="font-mono font-bold text-sm bg-white px-3 py-1 border border-emerald-200 rounded-lg shadow-sm">
                      {proposition.cotisationAnnuelle} € {
                        proposition.fractionnementSouhaite === 'Mensuel' ? '/ mois' :
                        proposition.fractionnementSouhaite === 'Trimestriel' ? '/ trimestre' :
                        proposition.fractionnementSouhaite === 'Semestriel' ? '/ semestre' : '/ an'
                      } {proposition.fraisDossier > 0 ? `+ ${proposition.fraisDossier} € frais de dossier` : ''}
                    </span>
                  </div>

                  {/* Options selection checklist */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Sélection des Garanties Optionnelles</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {type === 'habitation' ? (
                        <>
                          <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={proposition.optionsSelectionnees.includes('protection_juridique')}
                              onChange={() => handleToggleOption('protection_juridique')}
                              className="rounded border-slate-300 text-indigo-600"
                            />
                            Protection Juridique Étendue
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={proposition.optionsSelectionnees.includes('dommages_electriques')}
                              onChange={() => handleToggleOption('dommages_electriques')}
                              className="rounded border-slate-300 text-indigo-600"
                            />
                            Dommages Électriques aux appareils
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={proposition.optionsSelectionnees.includes('vol_vandalisme')}
                              onChange={() => handleToggleOption('vol_vandalisme')}
                              className="rounded border-slate-300 text-indigo-600"
                            />
                            Option Vol & Vandalisme renforcée
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={proposition.optionsSelectionnees.includes('canalisation_exterieure')}
                              onChange={() => handleToggleOption('canalisation_exterieure')}
                              className="rounded border-slate-300 text-indigo-600"
                            />
                            Garantie Canalisations extérieures
                          </label>
                        </>
                      ) : (
                        <>
                          <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={proposition.optionsSelectionnees.includes('assistance_0km')}
                              onChange={() => handleToggleOption('assistance_0km')}
                              className="rounded border-slate-300 text-indigo-600"
                            />
                            Assistance panne à 0 KM (Sans franchise)
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={proposition.optionsSelectionnees.includes('vehicule_remplacement')}
                              onChange={() => handleToggleOption('vehicule_remplacement')}
                              className="rounded border-slate-300 text-indigo-600"
                            />
                            Véhicule de remplacement / Assistance Mobilité
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={proposition.optionsSelectionnees.includes('valeur_achat_24m')}
                              onChange={() => handleToggleOption('valeur_achat_24m')}
                              className="rounded border-slate-300 text-indigo-600"
                            />
                            Remboursement Valeur d'Achat (24 mois)
                          </label>
                          {type === 'vtc' && (
                            <label className="flex items-center gap-2 text-xs text-indigo-800 font-bold cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={proposition.optionsSelectionnees.includes('rc_pro_exploitation')}
                                onChange={() => handleToggleOption('rc_pro_exploitation')}
                                className="rounded border-slate-300 text-indigo-600"
                              />
                              Inclusion Responsabilité Civile Pro Exploitation (RC Pro)
                            </label>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: Attached Documents */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="pb-2 border-b border-slate-100">
                    <h4 className="font-bold text-slate-800 text-sm">Gestion des Pièces Justificatives (Documents)</h4>
                    <p className="text-xs text-slate-400">Déposez et conservez les documents nécessaires pour la souscription.</p>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 hover:border-indigo-500 hover:bg-indigo-50/10 flex flex-col items-center justify-center text-center cursor-pointer relative transition-all">
                    <FileUp className="w-10 h-10 text-indigo-500 mb-3" />
                    <span className="text-xs font-semibold text-slate-700">Sélectionnez ou glissez vos justificatifs</span>
                    <span className="text-[10px] text-slate-400 mt-1">Permis de conduire, carte grise, relevé d'information, pièce d'identité...</span>
                    
                    {/* Real hidden file input overlaying entire box */}
                    <input 
                      type="file" 
                      multiple
                      onChange={handleFileDrop}
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                    />
                  </div>

                  {/* Display list of documents */}
                  <div className="space-y-2 mt-4">
                    <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Documents attachés ({documents.length})</h5>
                    {documents.length === 0 ? (
                      <div className="text-center py-8 text-xs border border-slate-100 rounded-xl text-slate-400">
                        Aucun document n'a été téléversé pour le moment.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                        {documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3.5 bg-white hover:bg-slate-50 text-xs">
                            <div className="flex items-center gap-2.5">
                              <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                              <div>
                                <span className="font-semibold text-slate-800 block line-clamp-1">{doc.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">Ajouté le {doc.uploadedAt} • {doc.size}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {doc.contentBase64 && (
                                <a 
                                  href={doc.contentBase64} 
                                  download={doc.name}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                                  title="Télécharger"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveDocument(doc.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: Follow-up Next Action */}
              {activeTab === 'qualification' && (
                <div className="space-y-4">
                  <div className="pb-2 border-b border-slate-100">
                    <h4 className="font-bold text-slate-800 text-sm">Gestion des Rappels & Prochaines Actions</h4>
                    <p className="text-xs text-slate-400">Déterminez la prochaine étape de relance de ce dossier.</p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hasScheduledNextAction}
                        onChange={(e) => setHasScheduledNextAction(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 w-4 h-4"
                      />
                      <span>Planifier une prochaine action de relance (Rappel Push actif)</span>
                    </label>

                    {hasScheduledNextAction && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 mt-2">
                        {/* Type */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Type de relance</label>
                          <select
                            value={nextAction.type}
                            onChange={(e: any) => setNextAction({...nextAction, type: e.target.value})}
                            className="w-full text-xs px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                          >
                            <option value="appel">☎️ Appel Téléphonique</option>
                            <option value="envoi_mail">📧 Envoi d'un Mail</option>
                            <option value="envoi_devis">📄 Envoi du Devis commercial</option>
                            <option value="relance_devis">⏱️ Relance Devis / Suivi</option>
                          </select>
                        </div>

                        {/* Date */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Date planifiée</label>
                          <input 
                            type="date" 
                            required={hasScheduledNextAction}
                            value={nextAction.date}
                            onChange={(e) => setNextAction({...nextAction, date: e.target.value})}
                            className="w-full text-xs px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none font-mono"
                          />
                        </div>

                        {/* Time */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Heure de rappel</label>
                          <input 
                            type="time" 
                            required={hasScheduledNextAction}
                            value={nextAction.time}
                            onChange={(e) => setNextAction({...nextAction, time: e.target.value})}
                            className="w-full text-xs px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {hasScheduledNextAction && (
                      <div className="space-y-2 pt-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase block">Consignes & Détails de l'action</label>
                        <textarea
                          rows={3}
                          value={nextAction.details}
                          onChange={(e) => setNextAction({...nextAction, details: e.target.value})}
                          placeholder="Notez ici les précisions de l'appel (ex: relancer à midi, proposer l'option assistance incluse...)"
                          className="w-full text-xs p-3 border border-slate-200 bg-white rounded-lg focus:outline-none text-slate-700"
                        />

                        <label className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mt-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={nextAction.executed}
                            onChange={(e) => setNextAction({...nextAction, executed: e.target.checked})}
                            className="rounded border-slate-300 text-emerald-600"
                          />
                          Cette action a déjà été exécutée et classée
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Browser notification notice */}
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded flex items-start gap-2 text-xs text-blue-900 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span>Le CRM intègre un système d'alertes automatiques.</span>
                      <p className="text-[10px] text-blue-500 mt-0.5 font-normal">
                        À l'heure exacte du rappel, le CRM jouera une sonnerie et affichera une notification de bureau si l'onglet est ouvert.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: Send Custom Email from CRM */}
              {activeTab === 'email' && (
                <div className="space-y-4 text-left">
                  <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Envoyer un Courriel au Client</h4>
                      <p className="text-xs text-slate-400">Rédigez ou sélectionnez un modèle d'e-mail pré-rempli à envoyer à ce prospect.</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {smtpConfig.configured ? (
                        <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1 font-mono">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                          SMTP ACTIF : {smtpConfig.host}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1 font-mono" title="Les e-mails seront simulés localement sans serveur de production">
                          ⚠️ ENVOI SIMULÉ (SMTP NON CONFIGURÉ)
                        </span>
                      )}
                    </div>
                  </div>

                  {!driver.email ? (
                    <div className="p-5 border border-rose-100 bg-rose-50 text-rose-900 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
                      <AlertTriangle className="w-8 h-8 text-rose-500" />
                      <span className="font-bold text-sm">Adresse e-mail manquante</span>
                      <p className="text-xs text-rose-700 max-w-md">
                        Ce prospect ne possède pas d'adresse e-mail renseignée dans la fiche. Veuillez d'abord ajouter une adresse e-mail valide dans l'onglet <strong>1. Conducteur / Assuré</strong> pour pouvoir lui écrire.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                      {/* Email Composition Form */}
                      <div className="lg:col-span-2 space-y-4">
                        <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Modèle d'E-mail</label>
                            <select
                              value={selectedTplId}
                              onChange={(e) => handleSelectTemplate(e.target.value)}
                              className="w-full text-xs font-semibold py-2 px-3 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
                            >
                              <option value="">-- Nouveau courriel personnalisé (Message libre) --</option>
                              {emailTemplates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Destinataire</label>
                              <input 
                                type="email" 
                                disabled
                                value={driver.email}
                                className="w-full text-xs px-3 py-2 border border-slate-200 bg-slate-100 rounded-lg text-slate-500 font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Expéditeur</label>
                              <input 
                                type="text" 
                                disabled
                                value={smtpConfig.configured ? `${smtpConfig.senderName} <${smtpConfig.senderEmail}>` : `${connectedAgent?.prenom || ''} ${connectedAgent?.nom || 'Conseiller'} <simulation-envoi@crm-cabinet.com>`}
                                className="w-full text-xs px-3 py-2 border border-slate-200 bg-slate-100 rounded-lg text-slate-500 font-sans"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sujet du Message</label>
                            <input 
                              type="text" 
                              required
                              value={emailSubject}
                              onChange={(e) => setEmailSubject(e.target.value)}
                              className="w-full text-xs px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                              placeholder="Entrez le sujet de votre e-mail..."
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Contenu de l'E-mail</label>
                            <textarea 
                              rows={10}
                              required
                              value={emailBody}
                              onChange={(e) => setEmailBody(e.target.value)}
                              className="w-full text-xs p-3 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans leading-relaxed text-slate-700"
                              placeholder="Rédigez votre e-mail ici..."
                            />
                          </div>

                          {/* Pièces Jointes Selection/Upload UI */}
                          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3.5">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                              <Paperclip className="w-4 h-4 text-indigo-600" />
                              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Pièces Jointes de l'E-mail</span>
                            </div>

                            <div className="space-y-3">
                              {/* Documents from lead dossier */}
                              {documents.length > 0 && (
                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Documents du dossier prospect à joindre</span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {documents.map(doc => {
                                      const isSelected = selectedDossierDocIds.includes(doc.id);
                                      return (
                                        <div 
                                          key={doc.id}
                                          onClick={() => {
                                            if (isSelected) {
                                              setSelectedDossierDocIds(prev => prev.filter(id => id !== doc.id));
                                            } else {
                                              setSelectedDossierDocIds(prev => [...prev, doc.id]);
                                            }
                                          }}
                                          className={`flex items-center gap-2 p-2.5 border rounded-lg text-xs cursor-pointer transition-all select-none ${
                                            isSelected 
                                              ? 'border-emerald-200 bg-emerald-50/40 text-emerald-950' 
                                              : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                                          }`}
                                        >
                                          <input 
                                            type="checkbox"
                                            checked={isSelected}
                                            readOnly
                                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 pointer-events-none"
                                          />
                                          <span className="truncate font-semibold flex-1 text-left" title={doc.name}>{doc.name}</span>
                                          <span className="text-[9px] text-slate-400 shrink-0 font-mono">{doc.size}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* 3. Custom manually uploaded attachments */}
                              <div className="space-y-2 pt-1 border-t border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ajouter d'autres fichiers externes</span>
                                
                                <div className="flex flex-wrap gap-2 items-center">
                                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-3xs">
                                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Parcourir...</span>
                                    <input 
                                      type="file"
                                      multiple
                                      className="hidden"
                                      onChange={(e) => {
                                        const files = e.target.files;
                                        if (!files) return;
                                        for (let i = 0; i < files.length; i++) {
                                          const file = files[i];
                                          const reader = new FileReader();
                                          reader.onload = (event) => {
                                            const base64 = event.target?.result as string;
                                            setCustomUploadedFiles(prev => [
                                              ...prev,
                                              { filename: file.name, content: base64 }
                                            ]);
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                        e.target.value = ''; // Reset input
                                      }}
                                    />
                                  </label>

                                  {customUploadedFiles.length === 0 ? (
                                    <span className="text-[10px] text-slate-400 italic">Aucun fichier externe ajouté</span>
                                  ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                      {customUploadedFiles.map((f, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 pl-2 pr-1.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-md text-[11px] font-medium shadow-3xs">
                                          <span className="truncate max-w-[150px] font-medium">{f.filename}</span>
                                          <button
                                            type="button"
                                            onClick={() => setCustomUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                                            className="text-amber-500 hover:text-amber-700 p-0.5 hover:bg-amber-100 rounded-sm cursor-pointer"
                                            title="Supprimer"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                            </div>
                          </div>

                          {emailSendStatus && (
                            <div className={`p-3 rounded text-xs flex items-start gap-2 border animate-fadeIn ${
                              emailSendStatus.success 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              {emailSendStatus.success ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <span className="font-bold block">{emailSendStatus.success ? 'E-mail envoyé' : 'Échec de l\'envoi'}</span>
                                <p className="mt-0.5 leading-relaxed text-[11px]">{emailSendStatus.message}</p>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end pt-2">
                            <button
                              type="button"
                              onClick={handleSendEmail}
                              disabled={isSendingEmail || !emailSubject || !emailBody}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>{isSendingEmail ? 'Envoi en cours...' : "Envoyer l'E-mail"}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right Panel: Sent Mail History Context */}
                      <div className="space-y-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-left">Historique d'envoi pour ce dossier</span>
                        
                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white max-h-[380px] overflow-y-auto">
                          {emailHistory.filter(h => h.leadId === lead?.id).length === 0 ? (
                            <div className="p-6 text-center text-slate-400 text-xs">
                              Aucun e-mail n'a encore été envoyé à ce prospect depuis le CRM.
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {emailHistory.filter(h => h.leadId === lead?.id).map((historyItem) => (
                                <div key={historyItem.id} className="p-3 hover:bg-slate-50 transition-colors text-left space-y-1">
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="font-bold text-indigo-600">{historyItem.senderName}</span>
                                    <span className="text-slate-400 font-mono">{new Date(historyItem.sentAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                  </div>
                                  <div className="text-xs font-semibold text-slate-800 truncate" title={historyItem.subject}>
                                    Sujet : {historyItem.subject}
                                  </div>
                                  <p className="text-[10px] text-slate-500 line-clamp-3 bg-slate-50 p-1.5 rounded font-sans border border-slate-100 whitespace-pre-line leading-relaxed">
                                    {historyItem.body}
                                  </p>

                                  {/* Sent Attachments Display */}
                                  {historyItem.attachments && historyItem.attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1 pt-1 border-t border-slate-100/50">
                                      {historyItem.attachments.map((attName, idx) => (
                                        <div key={idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-medium max-w-full truncate" title={attName}>
                                          <Paperclip className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                          <span className="truncate">{attName}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {(() => {
                                    const trackingInfo = trackingData[historyItem.id];
                                    return (
                                      <div className="flex items-center justify-between text-[10px] mt-1.5 pt-1.5 border-t border-slate-100/50">
                                        <div className="flex items-center gap-1.5">
                                          {trackingInfo && trackingInfo.openCount > 0 ? (
                                            <>
                                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                <span className="w-1 h-1 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                                                Ouvert {trackingInfo.openCount} {trackingInfo.openCount > 1 ? 'fois' : 'fois'}
                                              </span>
                                              <span className="text-slate-400 font-mono text-[9px]" title="Dernière ouverture">
                                                Le {new Date(trackingInfo.opens[trackingInfo.opens.length - 1]).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                                              </span>
                                            </>
                                          ) : (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-slate-50 text-slate-500 border border-slate-100">
                                              <span className="w-1 h-1 rounded-full bg-slate-300 mr-1"></span>
                                              Non ouvert
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const url = `${window.location.origin}/api/track-open/${historyItem.id}`;
                                                  window.open(url, '_blank');
                                                  setTimeout(fetchTrackingData, 1000);
                                                }}
                                                className="ml-2 text-indigo-500 hover:text-indigo-700 hover:underline font-bold"
                                                title="Tester le pixel de suivi localement en l'ouvrant dans un onglet"
                                              >
                                                (Tester)
                                              </button>
                                            </span>
                                          )}
                                        </div>
                                        {trackingInfo && trackingInfo.opens && trackingInfo.opens.length > 1 && (
                                          <span 
                                            className="text-indigo-600 font-medium text-[9px] border-b border-indigo-200 border-dashed cursor-help"
                                            title={trackingInfo.opens.map((o: string, index: number) => `Ouverture ${index + 1} : ${new Date(o).toLocaleString('fr-FR')}`).join('\n')}
                                          >
                                            Toutes les ouvertures
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-[10px] text-amber-900 leading-relaxed text-left space-y-1">
                          <span className="font-bold block flex items-center gap-1 text-amber-950">
                            <span>ℹ️</span> Note sur le suivi automatique :
                          </span>
                          <p>
                            Les messageries comme <strong>Gmail</strong> utilisent leurs propres serveurs (proxys d'images) pour charger les images externes. Comme l'URL de votre application de développement actuelle est privée (réservée à votre session Google), ces serveurs distants ne peuvent pas charger le pixel invisible de suivi automatique directement depuis votre messagerie de test.
                          </p>
                          <p className="text-amber-800 font-medium">
                            👉 Utilisez le bouton <strong>(Tester)</strong> à côté de "Non ouvert" pour simuler instantanément l'ouverture du mail dans votre navigateur et vérifier le suivi ! Le suivi automatique par e-mail fonctionnera de manière totalement transparente lorsque l'application sera sur une adresse publique (URL Partagée/Preview ou Production).
                          </p>
                        </div>

                        <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-[10px] text-indigo-900 leading-relaxed text-left">
                          <span className="font-bold block">💡 Info substitution automatique :</span>
                          Lors du choix d'un modèle, le CRM remplace automatiquement les variables par les données de ce prospect (ex: nom, montant, date d'effet) !
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Bottom Form Action Buttons */}
            <div className="border-t border-slate-150 pt-3.5 mt-4 flex items-center justify-between shrink-0">
              <div className="text-[10px] text-slate-400">
                <span className="text-slate-900 font-bold">*</span> Champs requis de base
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Enregistrer la fiche</span>
                </button>
              </div>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}
