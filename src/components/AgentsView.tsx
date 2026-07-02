/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Phone, 
  Shield, 
  Trash2, 
  CheckCircle, 
  X,
  FileText,
  TrendingUp,
  AlertCircle,
  Edit,
  Key
} from 'lucide-react';
import { Agent, Lead } from '../types';

interface AgentsViewProps {
  agents: Agent[];
  leads: Lead[];
  connectedAgent: Agent | null;
  onAddAgent: (agent: Agent) => void;
  onUpdateAgent: (agent: Agent) => void;
  onDeleteAgent: (agentId: string) => void;
}

const AVATAR_COLORS = [
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-blue-600',
  'bg-violet-600',
  'bg-pink-600',
  'bg-teal-600'
];

export default function AgentsView({
  agents,
  leads,
  connectedAgent,
  onAddAgent,
  onUpdateAgent,
  onDeleteAgent
}: AgentsViewProps) {
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [editingAgent, setEditingAgent] = React.useState<Agent | null>(null);
  const [nom, setNom] = React.useState('');
  const [prenom, setPrenom] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [telephone, setTelephone] = React.useState('');
  const [role, setRole] = React.useState<'admin' | 'agent'>('agent');
  const [motDePasse, setMotDePasse] = React.useState('');
  const [active, setActive] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (editingAgent) {
      setNom(editingAgent.nom);
      setPrenom(editingAgent.prenom);
      setEmail(editingAgent.email);
      setTelephone(editingAgent.telephone || '');
      setRole(editingAgent.role);
      setMotDePasse(editingAgent.motDePasse || '');
      setActive(editingAgent.active !== false);
      setShowAddForm(true);
    } else {
      setNom('');
      setPrenom('');
      setEmail('');
      setTelephone('');
      setRole('agent');
      setMotDePasse('');
      setActive(true);
    }
  }, [editingAgent]);
  
  // Track delete confirmation ID
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  // Statistics for agents
  const agentStats = React.useMemo(() => {
    return agents.map(agent => {
      const assignedLeads = leads.filter(l => l.assignedAgentId === agent.id);
      const totalPremium = assignedLeads.reduce((sum, l) => {
        const cot = l.proposition?.cotisationAnnuelle || 0;
        const frac = l.proposition?.fractionnementSouhaite || 'Mensuel';
        const coeff = frac === 'Mensuel' ? 12 : frac === 'Trimestriel' ? 4 : frac === 'Semestriel' ? 2 : 1;
        return sum + (cot * coeff);
      }, 0);
      const signedLeadsCount = assignedLeads.filter(l => l.qualificationId === 'paiement_recu' || l.qualificationId === 'devis_accepte').length;
      
      return {
        agentId: agent.id,
        leadsCount: assignedLeads.length,
        signedCount: signedLeadsCount,
        totalPremium
      };
    });
  }, [agents, leads]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nom.trim() || !prenom.trim() || !email.trim()) {
      setError("Veuillez remplir les champs obligatoires (Nom, Prénom, E-mail).");
      return;
    }

    // Email unique check (excluding the agent currently being edited)
    const emailExists = agents.some(a => a.email.toLowerCase() === email.trim().toLowerCase() && a.id !== editingAgent?.id);
    if (emailExists) {
      setError("Cette adresse e-mail est déjà utilisée par un autre agent.");
      return;
    }

    if (editingAgent) {
      const updatedAgent: Agent = {
        ...editingAgent,
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim().toLowerCase(),
        role,
        telephone: telephone.trim() || undefined,
        motDePasse: motDePasse.trim() || undefined,
        active: active
      };
      onUpdateAgent(updatedAgent);
      setEditingAgent(null);
    } else {
      const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      const newAgent: Agent = {
        id: `agent-${Date.now()}`,
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim().toLowerCase(),
        role,
        telephone: telephone.trim() || undefined,
        avatarColor: randomColor,
        motDePasse: motDePasse.trim() || undefined,
        active: active
      };
      onAddAgent(newAgent);
    }

    // Reset form
    setNom('');
    setPrenom('');
    setEmail('');
    setTelephone('');
    setRole('agent');
    setMotDePasse('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6" id="agents-view-container">
      {/* Title & Top Action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Gestion de l'Équipe & Dispatching
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gérez vos conseillers et analysez l'attribution des prospects en temps réel.
          </p>
        </div>
        
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Ajouter un conseiller
          </button>
        )}
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="agents-stats-grid">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Effectif total</span>
            <span className="text-xl font-bold text-slate-800">{agents.length} agents</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prospects Dispatchés</span>
            <span className="text-xl font-bold text-slate-800">
              {leads.filter(l => l.assignedAgentId).length} / {leads.length} leads
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Moyenne par Agent</span>
            <span className="text-xl font-bold text-slate-800">
              {agents.length > 0 ? (leads.length / agents.length).toFixed(1) : 0} leads/agent
            </span>
          </div>
        </div>
      </div>

      {/* Add Agent Form Drawer/Overlay */}
      {showAddForm && (
        <div className="p-5 bg-white border border-blue-100 rounded-2xl shadow-sm space-y-4 animate-fade-in" id="add-agent-form-container">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-blue-600" />
              {editingAgent ? `Modifier la fiche de ${editingAgent.prenom} ${editingAgent.nom}` : "Nouveau membre d'équipe"}
            </h3>
            <button 
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingAgent(null);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-700 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Prénom <strong className="text-rose-500">*</strong></label>
                <input 
                  type="text" 
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="ex: Sarah"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700 bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nom <strong className="text-rose-500">*</strong></label>
                <input 
                  type="text" 
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="ex: Dupont"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700 bg-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">E-mail Professionnel <strong className="text-rose-500">*</strong></label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: sarah.dupont@cabinet.fr"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700 bg-white"
                  required
                />
              </div>

              <div className="md:col-span-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Téléphone Direct</label>
                <input 
                  type="tel" 
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="ex: 06 12 34 56 78"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700 bg-white"
                />
              </div>

              <div className="md:col-span-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mot de Passe <strong className="text-rose-500">*</strong></label>
                <input 
                  type="text" 
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="ex: 123456"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700 bg-white font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Rôle et Permissions</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className={`border rounded-xl p-3 flex items-start gap-3 cursor-pointer transition-all ${role === 'agent' ? 'border-blue-300 bg-blue-50/25' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input 
                    type="radio" 
                    name="new-agent-role" 
                    checked={role === 'agent'}
                    onChange={() => setRole('agent')}
                    className="mt-0.5 text-blue-600"
                  />
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-800 block">Conseiller / Agent Commercial</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block leading-normal">
                      Accès personnel aux prospects affectés, gestion de son portefeuille uniquement.
                    </span>
                  </div>
                </label>

                <label className={`border rounded-xl p-3 flex items-start gap-3 cursor-pointer transition-all ${role === 'admin' ? 'border-indigo-300 bg-indigo-50/25' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input 
                    type="radio" 
                    name="new-agent-role" 
                    checked={role === 'admin'}
                    onChange={() => setRole('admin')}
                    className="mt-0.5 text-indigo-600"
                  />
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-800 block">Directeur d'Agence / Administrateur</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block leading-normal">
                      Accès complet à la configuration de l'agence, statistiques globales, et dispatching d'équipe.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Statut du Compte Conseiller</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className={`border rounded-xl p-3 flex items-start gap-3 cursor-pointer transition-all ${active ? 'border-emerald-300 bg-emerald-50/25' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input 
                    type="radio" 
                    name="agent-status-active" 
                    checked={active === true}
                    onChange={() => setActive(true)}
                    className="mt-0.5 text-emerald-600"
                  />
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-800 block">Compte Actif (Autorisé)</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block leading-normal">
                      L'agent peut se connecter, recevoir de nouveaux prospects dispatchés et chatter.
                    </span>
                  </div>
                </label>

                <label className={`border rounded-xl p-3 flex items-start gap-3 cursor-pointer transition-all ${!active ? 'border-rose-300 bg-rose-50/25' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input 
                    type="radio" 
                    name="agent-status-active" 
                    checked={active === false}
                    onChange={() => setActive(false)}
                    className="mt-0.5 text-rose-600"
                  />
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-800 block">Compte Inactif (Désactivé)</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block leading-normal">
                      Connexion interdite, l'agent est ignoré lors des dispatchings automatiques.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingAgent(null);
                }}
                className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
              >
                {editingAgent ? "Enregistrer les modifications" : "Créer la fiche agent"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Team Directory & Dispatch Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Membres d'agence & Charges de portefeuille
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Collaborateur</th>
                <th className="py-3 px-4">Coordonnées</th>
                <th className="py-3 px-4">Rôle</th>
                <th className="py-3 px-4 text-center">Prospects affectés</th>
                <th className="py-3 px-4 text-center">Taux d'accord (Devis)</th>
                <th className="py-3 px-4 text-right">Potentiel cotisations</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {agents.map((agent) => {
                const stats = agentStats.find(s => s.agentId === agent.id) || { leadsCount: 0, signedCount: 0, totalPremium: 0 };
                const isSelf = connectedAgent?.id === agent.id;
                
                return (
                  <tr key={agent.id} className={`hover:bg-slate-50/50 transition-colors ${agent.active === false ? 'bg-rose-50/10 opacity-75' : ''}`}>
                    {/* Collaborative User Profile */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-xs ${agent.avatarColor || 'bg-slate-600'}`}>
                          {agent.prenom.substring(0, 1).toUpperCase()}{agent.nom.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800 block">
                              {agent.prenom} {agent.nom}
                            </span>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[8px] font-bold rounded-sm uppercase tracking-wider">
                                Vous
                              </span>
                            )}
                            {agent.active === false ? (
                              <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 text-[8px] font-bold rounded-sm uppercase tracking-wider">
                                Inactif
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[8px] font-bold rounded-sm uppercase tracking-wider">
                                Actif
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {agent.id}</span>
                        </div>
                      </div>
                    </td>

                    {/* Coordinates */}
                    <td className="py-3.5 px-4 text-slate-600 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{agent.email}</span>
                      </div>
                      {agent.telephone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono text-[11px]">{agent.telephone}</span>
                        </div>
                      )}
                    </td>

                    {/* Role Badge */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold text-[10px] ${
                        agent.role === 'admin' 
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        <Shield className="w-3 h-3" />
                        {agent.role === 'admin' ? 'Directeur' : 'Conseiller'}
                      </span>
                    </td>

                    {/* Assigned Leads Count */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full font-mono text-[11px]">
                        {stats.leadsCount}
                      </span>
                    </td>

                    {/* Signed Devis Ratio */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="space-y-1">
                        <span className="font-semibold text-slate-700 font-mono">
                          {stats.signedCount} / {stats.leadsCount} signés
                        </span>
                        <div className="w-24 bg-slate-100 h-1.5 rounded-full mx-auto overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all" 
                            style={{ width: `${stats.leadsCount > 0 ? (stats.signedCount / stats.leadsCount) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Premium Portfolio Potential */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 text-sm">
                      {stats.totalPremium.toLocaleString('fr-FR')} € / an
                    </td>

                    {/* Self Safe Deletion Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingAgent(agent)}
                          className="p-1.5 bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-600 hover:text-blue-800 rounded-lg transition-colors cursor-pointer"
                          title="Modifier les informations de l'agent"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {isSelf ? (
                          <span className="text-[10px] text-slate-400 font-medium italic">Vous</span>
                        ) : deleteConfirmId === agent.id ? (
                          <div className="flex items-center justify-center gap-1.5 animate-fade-in">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteAgent(agent.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] rounded flex items-center gap-0.5 shadow-xs cursor-pointer"
                            >
                              Oui
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 font-bold text-[9px] rounded flex items-center gap-0.5 cursor-pointer"
                            >
                              Non
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(agent.id)}
                            className="p-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-500 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer l'agent de l'agence"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
