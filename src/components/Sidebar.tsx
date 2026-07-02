/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LayoutDashboard, FileText, Settings, ShieldAlert, PhoneCall, Users, LogOut, MessageSquare, Activity } from 'lucide-react';
import { CabinetSettings, Lead, Agent } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  cabinet: CabinetSettings;
  leads: Lead[];
  connectedAgent: Agent | null;
  onLogout: () => void;
  unreadChatCount?: number;
}

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  cabinet, 
  leads,
  connectedAgent,
  onLogout,
  unreadChatCount = 0
}: SidebarProps) {
  // Count active pending reminders for today
  const pendingRemindersCount = React.useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return leads.filter(lead => {
      // If regular agent, only show their own reminders
      const isOwner = !connectedAgent || connectedAgent.role === 'admin' || lead.assignedAgentId === connectedAgent.id;
      return isOwner && 
        lead.nextAction && 
        !lead.nextAction.executed && 
        lead.nextAction.date === todayStr;
    }).length;
  }, [leads, connectedAgent]);

  const menuItems = React.useMemo(() => {
    const items = [
      { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
      { id: 'leads', label: 'Prospects & Leads', icon: FileText, badge: leads.length },
      { 
        id: 'chat', 
        label: 'Messagerie Interne', 
        icon: MessageSquare, 
        badge: unreadChatCount > 0 ? unreadChatCount : undefined,
        isAlert: unreadChatCount > 0
      }
    ];

    // Show Agents tab if logged-in user is an administrator
    if (connectedAgent?.role === 'admin') {
      items.push({ id: 'tracking', label: 'Suivi Conseillers', icon: Activity });
      items.push({ id: 'agents', label: 'Équipe & Dispatch', icon: Users });
      items.push({ id: 'settings', label: 'Configuration', icon: Settings });
    }
    return items;
  }, [leads.length, connectedAgent]);

  return (
    <aside className="w-52 bg-slate-900 text-white flex flex-col shrink-0 h-screen sticky top-0 border-r border-slate-800" id="crm-sidebar">
      {/* Header with Logo */}
      <div className="p-4 border-b border-slate-700 flex items-center gap-3">
        {cabinet.logoUrl ? (
          <img 
            src={cabinet.logoUrl} 
            alt="Logo Cabinet" 
            className="h-8 w-auto object-contain rounded bg-white p-0.5 max-w-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-sm text-white">
            {cabinet.nomCabinet ? cabinet.nomCabinet.substring(0, 1).toUpperCase() : "A"}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="font-semibold text-xs text-white leading-tight truncate">{cabinet.nomCabinet || "Cabinet"}</h1>
          <span className="text-[9px] text-slate-400 font-mono tracking-wider block mt-0.5">Assurance v1.1</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-2 text-xs font-medium transition-all duration-150 cursor-pointer ${
                isActive 
                  ? 'bg-slate-800 text-blue-400 border-l-2 border-blue-400' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
              id={`nav-item-${item.id}`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  item.isAlert 
                    ? 'bg-rose-600 text-white animate-pulse' 
                    : isActive 
                      ? 'bg-slate-700 text-blue-400' 
                      : 'bg-slate-800 text-slate-500'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Active Reminder Panel */}
      {pendingRemindersCount > 0 && (
        <div className="m-3 p-3 bg-slate-800 border border-slate-700 rounded-lg">
          <div className="flex items-start gap-2">
            <PhoneCall className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 animate-bounce" />
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Rappels</h4>
              <p className="text-[10px] text-slate-300 mt-1 leading-normal">
                <strong className="text-white font-bold">{pendingRemindersCount}</strong> action(s) planifiée(s).
              </p>
              <button 
                onClick={() => setCurrentTab('dashboard')} 
                className="mt-1 text-[10px] text-blue-400 hover:text-blue-300 hover:underline font-semibold block cursor-pointer"
              >
                Voir tableau →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Profile Area */}
      {connectedAgent && (
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[9px] shrink-0 ${connectedAgent.avatarColor || 'bg-slate-600'}`}>
              {connectedAgent.prenom.substring(0, 1).toUpperCase()}{connectedAgent.nom.substring(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 text-left">
              <span className="text-[10px] font-bold text-slate-200 block truncate leading-tight">
                {connectedAgent.prenom} {connectedAgent.nom}
              </span>
              <span className="text-[8px] text-slate-400 uppercase tracking-tight block">
                {connectedAgent.role === 'admin' ? 'Directeur' : 'Conseiller'}
              </span>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onLogout}
            className="w-full py-1 px-2 border border-slate-800 hover:border-rose-900 bg-slate-900 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 rounded text-[9px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Se déconnecter"
          >
            <LogOut className="w-3 h-3" />
            <span>Déconnexion</span>
          </button>
        </div>
      )}

      {/* Footer SIRET */}
      <div className="p-3 border-t border-slate-800 text-[8px] text-slate-600 font-mono text-left">
        SIRET : {cabinet.siret || 'N/A'}
      </div>
    </aside>
  );
}
