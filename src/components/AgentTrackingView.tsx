import React from 'react';
import { Agent, Lead, QualificationStatus } from '../types';
import { 
  loadConnectionLogs, 
  loadAgentsActivity, 
  ConnectionLog, 
  AgentActivityState 
} from '../utils/activityTracker';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  Activity, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  Search,
  Filter,
  LogOut,
  RefreshCw,
  X,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AgentTrackingViewProps {
  agents: Agent[];
  leads: Lead[];
  qualifications: QualificationStatus[];
}

export default function AgentTrackingView({ agents, leads, qualifications }: AgentTrackingViewProps) {
  const [logs, setLogs] = React.useState<ConnectionLog[]>([]);
  const [activities, setActivities] = React.useState<Record<string, AgentActivityState>>({});
  const [selectedAgentFilter, setSelectedAgentFilter] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  
  // Selected agent for detailed drill-down modal
  const [selectedDetailedAgent, setSelectedDetailedAgent] = React.useState<Agent | null>(null);
  const [expandedDays, setExpandedDays] = React.useState<Record<string, boolean>>({});

  const loadData = React.useCallback(() => {
    setLogs(loadConnectionLogs());
    setActivities(loadAgentsActivity());
  }, []);

  React.useEffect(() => {
    loadData();

    // Sync when activity changes
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('crm_activity_updated', handleUpdate);
    return () => {
      window.removeEventListener('crm_activity_updated', handleUpdate);
    };
  }, [loadData]);

  // Compute overall stats for all agents
  const advisors = agents.filter(a => a.role === 'agent');
  
  // Calculate stats per agent
  const agentStats = React.useMemo(() => {
    return advisors.map(agent => {
      const agentLeads = leads.filter(l => l.assignedAgentId === agent.id);
      const totalLeads = agentLeads.length;
      
      const successLeads = agentLeads.filter(
        l => l.qualificationId === 'devis_accepte' || l.qualificationId === 'paiement_recu' || l.qualificationId === 'attente_paiement'
      );
      
      const conversionRate = totalLeads > 0 ? Math.round((successLeads.length / totalLeads) * 100) : 0;
      
      const totalPremium = successLeads.reduce((sum, l) => {
        const cot = l.proposition?.cotisationAnnuelle || 0;
        const frac = l.proposition?.fractionnementSouhaite || 'Mensuel';
        const coeff = frac === 'Mensuel' ? 12 : frac === 'Trimestriel' ? 4 : frac === 'Semestriel' ? 2 : 1;
        return sum + (cot * coeff);
      }, 0);
      
      // Tasks completion
      const withActions = agentLeads.filter(l => l.nextAction);
      const completedActions = withActions.filter(l => l.nextAction?.executed);
      const actionCompletionRate = withActions.length > 0 
        ? Math.round((completedActions.length / withActions.length) * 100) 
        : 100;

      // Status counters
      const statusCounts = qualifications.reduce((acc, q) => {
        acc[q.id] = agentLeads.filter(l => l.qualificationId === q.id).length;
        return acc;
      }, {} as Record<string, number>);

      // Activity state
      const activity = activities[agent.id];
      const isOnline = activity ? activity.isOnline : false;
      const lastActive = activity ? activity.lastActiveAt : undefined;

      return {
        agent,
        totalLeads,
        successLeadsCount: successLeads.length,
        conversionRate,
        totalPremium,
        actionCompletionRate,
        totalActionsCount: withActions.length,
        completedActionsCount: completedActions.length,
        statusCounts,
        isOnline,
        lastActive
      };
    });
  }, [advisors, leads, qualifications, activities]);

  // Total metrics
  const totalTrackedPremium = agentStats.reduce((sum, s) => sum + s.totalPremium, 0);
  const totalAssignedLeads = agentStats.reduce((sum, s) => sum + s.totalLeads, 0);
  const averageConversionRate = agentStats.length > 0 
    ? Math.round(agentStats.reduce((sum, s) => sum + s.conversionRate, 0) / agentStats.length) 
    : 0;

  // Filter connection logs
  const filteredLogs = React.useMemo(() => {
    let result = logs;

    if (selectedAgentFilter !== 'all') {
      result = result.filter(log => log.agentId === selectedAgentFilter);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(log => 
        log.agentName.toLowerCase().includes(q) || 
        log.status.toLowerCase().includes(q)
      );
    }

    return result;
  }, [logs, selectedAgentFilter, searchQuery]);

  // Detailed stats for the modal-selected agent
  const detailedAgentStats = React.useMemo(() => {
    if (!selectedDetailedAgent) return null;

    const agentLogs = logs.filter(l => l.agentId === selectedDetailedAgent.id);
    const totalSessions = agentLogs.length;
    const activeSession = agentLogs.find(l => l.status === 'active');
    
    const completedLogs = agentLogs.filter(l => l.status !== 'active');
    const totalMinutes = completedLogs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
    const averageDuration = completedLogs.length > 0 
      ? Math.round(totalMinutes / completedLogs.length) 
      : 0;

    const timeoutCount = agentLogs.filter(l => l.status === 'timeout').length;
    const standardLogoutCount = agentLogs.filter(l => l.status === 'disconnected').length;

    const activity = activities[selectedDetailedAgent.id];
    const isOnline = activity ? activity.isOnline : false;
    const lastActive = activity ? activity.lastActiveAt : undefined;

    return {
      agentLogs,
      totalSessions,
      totalMinutes,
      averageDuration,
      timeoutCount,
      standardLogoutCount,
      isOnline,
      lastActive,
      activeSession
    };
  }, [selectedDetailedAgent, logs, activities]);

  // Group agent logs day by day for detailed calendar view
  const logsByDay = React.useMemo(() => {
    if (!selectedDetailedAgent || !detailedAgentStats) return [];

    const groups: Record<string, ConnectionLog[]> = {};
    
    // Sort logs descending (newest first)
    const sortedLogs = [...detailedAgentStats.agentLogs].sort((a, b) => 
      new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime()
    );

    sortedLogs.forEach(log => {
      const date = new Date(log.loginTime);
      const rawKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!groups[rawKey]) {
        groups[rawKey] = [];
      }
      groups[rawKey].push(log);
    });

    return Object.entries(groups).map(([dateKey, dayLogs]) => {
      const dateObj = new Date(dayLogs[0].loginTime);
      const formattedDate = dateObj.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Capitalize first letter
      const prettyDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

      // Sum of minutes for this day
      const dayMinutes = dayLogs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
      const activeHasLog = dayLogs.some(l => l.status === 'active');

      return {
        dateKey,
        prettyDate,
        logs: dayLogs,
        totalSessions: dayLogs.length,
        totalMinutes: dayMinutes,
        hasActiveSession: activeHasLog
      };
    });
  }, [selectedDetailedAgent, detailedAgentStats]);

  // Format activity relative time
  const formatLastActive = (isoString?: string) => {
    if (!isoString) return 'Aucune activité récente';
    const date = new Date(isoString);
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return "À l'instant";
    if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    
    return `Le ${date.toLocaleDateString('fr-FR')} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getStatusBadge = (status: ConnectionLog['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-extrabold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Session active
          </span>
        );
      case 'disconnected':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-slate-50 text-slate-500 border border-slate-200 font-extrabold px-2 py-0.5 rounded-full">
            Déconnexion
          </span>
        );
      case 'timeout':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-extrabold px-2 py-0.5 rounded-full" title="Inactivité de 15 minutes">
            Expiration (15m idle)
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-110px)] p-4 md:p-6 animate-fade-in" id="agent-tracking-view">
      
      {/* Upper Title and Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Activity className="w-5.5 h-5.5 text-blue-600" />
            Suivi des Conseillers & Activité
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tableau de bord de pilotage d'équipe. Suivez en temps réel les résultats commerciaux et le temps de connexion de vos agents.
          </p>
        </div>

        <button
          onClick={() => {
            loadData();
            window.dispatchEvent(new CustomEvent('crm_activity_updated'));
          }}
          className="self-start md:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Actualiser</span>
        </button>
      </div>

      {/* KPI Stats Cards row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Conseillers suivis</span>
            <span className="text-lg font-extrabold text-slate-800">{advisors.length} agents</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Portefeuille assigné</span>
            <span className="text-lg font-extrabold text-slate-800">{totalAssignedLeads} prospects</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Taux transfo moyen</span>
            <span className="text-lg font-extrabold text-slate-800">{averageConversionRate}%</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cotisation annuelle signée</span>
            <span className="text-lg font-extrabold text-teal-700">{totalTrackedPremium.toLocaleString('fr-FR')} €</span>
          </div>
        </div>

      </div>

      {/* Section 1: Detailed Agent Performance Cards */}
      <div className="mb-8">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Résultats Commerciaux par Conseiller</h2>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {agentStats.map(({ agent, totalLeads, successLeadsCount, conversionRate, totalPremium, actionCompletionRate, totalActionsCount, completedActionsCount, statusCounts, isOnline, lastActive }) => (
            <div key={agent.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between">
              
              {/* Agent Top Info Bar */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${agent.avatarColor || 'bg-slate-600'} text-white font-extrabold text-sm flex items-center justify-center shadow-xs`}>
                    {agent.prenom[0]}{agent.nom[0]}
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-800">{agent.prenom} {agent.nom}</h3>
                    <p className="text-[10px] text-slate-400 font-medium">{agent.email} • {agent.telephone || 'Aucun tél'}</p>
                  </div>
                </div>

                {/* Live Status Badge */}
                <div className="text-right">
                  {isOnline ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-extrabold rounded-full">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                      En ligne
                    </span>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-extrabold rounded-full">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                        Hors ligne
                      </span>
                      <span className="text-[8px] text-slate-400 mt-0.5">{formatLastActive(lastActive)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Block Grid */}
              <div className="p-4 grid grid-cols-3 gap-2.5 border-b border-slate-50 text-center">
                <div className="p-2 bg-slate-50/70 rounded-lg">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Leads Assignés</span>
                  <span className="text-base font-extrabold text-slate-700">{totalLeads}</span>
                </div>
                <div className="p-2 bg-blue-50/50 rounded-lg">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Taux de Conv.</span>
                  <span className="text-base font-extrabold text-blue-600">{conversionRate}%</span>
                </div>
                <div className="p-2 bg-emerald-50/50 rounded-lg">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Cotisation signée</span>
                  <span className="text-base font-extrabold text-emerald-600">{totalPremium.toLocaleString('fr-FR')} €</span>
                </div>
              </div>

              {/* Progress and status split */}
              <div className="p-4 space-y-4">
                
                {/* Visual Progress Bar */}
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                    <span>Performance relances (actions traitées)</span>
                    <span>{completedActionsCount} / {totalActionsCount} ({actionCompletionRate}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${actionCompletionRate}%` }}
                    />
                  </div>
                </div>

                {/* Status breakdown badges */}
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Répartition par statut des dossiers</span>
                  <div className="flex flex-wrap gap-1.5">
                    {qualifications.map(q => {
                      const count = statusCounts[q.id] || 0;
                      return (
                        <div 
                          key={q.id} 
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium border ${
                            count > 0 
                              ? 'bg-slate-50 border-slate-200 text-slate-700' 
                              : 'bg-slate-50/30 border-slate-100 text-slate-400'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full bg-${q.color}-500`} style={{ backgroundColor: q.color }} />
                          <span>{q.label} : <strong>{count}</strong></span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Drildown actions footer */}
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-semibold">Portefeuille géré par l'agent</span>
                <button
                  onClick={() => setSelectedDetailedAgent(agent)}
                  className="inline-flex items-center gap-1 text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold px-3 py-1.5 rounded-lg border border-blue-100 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Consulter les connexions
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Advisor Session & Connection Logging Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        
        {/* Connection logs Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-slate-50/40">
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              Historique général des heures de connexion & sessions
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">Tracez les connexions, déconnexions et les déconnexions automatiques après 15 minutes d'inactivité.</p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Advisor Selector */}
            <div className="relative">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <select
                value={selectedAgentFilter}
                onChange={(e) => setSelectedAgentFilter(e.target.value)}
                className="pl-8 pr-3 py-1 bg-white border border-slate-200 text-xs font-semibold text-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">Tous les agents</option>
                {advisors.map(a => (
                  <option key={a.id} value={a.id}>{a.prenom} {a.nom}</option>
                ))}
              </select>
            </div>

            {/* Simple Search bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-white border border-slate-200 text-xs text-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

          </div>
        </div>

        {/* Connection logs Table body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/20">
                <th className="p-3 pl-4">Conseiller</th>
                <th className="p-3">Rôle</th>
                <th className="p-3">Début de connexion</th>
                <th className="p-3">Fin de session</th>
                <th className="p-3">Durée active</th>
                <th className="p-3 pr-4">Statut Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                    Aucun log de connexion correspondant à ces critères.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const loginD = new Date(log.loginTime);
                  const formattedLogin = `${loginD.toLocaleDateString('fr-FR')} à ${loginD.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
                  
                  let formattedLogout = '---';
                  if (log.logoutTime) {
                    const logoutD = new Date(log.logoutTime);
                    formattedLogout = `${logoutD.toLocaleDateString('fr-FR')} à ${logoutD.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
                  } else if (log.status === 'active') {
                    formattedLogout = 'En cours';
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 pl-4 font-bold text-slate-700">
                        {log.agentName}
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold capitalize ${log.agentRole === 'admin' ? 'text-rose-600' : 'text-slate-500'}`}>
                          {log.agentRole === 'admin' ? 'Directeur' : 'Conseiller'}
                        </span>
                      </td>
                      <td className="p-3 flex items-center gap-1.5 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formattedLogin}
                      </td>
                      <td className="p-3 text-slate-500">
                        {formattedLogout}
                      </td>
                      <td className="p-3 font-semibold text-slate-700">
                        {log.status === 'active' ? (
                          <span className="text-emerald-600 italic">Calcul en fin de session</span>
                        ) : log.durationMinutes ? (
                          `${log.durationMinutes} min`
                        ) : (
                          '1 min'
                        )}
                      </td>
                      <td className="p-3 pr-4">
                        {getStatusBadge(log.status)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* DETAILED DRILL-DOWN MODAL FOR SELECTED AGENT */}
      {selectedDetailedAgent && detailedAgentStats && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full ${selectedDetailedAgent.avatarColor || 'bg-slate-600'} text-white font-extrabold flex items-center justify-center text-base shadow-xs`}>
                  {selectedDetailedAgent.prenom[0]}{selectedDetailedAgent.nom[0]}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                    {selectedDetailedAgent.prenom} {selectedDetailedAgent.nom}
                    {detailedAgentStats.isOnline ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-extrabold rounded-full">
                        En ligne
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 text-[9px] font-extrabold rounded-full">
                        Hors ligne
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Historique individuel de connexion & statistiques de session</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDetailedAgent(null)}
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Stat summary blocks */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Indicateurs de présence</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  
                  <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sessions totales</span>
                    <span className="text-base font-extrabold text-slate-800">{detailedAgentStats.totalSessions}</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cumul temps</span>
                    <span className="text-base font-extrabold text-slate-800">
                      {detailedAgentStats.totalMinutes >= 60 
                        ? `${Math.floor(detailedAgentStats.totalMinutes / 60)}h ${detailedAgentStats.totalMinutes % 60}m`
                        : `${detailedAgentStats.totalMinutes} min`
                      }
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Durée moyenne</span>
                    <span className="text-base font-extrabold text-slate-800">
                      {detailedAgentStats.averageDuration} min
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Expirations (15m idle)</span>
                    <span className="text-base font-extrabold text-amber-600">{detailedAgentStats.timeoutCount}</span>
                  </div>

                </div>
              </div>

              {/* Status and Last Active Detail */}
              <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider mb-0.5">Dernière activité détectée</span>
                  <span className="text-slate-700 font-semibold">{formatLastActive(detailedAgentStats.lastActive)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider mb-0.5">Mode de Déconnexion Majoritaire</span>
                  <span className="text-slate-700 font-bold">
                    {detailedAgentStats.timeoutCount > detailedAgentStats.standardLogoutCount ? 'Expiration automatique' : 'Déconnexion manuelle'}
                  </span>
                </div>
              </div>

              {/* List of sessions grouped day by day */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3.5">
                  Détail journalier des connexions et déconnexions (Toute la journée)
                </h4>
                
                <div className="space-y-3">
                  {logsByDay.length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 italic text-xs">
                      Aucune session enregistrée pour cet agent.
                    </div>
                  ) : (
                    logsByDay.map((day, index) => {
                      const isExpanded = expandedDays[day.dateKey] ?? (index === 0);

                      return (
                        <div 
                          key={day.dateKey} 
                          className="border border-slate-200/80 rounded-xl overflow-hidden shadow-xs bg-white transition-all duration-200"
                        >
                          {/* Day Header Trigger */}
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedDays(prev => ({
                                ...prev,
                                [day.dateKey]: !isExpanded
                              }));
                            }}
                            className="w-full flex items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              <Calendar className="w-4 h-4 text-slate-500" />
                              <div>
                                <span className="text-xs font-bold text-slate-800 block">
                                  {day.prettyDate}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {day.totalSessions} {day.totalSessions > 1 ? 'sessions' : 'session'} de connexion sur la journée
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Glowing live dot if there's an active session on this day */}
                              {day.hasActiveSession && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-extrabold rounded-full">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                  En ligne
                                </span>
                              )}

                              {/* Day total cumulative time */}
                              <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                                Total : {day.totalMinutes >= 60 
                                  ? `${Math.floor(day.totalMinutes / 60)}h ${day.totalMinutes % 60}m`
                                  : `${day.totalMinutes} min`
                                }
                              </span>

                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </button>

                          {/* Day connection logs detail table (Expanded view) */}
                          {isExpanded && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase border-b border-slate-100">
                                    <th className="p-2.5 pl-4">Heure de connexion (Début)</th>
                                    <th className="p-2.5">Heure de déconnexion (Fin)</th>
                                    <th className="p-2.5">Durée de session</th>
                                    <th className="p-2.5 pr-4">Mode / Statut de déconnexion</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                                  {day.logs.map((log) => {
                                    const loginD = new Date(log.loginTime);
                                    const formattedLoginTime = loginD.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                                    
                                    let formattedLogoutTime = '---';
                                    if (log.logoutTime) {
                                      const logoutD = new Date(log.logoutTime);
                                      formattedLogoutTime = logoutD.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                                    } else if (log.status === 'active') {
                                      formattedLogoutTime = 'En cours';
                                    }

                                    return (
                                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-2.5 pl-4 text-slate-800 font-semibold">
                                          {formattedLoginTime}
                                        </td>
                                        <td className="p-2.5 text-slate-600 font-semibold">
                                          {formattedLogoutTime}
                                        </td>
                                        <td className="p-2.5 font-bold text-slate-800">
                                          {log.status === 'active' ? (
                                            <span className="text-emerald-600 italic">Session active</span>
                                          ) : log.durationMinutes ? (
                                            `${log.durationMinutes} min`
                                          ) : (
                                            '1 min'
                                          )}
                                        </td>
                                        <td className="p-2.5 pr-4">
                                          {getStatusBadge(log.status)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
              <button
                onClick={() => setSelectedDetailedAgent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

