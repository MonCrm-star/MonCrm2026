/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  loadCRMData, 
  saveLeads, 
  saveQualifications, 
  saveCabinetSettings,
  saveAgents,
  loadConnectedAgent,
  saveConnectedAgent,
  DEFAULT_QUALIFICATIONS,
  DEFAULT_CABINET
} from './utils/storage';
import { Lead, QualificationStatus, CabinetSettings, LeadType, Agent } from './types';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import LeadsView from './components/LeadsView';
import SettingsView from './components/SettingsView';
import LeadModal from './components/LeadModal';
import LoginView from './components/LoginView';
import AgentsView from './components/AgentsView';
import ChatView from './components/ChatView';
import AgentTrackingView from './components/AgentTrackingView';
import { 
  recordAgentLogin, 
  pingAgentActivity, 
  recordAgentLogout, 
  pruneOfflineAgents 
} from './utils/activityTracker';
import { loadChatChannels, loadChatMessages, loadLastReadTimestamps, saveChatMessages } from './utils/chatStorage';
import { 
  requestNotificationPermission, 
  triggerNativeNotification, 
  checkPendingReminders,
  playChime
} from './utils/notifications';
import { 
  Bell, 
  BellRing, 
  Search, 
  ShieldCheck, 
  UserCheck, 
  X, 
  CheckCircle, 
  Clock, 
  Info,
  Calendar,
  MessageSquare
} from 'lucide-react';

interface ActiveTrigger {
  id: string; // leadId-time
  lead: Lead;
  msg: string;
}

