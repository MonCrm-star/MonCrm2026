/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Lead, LeadType, QualificationStatus, Agent } from '../types';
import { 
  Search, 
  Plus, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Trash2, 
  Edit, 
  Car, 
  Home, 
  Briefcase, 
  ChevronRight, 
  AlertCircle,
  HelpCircle,
  Check,
  X
} from 'lucide-react';
import { parseExcelFile, exportLeadsToExcel, downloadTemplateExcel, downloadSimpleTemplateExcel } from '../utils/excel';

interface LeadsViewProps {
  leads: Lead[];
  qualifications: QualificationStatus[];
  agents: Agent[];
  connectedAgent: Agent | null;
  onAddLead: () => void;
  onSelectLead: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  onImportLeads: (imported: Partial<Lead>[]) => void;
}

export default function LeadsView({
  leads,
  qualifications,
  agents = [],
  connectedAgent,
  onAddLead,
  onSelectLead,
  onDeleteLead,
  onImportLeads
}: LeadsViewProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [agentFilter, setAgentFilter] = React.useState<string>(
    connectedAgent && connectedAgent.role !== 'admin' ? connectedAgent.id : 'all'
  );
  
  // File upload reference
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [importing, setImporting] = React.useState(false);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [showTemplateMenu, setShowTemplateMenu] = React.useState(false);

  // Filter computation
  const filteredLeads = React.useMemo(() => {
    return leads.filter(lead => {
      // Search term
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = 
        lead.driver.nom.toLowerCase().includes(searchLower) ||
        lead.driver.prenom.toLowerCase().includes(searchLower) ||
        lead.driver.email.toLowerCase().includes(searchLower) ||
        lead.driver.tel.includes(searchLower) ||
        lead.driver.ville.toLowerCase().includes(searchLower) ||
        (lead.vehicle?.immatriculation && lead.vehicle.immatriculation.toLowerCase().includes(searchLower)) ||
        (lead.vehicle?.marque && lead.vehicle.marque.toLowerCase().includes(searchLower));

      // Type filter
      const matchType = typeFilter === 'all' || lead.type === typeFilter;

      // Status filter
      const matchStatus = statusFilter === 'all' || lead.qualificationId === statusFilter;

      // Agent filter
      const matchAgent = 
        agentFilter === 'all' ? true :
        agentFilter === 'unassigned' ? !lead.assignedAgentId :
        lead.assignedAgentId === agentFilter;

      return matchSearch && matchType && matchStatus && matchAgent;
    });
  }, [leads, searchTerm, typeFilter, statusFilter, agentFilter]);

  const handleExport = () => {
    exportLeadsToExcel(filteredLeads);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImporting(true);
    setImportError(null);
    try {
      const imported = await parseExcelFile(files[0]);
      onImportLeads(imported);
      
      // Reset input value to allow uploading same file
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error(err);
      setImportError('Erreur d\'importation. Vérifiez le format de votre fichier Excel.');
    } finally {
      setImporting(false);
    }
  };

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

  const getQualText = (id: string) => {
    return qualifications.find(q => q.id === id)?.label || id;
  };

  return (
    <div className="space-y-6" id="leads-container">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-3 border-b border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Gestion des Prospects</h2>
          <p className="text-xs text-slate-500">Ajoutez, importez, recherchez et qualifiez vos leads assurances.</p>
        </div>

        {/* Buttons section */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Export */}
          {connectedAgent?.role === 'admin' && (
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded hover:bg-slate-50 flex items-center gap-1.5 shadow-xs transition-all"
              title="Exporter la liste filtrée sous Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Exporter</span>
            </button>
          )}

          {/* Import Excel */}
          {connectedAgent?.role === 'admin' && (
            <button
              onClick={handleImportClick}
              disabled={importing}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded hover:bg-slate-50 flex items-center gap-1.5 shadow-xs transition-all"
              title="Importer des leads depuis un fichier Excel (.xlsx, .xls)"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>{importing ? 'Importation...' : 'Importer Excel'}</span>
            </button>
          )}
          {connectedAgent?.role === 'admin' && (
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
            />
          )}

          {/* Add Manual Lead */}
          <button
            onClick={onAddLead}
            className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau prospect</span>
          </button>
        </div>
      </div>

      {/* Errors Alert */}
      {importError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <div className="flex-1 font-medium">{importError}</div>
          <button onClick={() => setImportError(null)} className="font-bold hover:underline">Fermer</button>
        </div>
      )}

      {/* Search and Filters Segment */}
      <div className="bg-white border border-slate-200 rounded p-3 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Search Input */}
        <div className={`relative ${connectedAgent?.role === 'admin' ? 'md:col-span-4' : 'md:col-span-8'}`}>
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom, tel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 bg-slate-50 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-700"
          />
        </div>

        {/* Insurance Type Filter */}
        <div className="md:col-span-2 flex items-center gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type :</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex-1 text-xs border border-slate-200 bg-slate-50 py-1 px-1.5 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-medium"
          >
            <option value="all">Tous</option>
            <option value="auto">Auto</option>
            <option value="vtc">VTC</option>
            <option value="habitation">Maison</option>
          </select>
        </div>

        {/* Status filter */}
        <div className="md:col-span-2 flex items-center gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Statut :</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 text-xs border border-slate-200 bg-slate-50 py-1 px-1.5 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-medium"
          >
            <option value="all">Tous</option>
            {qualifications.map(q => (
              <option key={q.id} value={q.id}>{q.label}</option>
            ))}
          </select>
        </div>

        {/* Agent filter */}
        {connectedAgent?.role === 'admin' && (
          <div className="md:col-span-3 flex items-center gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Agent :</label>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="flex-1 text-xs border border-slate-200 bg-slate-50 py-1 px-1.5 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="all">Tous les agents</option>
              <option value="unassigned">Non dispatchés ⚠️</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>
                  {a.prenom} {a.nom} {connectedAgent?.id === a.id ? '(Moi)' : ''}{a.active === false ? ' (Inactif)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Reset / Help template button */}
        {connectedAgent?.role === 'admin' && (
          <div className="md:col-span-1 flex justify-end relative">
            <button 
              type="button"
              onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              className="p-1.5 text-slate-500 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
              title="Télécharger un modèle d'importation Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Modèles</span>
            </button>
            
            {showTemplateMenu && (
              <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded shadow-lg py-1.5 z-20 w-64 text-left">
                <div className="px-3 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Télécharger un modèle Excel
                </div>
                <button
                  type="button"
                  onClick={() => {
                    downloadSimpleTemplateExcel();
                    setShowTemplateMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex flex-col items-start gap-0.5 text-left transition-colors cursor-pointer"
                >
                  <span className="font-bold text-blue-600">📂 Modèle Simple (Nom, Prénom, Tél, Email)</span>
                  <span className="text-[10px] text-slate-400">Idéal si vous n'avez que les coordonnées de base.</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadTemplateExcel();
                    setShowTemplateMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex flex-col items-start gap-0.5 text-left border-t border-slate-100 transition-colors cursor-pointer"
                >
                  <span className="font-bold text-emerald-600">📂 Modèle Complet CRM</span>
                  <span className="text-[10px] text-slate-400">Comprend tous les détails (auto, vtc, habitation, etc.).</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Table Panel */}
      <div className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium font-mono text-[11px]">
            {filteredLeads.length} prospect(s) trouvé(s) sur un total de {leads.length}
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" /> Cliquez sur un prospect pour ouvrir sa fiche complète.
          </span>
        </div>

        <div className="overflow-x-auto">
          {filteredLeads.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-3">
              <FileSpreadsheet className="w-12 h-12 text-slate-200 mx-auto" />
              <p className="text-sm font-medium text-slate-600">Aucun prospect correspondant</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Modifiez vos critères de recherche ou ajoutez un nouveau prospect pour commencer.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-bold tracking-wider">
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Type de Contrat</th>
                  <th className="py-3.5 px-4">Coordonnées</th>
                  <th className="py-3.5 px-4">Proposition financière</th>
                  <th className="py-3.5 px-4">Date Effet</th>
                  <th className="py-3.5 px-4">Qualification</th>
                  <th className="py-3.5 px-4">Conseiller</th>
                  <th className="py-3.5 px-4">Prochaine Action</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {filteredLeads.map(lead => {
                  const hasAction = !!lead.nextAction;
                  const isActionExecuted = lead.nextAction?.executed;

                  return (
                    <tr 
                      key={lead.id} 
                      className="hover:bg-blue-50/20 group/row cursor-pointer transition-colors"
                      onClick={() => onSelectLead(lead)}
                    >
                      {/* Name / City */}
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-800 text-sm group-hover/row:text-blue-600 transition-colors">
                          {lead.driver.nom} {lead.driver.prenom}
                        </div>
                        <div className="text-slate-400 text-[10px] uppercase font-mono mt-0.5">
                          {lead.driver.codePostal} {lead.driver.ville}
                        </div>
                      </td>

                      {/* Insurance type */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5 font-medium">
                          {lead.type === 'auto' && (
                            <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded flex items-center gap-1 text-[10px]">
                              <Car className="w-3.5 h-3.5 shrink-0" /> AUTO
                            </span>
                          )}
                          {lead.type === 'vtc' && (
                            <span className="text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded flex items-center gap-1 text-[10px]">
                              <Briefcase className="w-3.5 h-3.5 shrink-0" /> VTC
                            </span>
                          )}
                          {lead.type === 'habitation' && (
                            <span className="text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1 text-[10px]">
                              <Home className="w-3.5 h-3.5 shrink-0" /> HAB
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td className="py-2.5 px-4 font-mono">
                        <div className="font-medium text-slate-700">{lead.driver.tel}</div>
                        <div className="text-slate-400 text-[10px] font-sans">{lead.driver.email}</div>
                      </td>

                      {/* Financial Quote */}
                      <td className="py-2.5 px-4">
                        {lead.proposition.cotisationAnnuelle > 0 ? (
                          <div className="font-mono">
                            <span className="font-bold text-slate-800 text-[12px]">{lead.proposition.cotisationAnnuelle} €</span>
                            <span className="text-slate-400 text-[10px]">
                              {lead.proposition.fractionnementSouhaite === 'Mensuel' ? ' / mois' : 
                               lead.proposition.fractionnementSouhaite === 'Trimestriel' ? ' / trim.' : 
                               lead.proposition.fractionnementSouhaite === 'Semestriel' ? ' / sem.' : ' / an'}
                            </span>
                            {lead.proposition.fraisDossier > 0 && (
                              <div className="text-[9px] text-slate-400 font-sans italic">Dont {lead.proposition.fraisDossier} € de frais</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic font-sans">À renseigner</span>
                        )}
                      </td>

                      {/* Requested start date */}
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                        {lead.proposition.dateEffetSouhaitee ? (
                          new Date(lead.proposition.dateEffetSouhaitee).toLocaleDateString('fr-FR')
                        ) : (
                          'N/A'
                        )}
                      </td>

                      {/* Qualification */}
                      <td className="py-2.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${getQualBadgeColor(lead.qualificationId)}`}>
                          {getQualText(lead.qualificationId)}
                        </span>
                      </td>

                      {/* Conseiller */}
                      <td className="py-2.5 px-4">
                        {(() => {
                          const agent = agents.find(a => a.id === lead.assignedAgentId);
                          if (agent) {
                            return (
                              <div className="flex items-center gap-1.5">
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center font-mono font-bold text-[8px] text-white shrink-0 ${agent.avatarColor || 'bg-slate-500'}`}>
                                  {agent.prenom.substring(0, 1).toUpperCase()}{agent.nom.substring(0, 1).toUpperCase()}
                                </span>
                                <span className="font-semibold text-slate-700 truncate max-w-[100px]" title={`${agent.prenom} ${agent.nom}`}>
                                  {agent.prenom} {agent.nom}
                                </span>
                              </div>
                            );
                          }
                          return (
                            <span className="text-[10px] text-slate-400 font-medium italic">Non dispatché</span>
                          );
                        })()}
                      </td>

                      {/* Next Action */}
                      <td className="py-2.5 px-4 text-[11px]">
                        {hasAction ? (
                          <div className={isActionExecuted ? 'line-through text-slate-300' : ''}>
                            <span className="font-semibold text-slate-700 block">
                              {lead.nextAction!.type === 'appel' && 'Appel'}
                              {lead.nextAction!.type === 'envoi_mail' && 'E-mail'}
                              {lead.nextAction!.type === 'envoi_devis' && 'Envoi Devis'}
                              {lead.nextAction!.type === 'relance_devis' && 'Relance'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Le {new Date(lead.nextAction!.date).toLocaleDateString('fr-FR')} à {lead.nextAction!.time}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[11px]">Aucune action</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center">
                          {deleteConfirmId === lead.id ? (
                            <div className="flex flex-col items-center gap-1.5 bg-rose-50 border border-rose-200 p-1.5 rounded-lg shadow-sm animate-fade-in">
                              <span className="text-[9px] font-bold text-rose-700 leading-tight">Supprimer ?</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteLead(lead.id);
                                    setDeleteConfirmId(null);
                                  }}
                                  className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] rounded flex items-center gap-0.5 shadow-xs transition-colors cursor-pointer"
                                  title="Confirmer la suppression"
                                >
                                  <Check className="w-2.5 h-2.5" /> Oui
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-1.5 py-0.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 font-bold text-[9px] rounded flex items-center gap-0.5 transition-colors cursor-pointer"
                                  title="Annuler"
                                >
                                  <X className="w-2.5 h-2.5" /> Non
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit button */}
                              <button
                                type="button"
                                onClick={() => onSelectLead(lead)}
                                className="p-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-blue-600 rounded text-slate-500 transition-colors cursor-pointer"
                                title="Modifier la fiche"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              
                              {/* Delete button (Admins only) */}
                              {connectedAgent?.role === 'admin' && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(lead.id)}
                                  className="p-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-500 hover:text-rose-700 rounded transition-colors cursor-pointer"
                                  title="Supprimer la fiche"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
