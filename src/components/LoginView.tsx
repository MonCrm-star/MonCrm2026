/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, UserCheck, Key, AlertCircle, Users } from 'lucide-react';
import { Agent, CabinetSettings } from '../types';

interface LoginViewProps {
  agents: Agent[];
  cabinet: CabinetSettings;
  onLogin: (agent: Agent) => void;
}

export default function LoginView({ agents, cabinet, onLogin }: LoginViewProps) {
  const [selectedAgentId, setSelectedAgentId] = React.useState<string>('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Veuillez saisir votre adresse e-mail.");
      return;
    }

    const matchedAgent = agents.find(a => a.email.toLowerCase() === email.trim().toLowerCase());
    if (matchedAgent) {
      if (matchedAgent.active === false) {
        setError("Votre compte a été suspendu ou marqué comme inactif par la direction.");
        return;
      }
      const correctPassword = matchedAgent.motDePasse || '123456';
      if (password !== correctPassword) {
        setError("Mot de passe incorrect pour cet agent.");
        return;
      }
      onLogin(matchedAgent);
    } else {
      setError("Cette adresse e-mail ne correspond à aucun agent enregistré. Utilisez l'un des comptes de test ci-dessous ou créez un agent.");
    }
  };

  const handleQuickLogin = (agent: Agent) => {
    if (agent.active === false) {
      setError(`Le compte de ${agent.prenom} ${agent.nom} est actuellement désactivé.`);
      return;
    }
    setError(null);
    onLogin(agent);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 md:p-8" id="login-screen-root">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 md:p-8 space-y-6" id="login-card">
        
        {/* Header Logo & Name */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            {cabinet.logoUrl ? (
              <img 
                src={cabinet.logoUrl} 
                alt="Logo Cabinet" 
                className="h-12 w-auto object-contain rounded bg-white p-1 max-w-[200px]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-500/20">
                {cabinet.nomCabinet ? cabinet.nomCabinet.substring(0, 1).toUpperCase() : "A"}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight mt-1">{cabinet.nomCabinet || "Alliance Courtage Assurances"}</h1>
            <p className="text-xs text-slate-400 font-medium">Espace Privé de Gestion des Prospects</p>
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4" id="login-form">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-2 text-xs text-rose-300 animate-pulse">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">E-mail Professionnel</label>
            <div className="relative">
              <UserCheck className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom.agent@alliance-courtage.fr"
                className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-700 bg-slate-900 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mot de passe</label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-700 bg-slate-900 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-600"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Utilisez le mot de passe défini lors de la création du conseiller (par défaut: "123456")</p>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" /> Se connecter
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-700/60"></div>
          <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Accès d'évaluation</span>
          <div className="flex-grow border-t border-slate-700/60"></div>
        </div>

        {/* Quick Connection List */}
        <div className="space-y-2" id="quick-login-selection">
          <span className="text-[10px] font-semibold text-slate-400 block text-center mb-1">
            Cliquez sur un compte de démonstration pour vous connecter directement :
          </span>
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
            {agents.map(agent => {
              const isInactive = agent.active === false;
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => handleQuickLogin(agent)}
                  className={`w-full p-2.5 bg-slate-900 border border-slate-700/40 hover:border-slate-600 rounded-lg flex items-center justify-between text-left transition-all cursor-pointer group ${isInactive ? 'opacity-50 hover:bg-slate-900 cursor-not-allowed' : 'hover:bg-slate-750'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${agent.avatarColor || 'bg-slate-600'}`}>
                      {agent.prenom.substring(0, 1)}{agent.nom.substring(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <span className={`text-xs font-semibold block transition-colors ${isInactive ? 'text-slate-400 line-through' : 'text-white group-hover:text-blue-400'}`}>
                        {agent.prenom} {agent.nom}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {agent.email}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${agent.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                      {agent.role === 'admin' ? 'Directeur / Admin' : 'Conseiller'}
                    </span>
                    {isInactive && (
                      <span className="text-[8px] px-1 py-0.2 bg-rose-500/25 text-rose-300 border border-rose-500/35 rounded font-extrabold uppercase">
                        Désactivé
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footnote */}
        <div className="text-center">
          <p className="text-[9px] text-slate-600 font-mono">
            Système Sécurisé de Dispatching de Prospects • Alliance Courtage
          </p>
        </div>

      </div>
    </div>
  );
}