export default function App() {
  // Navigation tabs state
  const [currentTab, setCurrentTab] = React.useState<string>('dashboard');

  // Core global database states
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [qualifications, setQualifications] = React.useState<QualificationStatus[]>([]);
  const [cabinet, setCabinet] = React.useState<CabinetSettings>(DEFAULT_CABINET);
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [connectedAgent, setConnectedAgent] = React.useState<Agent | null>(null);

  // Modal editor trigger
  // selectedLead: null -> closed, undefined -> create new, Lead -> edit existing
  const [selectedLead, setSelectedLead] = React.useState<Lead | null | undefined>(null);
  const [modalDefaultType, setModalDefaultType] = React.useState<LeadType>('auto');

  // Live triggered reminders states
  const [activeTriggers, setActiveTriggers] = React.useState<ActiveTrigger[]>([]);
  const [triggeredActionIds, setTriggeredActionIds] = React.useState<string[]>([]);
  const [notificationPermissionGranted, setNotificationPermissionGranted] = React.useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = React.useState('');

  // Toast notifications states
  const [toastMessage, setToastMessage] = React.useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Session activity and inactivity states
  const [currentSessionId, setCurrentSessionId] = React.useState<string | undefined>(undefined);
  const [lastInteractionTime, setLastInteractionTime] = React.useState<number>(Date.now());

  // Unread chat messages count & interactive notification states
  const [unreadChatCount, setUnreadChatCount] = React.useState(0);
  const [activeChatChannelId, setActiveChatChannelId] = React.useState<string | undefined>(undefined);
  const [newChatMessageToast, setNewChatMessageToast] = React.useState<{
    id: string;
    senderName: string;
    content: string;
    channelId: string;
    avatarColor?: string;
  } | null>(null);

  const seenMessageIdsRef = React.useRef<Set<string>>(new Set());

  const calculateUnreadChatCount = React.useCallback(() => {
    if (!connectedAgent) {
      setUnreadChatCount(0);
      return;
    }
    const loadedChannels = loadChatChannels();
    const loadedMessages = loadChatMessages();
    const lastRead = loadLastReadTimestamps(connectedAgent.id);

    const visibleChans = loadedChannels.filter(c => c.memberIds.includes(connectedAgent.id));
    
    let totalUnread = 0;
    visibleChans.forEach(chan => {
      const chanLastRead = lastRead[chan.id] || new Date(0).toISOString();
      const chanMessages = loadedMessages.filter(m => m.channelId === chan.id);
      const unreadCount = chanMessages.filter(
        m => m.senderId !== connectedAgent.id && m.createdAt > chanLastRead
      ).length;
      totalUnread += unreadCount;
    });
    setUnreadChatCount(totalUnread);
  }, [connectedAgent]);

  // Initialize/reset seen message IDs when agent logs in/out
  React.useEffect(() => {
    if (connectedAgent) {
      const loadedMessages = loadChatMessages();
      seenMessageIdsRef.current = new Set(loadedMessages.map(m => m.id));
    } else {
      seenMessageIdsRef.current = new Set();
    }
    setNewChatMessageToast(null);
  }, [connectedAgent]);

  const checkNewMessages = React.useCallback(() => {
    if (!connectedAgent) return;

    const loadedMessages = loadChatMessages();
    const loadedChannels = loadChatChannels();
    const visibleChans = loadedChannels.filter(c => c.memberIds.includes(connectedAgent.id));
    const visibleChanIds = new Set(visibleChans.map(c => c.id));

    const newMessages = loadedMessages.filter(m => {
      // Must be inside a channel the agent has access to, not sent by themselves, and not already seen
      return (
        visibleChanIds.has(m.channelId) &&
        m.senderId !== connectedAgent.id &&
        !seenMessageIdsRef.current.has(m.id)
      );
    });

    if (newMessages.length > 0) {
      // Add all new message IDs to our seen set immediately
      newMessages.forEach(m => seenMessageIdsRef.current.add(m.id));

      const latestMsg = newMessages[newMessages.length - 1];

      // Play alert chime
      playChime();

      // Trigger Web/Desktop alert if permission granted
      if (Notification.permission === 'granted') {
        try {
          new Notification(`Nouveau message de ${latestMsg.senderName}`, {
            body: latestMsg.content,
            tag: latestMsg.channelId
          });
        } catch (e) {
          console.error('Error raising Web Notification:', e);
        }
      }

      // If outside the messaging tab, trigger the premium in-app notification card
      if (currentTab !== 'chat') {
        setNewChatMessageToast({
          id: latestMsg.id,
          senderName: latestMsg.senderName,
          content: latestMsg.content,
          channelId: latestMsg.channelId,
          avatarColor: latestMsg.senderAvatarColor
        });
      }
    }
  }, [connectedAgent, currentTab]);

  // Recalculate and reset toast when tab changes
  React.useEffect(() => {
    calculateUnreadChatCount();
    if (currentTab === 'chat') {
      setNewChatMessageToast(null);
    }
  }, [calculateUnreadChatCount, currentTab]);

  // Multi-tab sync & storage listener
  React.useEffect(() => {
    const handleChatUpdate = () => {
      calculateUnreadChatCount();
      checkNewMessages();
    };

    window.addEventListener('crm_chat_updated', handleChatUpdate);

    // Sync state if messages are saved in another tab
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'crm_chat_messages' || e.key === 'crm_chat_channels') {
        calculateUnreadChatCount();
        checkNewMessages();
        window.dispatchEvent(new CustomEvent('crm_chat_updated'));
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('crm_chat_updated', handleChatUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [calculateUnreadChatCount, checkNewMessages]);

  const handleSimulateIncomingMessage = React.useCallback(() => {
    if (!connectedAgent) return;

    // Filter agents that are not the currently logged-in one
    const otherAgents = agents.filter(a => a.id !== connectedAgent.id);
    const sender = otherAgents.length > 0 ? otherAgents[Math.floor(Math.random() * otherAgents.length)] : {
      id: 'agent-mock',
      prenom: 'Gérard',
      nom: 'Lefebvre',
      role: 'conseiller',
      avatarColor: 'bg-violet-600',
      active: true
    };

    const loadedChannels = loadChatChannels();
    const visibleChans = loadedChannels.filter(c => c.memberIds.includes(connectedAgent.id));
    const targetChannel = visibleChans.find(c => c.id === 'channel-general') || visibleChans[0];
    
    if (!targetChannel) {
      showToast("Aucun canal de discussion disponible pour simuler.", "error");
      return;
    }

    const mockMessages = [
      "Salut ! Tu as pu faire un retour sur le prospect assurance auto de ce matin ?",
      "Hello, j'ai mis à jour le statut du lead de Mme Durand.",
      "Quelqu'un est disponible pour prendre un appel urgent dans 5 minutes ?",
      "Rappel pour le point d'équipe, on se retrouve sur le canal général !",
      "Superbe performance sur les signatures de contrats aujourd'hui, bravo l'équipe !",
      "Est-ce que tu pourrais jeter un œil au dossier sinistre s'il te plaît ?"
    ];
    const phrase = mockMessages[Math.floor(Math.random() * mockMessages.length)];

    const newMsg = {
      id: `msg-simulated-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      channelId: targetChannel.id,
      senderId: sender.id,
      senderName: `${sender.prenom} ${sender.nom}`,
      senderAvatarColor: sender.avatarColor || 'bg-violet-600',
      content: phrase,
      createdAt: new Date().toISOString()
    };

    const loadedMessages = loadChatMessages();
    const updated = [...loadedMessages, newMsg];
    saveChatMessages(updated);

    // Dispatch update custom event to trigger local React hooks re-eval
    window.dispatchEvent(new CustomEvent('crm_chat_updated'));
    showToast(`Nouveau message simulé de ${sender.prenom} !`, "success");
  }, [connectedAgent, agents]);

  // Filter leads: each advisor only sees their assigned leads, administrators see all leads
  const visibleLeads = React.useMemo(() => {
    if (!connectedAgent) return [];
    if (connectedAgent.role === 'admin') return leads;
    return leads.filter(l => l.assignedAgentId === connectedAgent.id);
  }, [leads, connectedAgent]);

  // Initialize and load data on startup
  React.useEffect(() => {
    const data = loadCRMData();
    setLeads(data.leads);
    setQualifications(data.qualifications);
    setCabinet(data.cabinet);
    setAgents(data.agents);

    // Load logged-in agent session
    const loggedIn = loadConnectedAgent(data.agents);
    setConnectedAgent(loggedIn);
    if (loggedIn) {
      const sId = recordAgentLogin(loggedIn);
      setCurrentSessionId(sId);
      setLastInteractionTime(Date.now());
    }
    if (loggedIn && loggedIn.role !== 'admin') {
      setCurrentTab('leads'); // default advisors to leads view
    }

    // Prompt for notification access
    requestNotificationPermission().then(granted => {
      setNotificationPermissionGranted(granted);
    });
  }, []);

  // Login handler
  const handleLogin = (agent: Agent) => {
    setConnectedAgent(agent);
    saveConnectedAgent(agent);
    const sId = recordAgentLogin(agent);
    setCurrentSessionId(sId);
    setLastInteractionTime(Date.now());
    showToast(`Bienvenue, ${agent.prenom} ! Connexion réussie.`, "success");
    if (agent.role === 'admin') {
      setCurrentTab('dashboard');
    } else {
      setCurrentTab('leads');
    }
  };

  // Logout handler
  const handleLogout = React.useCallback(() => {
    if (connectedAgent) {
      recordAgentLogout(connectedAgent.id, 'disconnected');
    }
    setConnectedAgent(null);
    saveConnectedAgent(null);
    setCurrentSessionId(undefined);
    setCurrentTab('dashboard');
    showToast("Vous avez été déconnecté.", "info");
  }, [connectedAgent]);

  // Auto-logout due to 15 minutes of inactivity
  const handleAutoLogout = React.useCallback(() => {
    if (connectedAgent) {
      recordAgentLogout(connectedAgent.id, 'timeout');
      setConnectedAgent(null);
      saveConnectedAgent(null);
      setCurrentSessionId(undefined);
      setCurrentTab('dashboard');
      setToastMessage({ 
        text: "Session déconnectée automatiquement après 15 minutes d'inactivité.", 
        type: 'error' 
      });
    }
  }, [connectedAgent]);

  // Tracks user activity in the current session
  React.useEffect(() => {
    if (!connectedAgent) return;

    const handleInteraction = () => {
      setLastInteractionTime(Date.now());
    };

    // Events that signify user interaction
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'click', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, handleInteraction));

    // Initial ping
    pingAgentActivity(connectedAgent.id, currentSessionId);

    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleInteraction));
    };
  }, [connectedAgent, currentSessionId]);

  // Periodic interval to check inactivity & ping online status every 10s
  React.useEffect(() => {
    if (!connectedAgent) return;

    const interval = setInterval(() => {
      const idleTime = Date.now() - lastInteractionTime;
      const fifteenMinutes = 15 * 60 * 1000;

      if (idleTime >= fifteenMinutes) {
        handleAutoLogout();
      } else {
        // Ping activity to keep "En ligne" status active
        pingAgentActivity(connectedAgent.id, currentSessionId);
        // Prune other agents who have been offline for a while
        pruneOfflineAgents();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [connectedAgent, lastInteractionTime, currentSessionId, handleAutoLogout]);

  // Add agent
  const handleAddAgent = (newAgent: Agent) => {
    const updated = [...agents, newAgent];
    setAgents(updated);
    saveAgents(updated);
    showToast(`Conseiller ${newAgent.prenom} ${newAgent.nom} ajouté avec succès !`, "success");
  };

  // Update agent profile
  const handleUpdateAgent = (updatedAgent: Agent) => {
    const updated = agents.map(a => a.id === updatedAgent.id ? updatedAgent : a);
    setAgents(updated);
    saveAgents(updated);
    if (connectedAgent && connectedAgent.id === updatedAgent.id) {
      setConnectedAgent(updatedAgent);
      saveConnectedAgent(updatedAgent);
    }
    showToast(`Conseiller ${updatedAgent.prenom} ${updatedAgent.nom} mis à jour !`, "success");
  };

  // Delete agent and cleanup leads assigned to them
  const handleDeleteAgent = (agentId: string) => {
    const updatedAgents = agents.filter(a => a.id !== agentId);
    setAgents(updatedAgents);
    saveAgents(updatedAgents);

    const updatedLeads = leads.map(l => {
      if (l.assignedAgentId === agentId) {
        return { ...l, assignedAgentId: undefined };
      }
      return l;
    });
    setLeads(updatedLeads);
    saveLeads(updatedLeads);
    showToast("Agent supprimé et leads remis en attente.", "info");
  };

  // Save changes to state and disk
  const handleSaveLead = (newOrUpdatedLead: Lead) => {
    const exists = leads.some(l => l.id === newOrUpdatedLead.id);
    let updatedLeads: Lead[];

    if (exists) {
      updatedLeads = leads.map(l => l.id === newOrUpdatedLead.id ? newOrUpdatedLead : l);
      showToast("Fiche prospect mise à jour avec succès !", "success");
    } else {
      updatedLeads = [newOrUpdatedLead, ...leads];
      showToast("Nouveau prospect enregistré avec succès !", "success");
    }

    setLeads(updatedLeads);
    saveLeads(updatedLeads);
    setSelectedLead(null); // Close modal
  };

  const handleDeleteLead = (leadId: string) => {
    const updated = leads.filter(l => l.id !== leadId);
    setLeads(updated);
    saveLeads(updated);
    showToast("Le prospect a été supprimé.", "info");
  };

  const handleUpdateLeadAction = (leadId: string, executed: boolean) => {
    const updated = leads.map(l => {
      if (l.id === leadId && l.nextAction) {
        return {
          ...l,
          nextAction: {
            ...l.nextAction,
            executed
          }
        };
      }
      return l;
    });

    setLeads(updated);
    saveLeads(updated);
    
    if (executed) {
      showToast("Action marquée comme traitée et classée !", "success");
    } else {
      showToast("Action rétablie comme en attente.", "info");
    }
  };

  const handleImportLeads = (imported: Partial<Lead>[]) => {
    // Fill incomplete imported leads with valid structure
    const completeLeads: Lead[] = imported.map((part, index) => {
      const nowStr = new Date().toISOString();
      return {
        id: part.id || `lead-imported-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
        type: part.type || 'auto',
        createdAt: part.createdAt || nowStr,
        updatedAt: part.updatedAt || nowStr,
        driver: {
          nom: part.driver?.nom || 'Sans Nom',
          prenom: part.driver?.prenom || 'Sans Prénom',
          adresse: part.driver?.adresse || '',
          codePostal: part.driver?.codePostal || '',
          ville: part.driver?.ville || '',
          tel: part.driver?.tel || 'Non renseigné',
          email: part.driver?.email || '',
          dateNaissance: part.driver?.dateNaissance || '',
          datePermis: part.driver?.datePermis || '',
          carteProVtc: part.driver?.carteProVtc || '',
          dateCarteProVtc: part.driver?.dateCarteProVtc || '',
          experienceVtcAns: part.driver?.experienceVtcAns || 0
        },
        vehicle: part.type !== 'habitation' ? {
          immatriculation: part.vehicle?.immatriculation || '',
          marque: part.vehicle?.marque || '',
          modele: part.vehicle?.modele || '',
          dateMiseEnCirculation: part.vehicle?.dateMiseEnCirculation || '',
          dateAchat: part.vehicle?.dateAchat || '',
          usage: part.vehicle?.usage || (part.type === 'vtc' ? 'VTC' : 'Privé-Trajet'),
          stationnement: part.vehicle?.stationnement || 'Voie publique'
        } : undefined,
        habitation: part.type === 'habitation' ? {
          typeBien: part.habitation?.typeBien || 'appartement',
          qualiteAssure: part.habitation?.qualiteAssure || 'locataire',
          adresseBienDiffere: part.habitation?.adresseBienDiffere || false,
          adresseBien: part.habitation?.adresseBien || '',
          codePostalBien: part.habitation?.codePostalBien || '',
          villeBien: part.habitation?.villeBien || '',
          nombrePieces: part.habitation?.nombrePieces || 3,
          etage: part.habitation?.etage || 0,
          dependances: part.habitation?.dependances || false,
          cheminee: part.habitation?.cheminee || false,
          alarme: part.habitation?.alarme || false,
          piscine: part.habitation?.piscine || false,
          capitalMobilier: part.habitation?.capitalMobilier || 15000
        } : undefined,
        antecedent: {
          dejaAssure: part.antecedent?.dejaAssure ?? true,
          nombreMoisAssure: part.antecedent?.nombreMoisAssure || undefined,
          bonusMalus: part.antecedent?.bonusMalus ?? 0.85,
          aEuSinistres: part.antecedent?.aEuSinistres ?? false,
          nombreSinistres: part.antecedent?.nombreSinistres || 0,
          contratEnCours: part.antecedent?.contratEnCours ?? true,
          nomCompagnie: part.antecedent?.nomCompagnie || '',
          loiHamon: part.antecedent?.loiHamon ?? true,
          motifResiliation: part.antecedent?.motifResiliation || '',
          dateResiliation: part.antecedent?.dateResiliation || '',
          sinistresDetails: part.antecedent?.sinistresDetails || []
        },
        proposition: {
          formuleSouhaitee: part.proposition?.formuleSouhaitee || 'Standard',
          fractionnementSouhaite: part.proposition?.fractionnementSouhaite || 'Mensuel',
          cotisationAnnuelle: part.proposition?.cotisationAnnuelle || 0,
          fraisDossier: part.proposition?.fraisDossier || 0,
          optionsSelectionnees: part.proposition?.optionsSelectionnees || [],
          dateEffetSouhaitee: part.proposition?.dateEffetSouhaitee || new Date().toISOString().split('T')[0]
        },
        documents: part.documents || [],
        qualificationId: part.qualificationId || 'en_cours',
        nextAction: part.nextAction,
        assignedAgentId: part.assignedAgentId || undefined
      };
    });

    const updatedLeads = [...completeLeads, ...leads];
    setLeads(updatedLeads);
    saveLeads(updatedLeads);
    
    playChime();
    showToast(`${completeLeads.length} prospect(s) importé(s) avec succès !`, "success");
  };

  const handleSaveCabinet = (settings: CabinetSettings) => {
    setCabinet(settings);
    saveCabinetSettings(settings);
    showToast("Paramètres du cabinet mis à jour !", "success");
  };

  const handleSaveQualifications = (quals: QualificationStatus[]) => {
    setQualifications(quals);
    saveQualifications(quals);
    showToast("Statuts de qualifications mis à jour !", "success");
  };

  // Helper helper to show temporary message toasts
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // BACKGROUND TASK: Reminder Alert Engine
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timestampMs = now.getTime();
      
      const pendings = checkPendingReminders(leads, timestampMs);
      
      pendings.forEach(item => {
        // If regular agent, skip reminders for leads assigned to other agents
        if (connectedAgent && connectedAgent.role !== 'admin' && item.lead.assignedAgentId !== connectedAgent.id) {
          return;
        }

        const action = item.lead.nextAction!;
        // Construct unique ID for this specific callback event
        const triggerId = `${item.lead.id}-${action.date}-${action.time}`;
        
        // If not already triggered during this app run
        if (!triggeredActionIds.includes(triggerId)) {
          setTriggeredActionIds(prev => [...prev, triggerId]);
          
          // Spawn Native Browser alert
          triggerNativeNotification(
            `CRM : Rappel de relance`,
            item.msg,
            () => {
              setSelectedLead(item.lead);
            }
          );
          
          // Spawn In-App Slide alert
          const newTrigger: ActiveTrigger = {
            id: triggerId,
            lead: item.lead,
            msg: item.msg
          };
          setActiveTriggers(prev => [newTrigger, ...prev]);
        }
      });
    }, 20000); // scan every 20 seconds for precise triggers

    return () => clearInterval(interval);
  }, [leads, triggeredActionIds, connectedAgent]);

  const handleDismissTrigger = (id: string) => {
    setActiveTriggers(prev => prev.filter(t => t.id !== id));
  };

  const handleExecuteTrigger = (trigger: ActiveTrigger) => {
    handleUpdateLeadAction(trigger.lead.id, true);
    handleDismissTrigger(trigger.id);
  };

  const handleOpenLeadFromTrigger = (lead: Lead, triggerId: string) => {
    setSelectedLead(lead);
    handleDismissTrigger(triggerId);
  };

  // Global search implementation (across topbar search input)
  const handleGlobalSearchRedirect = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearchTerm.trim()) {
      setCurrentTab('leads');
    }
  };

  // Authentication Gate
  if (!connectedAgent) {
    return (
      <div className="bg-slate-900 min-h-screen text-slate-100" id="crm-auth-gate">
        <LoginView 
          agents={agents}
          cabinet={cabinet}
          onLogin={handleLogin}
        />
        {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 bg-slate-950 border border-slate-800 text-white text-xs font-semibold rounded-xl shadow-2xl flex items-center gap-2.5 animate-fadeIn">
            {toastMessage.type === 'success' && <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />}
            {toastMessage.type === 'info' && <Info className="w-4.5 h-4.5 text-sky-400" />}
            <span>{toastMessage.text}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-800 font-sans antialiased" id="crm-app-root">
      
      {/* 1. Sidebar Nav */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        cabinet={cabinet} 
        leads={visibleLeads}
        connectedAgent={connectedAgent}
        onLogout={handleLogout}
        unreadChatCount={unreadChatCount}
      />

      {/* 2. Main content container panel */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header Search Bar */}
        <header className="h-12 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0">
          <form onSubmit={handleGlobalSearchRedirect} className="relative w-64 hidden sm:block">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Recherche de prospect..."
              value={globalSearchTerm}
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1 border border-slate-200 bg-slate-50 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 transition-all placeholder:text-slate-400"
            />
          </form>

          {/* User Profile / Notification settings */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Simulation button */}
            <button
              onClick={handleSimulateIncomingMessage}
              className="px-2 py-1 rounded border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
              title="Simuler la réception d'un nouveau message de l'équipe"
              type="button"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden lg:inline">Simuler Message</span>
            </button>

            {/* Global Unread Chat Badge Icon */}
            <button
              onClick={() => setCurrentTab('chat')}
              className={`p-1 px-2 rounded border flex items-center gap-1.5 text-[10px] font-semibold transition-all relative cursor-pointer shrink-0 ${
                unreadChatCount > 0
                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 animate-pulse'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              }`}
              title={`${unreadChatCount} message(s) non lu(s)`}
              type="button"
            >
              <div className="relative flex items-center justify-center">
                <MessageSquare className={`w-3.5 h-3.5 ${unreadChatCount > 0 ? 'text-rose-600' : 'text-slate-450'}`} />
                {unreadChatCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-600 text-[8px] font-bold font-mono text-white ring-1 ring-white">
                    {unreadChatCount}
                  </span>
                )}
              </div>
              <span className="font-mono hidden md:inline">Discussion</span>
            </button>

            <div className="h-4 w-px bg-slate-200" />

            {/* Native alert toggle check */}
            <button 
              onClick={async () => {
                const granted = await requestNotificationPermission();
                setNotificationPermissionGranted(granted);
                if (granted) {
                  playChime();
                  showToast("Notifications de bureau autorisées !", "success");
                } else {
                  showToast("Autorisez les notifications dans les paramètres de votre navigateur.", "info");
                }
              }}
              className={`p-1 rounded border flex items-center gap-1 text-[10px] font-semibold transition-all cursor-pointer ${
                notificationPermissionGranted 
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700' 
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              }`}
              title={notificationPermissionGranted ? "Notifications activées" : "Activer les notifications push"}
            >
              {notificationPermissionGranted ? (
                <>
                  <BellRing className="w-3.5 h-3.5 text-emerald-600 animate-swing" />
                  <span className="hidden md:inline font-mono">Push Actif</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span className="hidden md:inline font-mono">Activer Push</span>
                </>
              )}
            </button>

            <div className="h-3 w-px bg-slate-200" />

            {/* Operator connection badge */}
            <div className="flex items-center gap-2">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-white text-[10px] text-center shadow-xs ${connectedAgent.avatarColor || 'bg-slate-600'}`}>
                {connectedAgent.prenom.substring(0, 1).toUpperCase()}{connectedAgent.nom.substring(0, 1).toUpperCase()}
              </div>
              <div className="text-left hidden md:block leading-none">
                <span className="text-[10px] font-bold text-slate-700 block">{connectedAgent.prenom} {connectedAgent.nom}</span>
                <span className="text-[8px] text-emerald-500 font-mono flex items-center gap-0.5 mt-0.5 font-bold">
                  <span className="h-1 w-1 rounded-full bg-emerald-500 animate-ping" /> {connectedAgent.role === 'admin' ? 'Directeur' : 'Conseiller'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Global Unread Message Reminder Banner */}
        {currentTab !== 'chat' && unreadChatCount > 0 && (
          <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white px-6 py-3 flex items-center justify-between shadow-md shrink-0 border-b border-indigo-500/20 animate-slideDown">
            <div className="flex items-center gap-3 min-w-0">
              <span className="p-1.5 bg-white/15 rounded-lg text-white">
                <MessageSquare className="w-4 h-4 animate-bounce" />
              </span>
              <p className="text-xs font-semibold leading-relaxed truncate">
                Vous avez <span className="font-extrabold underline decoration-white decoration-2 underline-offset-2">{unreadChatCount} message(s) non lu(s)</span> de vos collègues dans la messagerie interne.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <button
                onClick={() => setCurrentTab('chat')}
                className="bg-white hover:bg-indigo-50 text-indigo-700 hover:text-indigo-800 font-bold px-3 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer shadow-md uppercase tracking-wider"
              >
                Ouvrir la messagerie
              </button>
            </div>
          </div>
        )}

        {/* Scrollable View Content wrapper */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {currentTab === 'dashboard' && (
            <DashboardView 
              leads={visibleLeads}
              qualifications={qualifications}
              agents={agents}
              onSelectLead={setSelectedLead}
              onUpdateLeadAction={handleUpdateLeadAction}
              setCurrentTab={setCurrentTab}
            />
          )}

          {currentTab === 'leads' && (
            <LeadsView 
              leads={visibleLeads}
              qualifications={qualifications}
              agents={agents}
              connectedAgent={connectedAgent}
              onAddLead={() => {
                setModalDefaultType('auto');
                setSelectedLead(undefined); // open empty modal
              }}
              onSelectLead={setSelectedLead}
              onDeleteLead={handleDeleteLead}
              onImportLeads={handleImportLeads}
            />
          )}

          {currentTab === 'chat' && (
            <ChatView 
              connectedAgent={connectedAgent}
              agents={agents}
              initialChannelId={activeChatChannelId}
            />
          )}

          {currentTab === 'agents' && connectedAgent?.role === 'admin' && (
            <AgentsView 
              agents={agents}
              leads={leads}
              connectedAgent={connectedAgent}
              onAddAgent={handleAddAgent}
              onUpdateAgent={handleUpdateAgent}
              onDeleteAgent={handleDeleteAgent}
            />
          )}

          {currentTab === 'tracking' && connectedAgent?.role === 'admin' && (
            <AgentTrackingView 
              agents={agents}
              leads={leads}
              qualifications={qualifications}
            />
          )}

          {currentTab === 'settings' && connectedAgent?.role === 'admin' && (
            <SettingsView 
              cabinet={cabinet}
              qualifications={qualifications}
              onSaveCabinet={handleSaveCabinet}
              onSaveQualifications={handleSaveQualifications}
            />
          )}

        </div>
      </main>

      {/* 3. Global Lead Creation / Editing Modal Overlay */}
      {selectedLead !== null && (
        <LeadModal 
          lead={selectedLead} // can be undefined if adding new
          defaultType={modalDefaultType}
          qualifications={qualifications}
          agents={agents}
          connectedAgent={connectedAgent}
          onClose={() => setSelectedLead(null)}
          onSave={handleSaveLead}
        />
      )}

      {/* 4. Live Floating In-app Reminder Toasts Panel (Bottom-Right) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {activeTriggers.map((trig) => (
          <div 
            key={trig.id} 
            className="p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 flex flex-col gap-2 pointer-events-auto transform animate-slideUp"
            id={`trigger-toast-${trig.id}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-400 animate-bounce" />
                <span className="text-xs font-bold font-mono tracking-wider text-amber-400">RAPPEL DE RELANCE</span>
              </div>
              <button 
                onClick={() => handleDismissTrigger(trig.id)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs leading-normal font-medium text-slate-100">
              {trig.msg}
            </p>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800 mt-1">
              <button
                onClick={() => handleOpenLeadFromTrigger(trig.lead, trig.id)}
                className="flex-1 py-1 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-semibold text-center transition-all cursor-pointer"
              >
                Ouvrir fiche
              </button>
              <button
                onClick={() => handleExecuteTrigger(trig)}
                className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-semibold text-center transition-all cursor-pointer"
              >
                Marquer fait
              </button>
              <button
                onClick={() => handleDismissTrigger(trig.id)}
                className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-semibold text-center transition-all cursor-pointer"
              >
                Plus tard
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 5. Small Global Success/Info message Toasts */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 bg-slate-900 border border-slate-800 text-white text-xs font-semibold rounded-xl shadow-2xl flex items-center gap-2.5 animate-fadeIn">
          {toastMessage.type === 'success' && <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />}
          {toastMessage.type === 'info' && <Info className="w-4.5 h-4.5 text-sky-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 6. Live Floating Chat Message Toast (Top-Right) */}
      {newChatMessageToast && (
        <div className="fixed top-16 right-6 z-50 max-w-sm w-full bg-slate-950 text-white rounded-2xl shadow-2xl border border-slate-800 p-4 animate-slideDown flex flex-col gap-2.5 pointer-events-auto">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
                <MessageSquare className="w-4 h-4 animate-pulse" />
              </div>
              <span className="text-[10px] font-bold font-mono tracking-wider text-blue-400 uppercase">NOUVEAU MESSAGE DE CHAT</span>
            </div>
            <button 
              onClick={() => setNewChatMessageToast(null)}
              className="p-1 rounded bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-start gap-3 mt-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-inner ${newChatMessageToast.avatarColor || 'bg-slate-600'}`}>
              {newChatMessageToast.senderName.substring(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <span className="text-xs font-bold text-slate-100 block">{newChatMessageToast.senderName}</span>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                {newChatMessageToast.content}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-800 mt-1">
            <button
              onClick={() => {
                setActiveChatChannelId(newChatMessageToast.channelId);
                setCurrentTab('chat');
                setNewChatMessageToast(null);
              }}
              className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Consulter / Répondre</span>
            </button>
            <button
              onClick={() => setNewChatMessageToast(null)}
              className="py-1.5 px-3 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer"
            >
              Plus tard
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
