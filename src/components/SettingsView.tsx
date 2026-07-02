/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  CabinetSettings, 
  QualificationStatus,
  SMTPSettings,
  EmailTemplate 
} from '../types';
import { 
  Building, 
  Tag, 
  Upload, 
  Trash2, 
  Plus, 
  Save, 
  Check, 
  ShieldAlert,
  Palette,
  FileText,
  Mail,
  Key,
  Server,
  Settings2,
  FileCode,
  Eye,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { playChime } from '../utils/notifications';
import { 
  loadSMTPSettings, 
  saveSMTPSettings, 
  loadEmailTemplates, 
  saveEmailTemplates 
} from '../utils/storage';

interface SettingsViewProps {
  cabinet: CabinetSettings;
  qualifications: QualificationStatus[];
  onSaveCabinet: (settings: CabinetSettings) => void;
  onSaveQualifications: (quals: QualificationStatus[]) => void;
}

const AVAILABLE_COLORS = [
  { id: 'orange', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', name: 'Orange' },
  { id: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', name: 'Ambre' },
  { id: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', name: 'Émeraude' },
  { id: 'teal', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500', name: 'Cyan / Saphir' },
  { id: 'rose', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', name: 'Rose / Rouge' },
  { id: 'sky', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dot: 'bg-sky-500', name: 'Ciel' },
  { id: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500', name: 'Indigo' }
];

export default function SettingsView({
  cabinet,
  qualifications,
  onSaveCabinet,
  onSaveQualifications
}: SettingsViewProps) {
  
  // Local state for Cabinet details
  const [cabinetState, setCabinetState] = React.useState<CabinetSettings>({ ...cabinet });
  const [qualsState, setQualsState] = React.useState<QualificationStatus[]>(
    qualifications.map(q => ({ ...q }))
  );
  
  // New qualification state
  const [newQualLabel, setNewQualLabel] = React.useState('');
  const [newQualColor, setNewQualColor] = React.useState('indigo');

  const [savingCabinet, setSavingCabinet] = React.useState(false);
  const [savingQuals, setSavingQuals] = React.useState(false);

  // Local state for SMTP
  const [smtpState, setSmtpState] = React.useState<SMTPSettings>(() => loadSMTPSettings());
  const [savingSmtp, setSavingSmtp] = React.useState(false);
  const [testingSmtp, setTestingSmtp] = React.useState(false);
  const [smtpTestResult, setSmtpTestResult] = React.useState<{ success: boolean; message: string } | null>(null);

  // Local state for Email Templates
  const [templatesState, setTemplatesState] = React.useState<EmailTemplate[]>(() => loadEmailTemplates());
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);
  const [savingTemplates, setSavingTemplates] = React.useState(false);

  // New Template creation inputs
  const [newTemplateName, setNewTemplateName] = React.useState('');
  const [newTemplateSubject, setNewTemplateSubject] = React.useState('');
  const [newTemplateBody, setNewTemplateBody] = React.useState('');

  // Logo file upload uploader
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCabinetState(prev => ({
        ...prev,
        logoUrl: base64
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setCabinetState(prev => ({
      ...prev,
      logoUrl: ''
    }));
  };

  // Submit handlers
  const handleSaveCabinetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCabinet(true);
    setTimeout(() => {
      onSaveCabinet(cabinetState);
      setSavingCabinet(false);
      playChime();
    }, 400);
  };

  const handleSaveQualifications = () => {
    setSavingQuals(true);
    setTimeout(() => {
      onSaveQualifications(qualsState);
      setSavingQuals(false);
      playChime();
    }, 400);
  };

  // Adding dynamic qualifications
  const handleAddQualification = () => {
    if (!newQualLabel.trim()) return;
    
    const id = `qual-custom-${Date.now()}`;
    const newQual: QualificationStatus = {
      id,
      label: newQualLabel.trim(),
      color: newQualColor,
      isSystem: false // Mark custom
    };

    const updated = [...qualsState, newQual];
    setQualsState(updated);
    setNewQualLabel('');
    onSaveQualifications(updated); // Save immediately
    playChime();
  };

  const handleRemoveQualification = (id: string) => {
    const updated = qualsState.filter(q => q.id !== id);
    setQualsState(updated);
    onSaveQualifications(updated); // Save immediately
  };

  const handleUpdateQualLabel = (id: string, label: string) => {
    const updated = qualsState.map(q => {
      if (q.id === id) {
        return { ...q, label };
      }
      return q;
    });
    setQualsState(updated);
  };

  const handleUpdateQualColor = (id: string, color: string) => {
    const updated = qualsState.map(q => {
      if (q.id === id) {
        return { ...q, color };
      }
      return q;
    });
    setQualsState(updated);
  };

  // Helper to get color classes
  const getColorClasses = (colorName: string) => {
    const config = AVAILABLE_COLORS.find(c => c.id === colorName);
    if (!config) return 'bg-slate-50 text-slate-700 border-slate-200';
    return `${config.bg} ${config.text} ${config.border}`;
  };

  // Save SMTP configuration
  const handleSaveSMTPSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSmtp(true);
    setTimeout(() => {
      const updatedSmtp = { ...smtpState, configured: true };
      setSmtpState(updatedSmtp);
      saveSMTPSettings(updatedSmtp);
      setSavingSmtp(false);
      playChime();
    }, 500);
  };

  // Real SMTP connection check via Express backend
  const handleTestSMTPConnection = async () => {
    if (!smtpState.host || !smtpState.user || !smtpState.pass || !smtpState.port) {
      setSmtpTestResult({
        success: false,
        message: "Erreur : Veuillez renseigner l'hôte, le port, l'utilisateur et le mot de passe."
      });
      return;
    }

    setTestingSmtp(true);
    setSmtpTestResult(null);

    try {
      const response = await fetch('/api/test-smtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: smtpState.host,
          port: smtpState.port,
          user: smtpState.user,
          pass: smtpState.pass,
          sslTls: smtpState.sslTls,
        }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response received:", text);
        throw new Error(`Le serveur a renvoyé une réponse inattendue (Code ${response.status}). Veuillez réessayer d'ici quelques instants (le serveur est en cours de démarrage).`);
      }

      const data = await response.json();
      
      setSmtpTestResult({
        success: data.success,
        message: data.message || (data.success ? "Connexion réussie !" : "La connexion a échoué.")
      });
      
      if (data.success) {
        playChime();
      }
    } catch (error: any) {
      setSmtpTestResult({
        success: false,
        message: `Erreur de connexion : ${error.message || error}`
      });
    } finally {
      setTestingSmtp(false);
    }
  };

  // Add new email template
  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim() || !newTemplateSubject.trim() || !newTemplateBody.trim()) return;

    const newTpl: EmailTemplate = {
      id: `template-custom-${Date.now()}`,
      name: newTemplateName.trim(),
      subject: newTemplateSubject.trim(),
      body: newTemplateBody.trim()
    };

    const updated = [...templatesState, newTpl];
    setTemplatesState(updated);
    saveEmailTemplates(updated);
    
    // reset fields
    setNewTemplateName('');
    setNewTemplateSubject('');
    setNewTemplateBody('');
    playChime();
  };

  // Delete an email template
  const handleDeleteTemplate = (id: string) => {
    const updated = templatesState.filter(t => t.id !== id);
    setTemplatesState(updated);
    saveEmailTemplates(updated);
    if (selectedTemplateId === id) {
      setSelectedTemplateId(null);
    }
  };

  // Update a template inline
  const handleUpdateTemplate = (id: string, updatedFields: Partial<EmailTemplate>) => {
    const updated = templatesState.map(t => {
      if (t.id === id) {
        return { ...t, ...updatedFields };
      }
      return t;
    });
    setTemplatesState(updated);
    saveEmailTemplates(updated);
  };

  return (
    <div className="space-y-6" id="settings-container">
      {/* Title Header */}
      <div className="pb-3 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Configuration & Paramètres</h2>
        <p className="text-xs text-slate-500">Personnalisez l'identité de votre cabinet et configurez vos statuts de vente.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Panel 1: Cabinet Identity & Logo */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Identité & Coordonnées</h3>
          </div>

          <form onSubmit={handleSaveCabinetSubmit} className="space-y-4">
            
            {/* Logo uploader */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Logo Officiel du Cabinet</label>
              
              <div className="flex items-center gap-4">
                {cabinetState.logoUrl ? (
                  <div className="relative group shrink-0">
                    <img 
                      src={cabinetState.logoUrl} 
                      alt="Logo du Cabinet" 
                      className="h-16 w-24 object-contain border border-slate-200 rounded p-1 bg-white shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-1 -right-1 bg-rose-500 text-white p-0.5 rounded shadow hover:bg-rose-600 transition-colors"
                      title="Supprimer le logo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="h-16 w-24 rounded border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-1 text-center text-slate-400 shrink-0">
                    <Building className="w-4 h-4 mb-0.5" />
                    <span className="text-[9px] font-semibold leading-normal">Aucun logo</span>
                  </div>
                )}

                <div className="flex-1 space-y-1">
                  <div className="relative inline-block">
                    <button
                      type="button"
                      className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-400" />
                      <span>Téléverser</span>
                    </button>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Recommandé : PNG ou JPG transparent, format horizontal.</p>
                </div>
              </div>
            </div>

            {/* Cabinet Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Nom du Cabinet</label>
                <input 
                  type="text" 
                  required
                  value={cabinetState.nomCabinet} 
                  onChange={(e) => setCabinetState({...cabinetState, nomCabinet: e.target.value})}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="ex: Alliance Courtage"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Numéro SIRET</label>
                <input 
                  type="text" 
                  value={cabinetState.siret} 
                  onChange={(e) => setCabinetState({...cabinetState, siret: e.target.value})}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded text-slate-700 focus:outline-none font-mono"
                  placeholder="843 902 911 00021"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Téléphone de contact</label>
                <input 
                  type="tel" 
                  value={cabinetState.tel} 
                  onChange={(e) => setCabinetState({...cabinetState, tel: e.target.value})}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded text-slate-700 focus:outline-none font-mono"
                  placeholder="01 02 03 04 05"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Email de contact</label>
                <input 
                  type="email" 
                  value={cabinetState.email} 
                  onChange={(e) => setCabinetState({...cabinetState, email: e.target.value})}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded text-slate-700 focus:outline-none"
                  placeholder="contact@cabinet.fr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Adresse</label>
                <input 
                  type="text" 
                  value={cabinetState.adresse} 
                  onChange={(e) => setCabinetState({...cabinetState, adresse: e.target.value})}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded text-slate-700 focus:outline-none"
                  placeholder="15 rue de Paris"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Code Postal / Ville</label>
                <div className="flex gap-1">
                  <input 
                    type="text" 
                    value={cabinetState.codePostal} 
                    onChange={(e) => setCabinetState({...cabinetState, codePostal: e.target.value})}
                    className="w-16 text-xs px-2 py-1.5 border border-slate-200 rounded text-slate-700 font-mono"
                    placeholder="75001"
                  />
                  <input 
                    type="text" 
                    value={cabinetState.ville} 
                    onChange={(e) => setCabinetState({...cabinetState, ville: e.target.value})}
                    className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded text-slate-700"
                    placeholder="Paris"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={savingCabinet}
                className="px-3.5 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingCabinet ? 'Enregistrement...' : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Sauvegarder les coordonnées</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* Panel 2: Sales funnels Qualifications States */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Cycle de Qualification</h3>
              </div>
              <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">FUNNEL COMMERCIAL</span>
            </div>

            {/* List of current qualifications */}
            <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {qualsState.map((qual) => (
                <div key={qual.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center gap-2 justify-between">
                  {/* Label editor */}
                  <input 
                    type="text" 
                    value={qual.label}
                    onChange={(e) => handleUpdateQualLabel(qual.id, e.target.value)}
                    className="flex-1 font-semibold text-slate-800 text-xs bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none py-0.5"
                  />

                  {/* Color Ring clicker selection */}
                  <div className="flex items-center gap-1">
                    {AVAILABLE_COLORS.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleUpdateQualColor(qual.id, c.id)}
                        className={`w-4 h-4 rounded-full ${c.dot} border relative transition-transform ${
                          qual.color === c.id ? 'scale-125 border-slate-900 z-10' : 'border-transparent scale-90 opacity-60 hover:opacity-100'
                        }`}
                        title={c.name}
                      >
                        {qual.color === c.id && (
                          <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">
                            ✓
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* State badge visual test */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getColorClasses(qual.color)}`}>
                    Aperçu
                  </span>

                  {/* Trash custom states */}
                  {!qual.isSystem ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveQualification(qual.id)}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Supprimer cette qualification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div className="w-6 text-center text-slate-300 select-none text-[9px] font-bold font-mono" title="État système verrouillé">
                      SYS
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add custom qualification box */}
            <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded space-y-2">
              <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1"><Palette className="w-3.5 h-3.5" /> Créer un nouveau statut</h4>
              
              <div className="flex gap-1.5">
                <input 
                  type="text" 
                  value={newQualLabel}
                  onChange={(e) => setNewQualLabel(e.target.value)}
                  className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="ex: Souscription signée"
                />
                
                <select
                  value={newQualColor}
                  onChange={(e) => setNewQualColor(e.target.value)}
                  className="text-xs border border-slate-200 bg-white py-1.5 px-2 rounded focus:outline-none text-slate-700 font-medium"
                >
                  {AVAILABLE_COLORS.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddQualification}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between mt-3">
            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Enregistré en direct.
            </span>
            <button
              type="button"
              onClick={handleSaveQualifications}
              disabled={savingQuals}
              className="px-3.5 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {savingQuals ? 'Enregistrement...' : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirmer la liste</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* 2nd Row: SMTP & Email Templates Configuration (Directeur Only) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6" id="smtp-templates-row">
        
        {/* Panel 3: SMTP Settings */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Serveur d'Envoi SMTP</h3>
              </div>
              <span className="text-[9px] font-extrabold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-mono">
                DIRECTEUR UNIQUE
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-2 text-left">
              Configurez les paramètres SMTP du cabinet d'assurance pour permettre aux conseillers d'envoyer des courriels directement aux clients depuis leur dossier CRM.
            </p>

            <form onSubmit={handleSaveSMTPSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Serveur SMTP</label>
                  <input 
                    type="text" 
                    required
                    value={smtpState.host} 
                    onChange={(e) => setSmtpState({...smtpState, host: e.target.value})}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    placeholder="smtp.votre-serveur.fr"
                  />
                </div>
                <div className="text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Port SMTP</label>
                  <input 
                    type="number" 
                    required
                    value={smtpState.port} 
                    onChange={(e) => setSmtpState({...smtpState, port: parseInt(e.target.value) || 587})}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Nom d'utilisateur</label>
                  <input 
                    type="text" 
                    required
                    value={smtpState.user} 
                    onChange={(e) => setSmtpState({...smtpState, user: e.target.value})}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="contact@agence.fr"
                  />
                </div>
                <div className="text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Mot de passe</label>
                  <input 
                    type="password" 
                    required
                    value={smtpState.pass} 
                    onChange={(e) => setSmtpState({...smtpState, pass: e.target.value})}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Nom de l'expéditeur</label>
                  <input 
                    type="text" 
                    required
                    value={smtpState.senderName} 
                    onChange={(e) => setSmtpState({...smtpState, senderName: e.target.value})}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Cabinet Courtage Alliance"
                  />
                </div>
                <div className="text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">E-mail de l'expéditeur</label>
                  <input 
                    type="email" 
                    required
                    value={smtpState.senderEmail} 
                    onChange={(e) => setSmtpState({...smtpState, senderEmail: e.target.value})}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="contact@agence.fr"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 text-left">
                <input 
                  type="checkbox" 
                  id="smtp-ssl"
                  checked={smtpState.sslTls} 
                  onChange={(e) => setSmtpState({...smtpState, sslTls: e.target.checked})}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="smtp-ssl" className="text-[11px] text-slate-600 font-medium select-none cursor-pointer">
                  Sécuriser la connexion via SSL / TLS (Chiffrement requis)
                </label>
              </div>

              {smtpTestResult && (
                <div className={`p-3 rounded text-xs flex items-start gap-2 border animate-fadeIn text-left ${
                  smtpTestResult.success 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {smtpTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold block">{smtpTestResult.success ? 'Succès SMTP' : 'Erreur SMTP'}</span>
                    <p className="mt-0.5 leading-relaxed">{smtpTestResult.message}</p>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleTestSMTPConnection}
                  disabled={testingSmtp}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {testingSmtp ? 'Test en cours...' : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Tester la connexion</span>
                    </>
                  )}
                </button>

                <button
                  type="submit"
                  disabled={savingSmtp}
                  className="px-3.5 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingSmtp ? 'Sauvegarde...' : 'Sauvegarder le SMTP'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Panel 4: Email Templates */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Modèles d'E-mails</h3>
              </div>
              <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">TEMPLATES</span>
            </div>

            <p className="text-xs text-slate-500 mt-2 text-left">
              Définissez ou modifiez les modèles de courriels d'assurance pré-remplis pour faire gagner du temps à vos conseillers.
            </p>

            {/* Existing templates dropdown/list */}
            <div className="mt-4 space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-left">Sélectionner un modèle à modifier</label>
              <div className="flex gap-2">
                <select
                  value={selectedTemplateId || ''}
                  onChange={(e) => setSelectedTemplateId(e.target.value || null)}
                  className="flex-1 text-xs border border-slate-200 bg-white py-1.5 px-3 rounded focus:outline-none text-slate-700 font-semibold"
                >
                  <option value="">-- Choisir un modèle --</option>
                  {templatesState.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>

                {selectedTemplateId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(selectedTemplateId)}
                    className="px-2.5 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    title="Supprimer ce modèle"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer</span>
                  </button>
                )}
              </div>

              {/* Template Editor Section */}
              {selectedTemplateId && (() => {
                const tpl = templatesState.find(t => t.id === selectedTemplateId);
                if (!tpl) return null;
                return (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-3 animate-fadeIn text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase font-mono tracking-wider">Éditeur de modèle</span>
                      <span className="text-[9px] text-slate-400">Enregistrement automatique en direct</span>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Nom du modèle</label>
                      <input 
                        type="text" 
                        value={tpl.name}
                        onChange={(e) => handleUpdateTemplate(tpl.id, { name: e.target.value })}
                        className="w-full text-xs font-bold px-2.5 py-1.5 border border-slate-200 bg-white rounded text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Sujet de l'E-mail</label>
                      <input 
                        type="text" 
                        value={tpl.subject}
                        onChange={(e) => handleUpdateTemplate(tpl.id, { subject: e.target.value })}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded text-slate-800 focus:outline-none font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Contenu du message</label>
                      <textarea 
                        rows={6}
                        value={tpl.body}
                        onChange={(e) => handleUpdateTemplate(tpl.id, { body: e.target.value })}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded text-slate-700 focus:outline-none font-sans leading-relaxed"
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Add New Template Creator */}
              {!selectedTemplateId && (
                <form onSubmit={handleAddTemplate} className="p-3 bg-indigo-50/40 border border-indigo-100 rounded space-y-3 text-left">
                  <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Créer un nouveau modèle pré-rempli
                  </h4>

                  <div className="grid grid-cols-1 gap-2.5">
                    <div>
                      <input 
                        type="text" 
                        required
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="Nom du modèle (ex: Relance signature)"
                      />
                    </div>
                    <div>
                      <input 
                        type="text" 
                        required
                        value={newTemplateSubject}
                        onChange={(e) => setNewTemplateSubject(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="Sujet du courriel"
                      />
                    </div>
                    <div>
                      <textarea 
                        rows={4}
                        required
                        value={newTemplateBody}
                        onChange={(e) => setNewTemplateBody(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                        placeholder="Contenu du message... Utilisez {client_nom}, {client_prenom}, etc."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Ajouter le modèle
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Variables Guide */}
            <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-500 space-y-1 text-left">
              <span className="font-bold text-slate-600 block">Variables de substitution utilisables :</span>
              <div className="flex flex-wrap gap-1 mt-1 font-mono">
                <span className="bg-white border border-slate-200 px-1 rounded text-slate-600" title="Nom de famille">{`{client_nom}`}</span>
                <span className="bg-white border border-slate-200 px-1 rounded text-slate-600" title="Prénom">{`{client_prenom}`}</span>
                <span className="bg-white border border-slate-200 px-1 rounded text-slate-600" title="Cotisation">{`{cotisation_annuelle}`}</span>
                <span className="bg-white border border-slate-200 px-1 rounded text-slate-600" title="Fractionnement">{`{fractionnement}`}</span>
                <span className="bg-white border border-slate-200 px-1 rounded text-slate-600" title="Date d'effet">{`{date_effet}`}</span>
                <span className="bg-white border border-slate-200 px-1 rounded text-slate-600" title="Conseiller nom">{`{conseiller_nom}`}</span>
                <span className="bg-white border border-slate-200 px-1 rounded text-slate-600" title="Conseiller prénom">{`{conseiller_prenom}`}</span>
                <span className="bg-white border border-slate-200 px-1 rounded text-slate-600" title="Cabinet">{`{cabinet_nom}`}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
