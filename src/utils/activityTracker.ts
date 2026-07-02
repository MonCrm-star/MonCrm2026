import { Agent } from '../types';

export interface ConnectionLog {
  id: string;
  agentId: string;
  agentName: string;
  agentRole: 'admin' | 'agent';
  loginTime: string; // ISO string
  logoutTime?: string; // ISO string
  durationMinutes?: number; // Calculated on logout
  status: 'active' | 'disconnected' | 'timeout'; // disconnected = user logout, timeout = 15m inactivity
}

export interface AgentActivityState {
  agentId: string;
  lastActiveAt: string; // ISO string
  isOnline: boolean;
  currentSessionId?: string;
}

// Generates simulated historical connection logs for the past 5 days
function generateMockLogs(): ConnectionLog[] {
  const logs: ConnectionLog[] = [];
  const now = new Date();
  
  // Names of agents
  const agentsData = [
    { id: 'agent-2', name: 'Sarah Dupont', role: 'agent' as const },
    { id: 'agent-3', name: 'Pierre Lemoine', role: 'agent' as const },
    { id: 'agent-1', name: 'Jean Courtier', role: 'admin' as const }
  ];

  // Helper to generate a date relative to now
  const getRelativeDate = (daysAgo: number, hours: number, minutes: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };

  // 5 days ago logs
  logs.push({
    id: 'log-1',
    agentId: 'agent-2',
    agentName: 'Sarah Dupont',
    agentRole: 'agent',
    loginTime: getRelativeDate(5, 8, 30),
    logoutTime: getRelativeDate(5, 12, 15),
    durationMinutes: 225,
    status: 'disconnected'
  });
  logs.push({
    id: 'log-2',
    agentId: 'agent-3',
    agentName: 'Pierre Lemoine',
    agentRole: 'agent',
    loginTime: getRelativeDate(5, 9, 0),
    logoutTime: getRelativeDate(5, 17, 30),
    durationMinutes: 510,
    status: 'disconnected'
  });

  // 4 days ago logs
  logs.push({
    id: 'log-3',
    agentId: 'agent-2',
    agentName: 'Sarah Dupont',
    agentRole: 'agent',
    loginTime: getRelativeDate(4, 8, 25),
    logoutTime: getRelativeDate(4, 16, 45),
    durationMinutes: 500,
    status: 'disconnected'
  });
  logs.push({
    id: 'log-4',
    agentId: 'agent-3',
    agentName: 'Pierre Lemoine',
    agentRole: 'agent',
    loginTime: getRelativeDate(4, 13, 10),
    logoutTime: getRelativeDate(4, 13, 25), // short connection
    durationMinutes: 15,
    status: 'timeout' // got kicked out due to idle
  });

  // 3 days ago logs
  logs.push({
    id: 'log-5',
    agentId: 'agent-1',
    agentName: 'Jean Courtier',
    agentRole: 'admin',
    loginTime: getRelativeDate(3, 9, 15),
    logoutTime: getRelativeDate(3, 18, 0),
    durationMinutes: 525,
    status: 'disconnected'
  });
  logs.push({
    id: 'log-6',
    agentId: 'agent-2',
    agentName: 'Sarah Dupont',
    agentRole: 'agent',
    loginTime: getRelativeDate(3, 8, 40),
    logoutTime: getRelativeDate(3, 17, 10),
    durationMinutes: 510,
    status: 'disconnected'
  });

  // 2 days ago logs
  logs.push({
    id: 'log-7',
    agentId: 'agent-3',
    agentName: 'Pierre Lemoine',
    agentRole: 'agent',
    loginTime: getRelativeDate(2, 8, 55),
    logoutTime: getRelativeDate(2, 17, 0),
    durationMinutes: 485,
    status: 'disconnected'
  });
  logs.push({
    id: 'log-8',
    agentId: 'agent-2',
    agentName: 'Sarah Dupont',
    agentRole: 'agent',
    loginTime: getRelativeDate(2, 9, 30),
    logoutTime: getRelativeDate(2, 12, 0),
    durationMinutes: 150,
    status: 'disconnected'
  });

  // Yesterday logs
  logs.push({
    id: 'log-9',
    agentId: 'agent-2',
    agentName: 'Sarah Dupont',
    agentRole: 'agent',
    loginTime: getRelativeDate(1, 8, 20),
    logoutTime: getRelativeDate(1, 17, 5),
    durationMinutes: 525,
    status: 'disconnected'
  });
  logs.push({
    id: 'log-10',
    agentId: 'agent-3',
    agentName: 'Pierre Lemoine',
    agentRole: 'agent',
    loginTime: getRelativeDate(1, 9, 10),
    logoutTime: getRelativeDate(1, 16, 50),
    durationMinutes: 460,
    status: 'disconnected'
  });

  return logs;
}

// Retrieve connection logs from localStorage
export function loadConnectionLogs(): ConnectionLog[] {
  try {
    const stored = localStorage.getItem('crm_connection_logs');
    if (stored) return JSON.parse(stored);
    const initial = generateMockLogs();
    saveConnectionLogs(initial);
    return initial;
  } catch (e) {
    console.error('Error loading connection logs:', e);
    return [];
  }
}

// Save connection logs to localStorage
export function saveConnectionLogs(logs: ConnectionLog[]) {
  try {
    localStorage.setItem('crm_connection_logs', JSON.stringify(logs));
  } catch (e) {
    console.error('Error saving connection logs:', e);
  }
}

// Load activity status of all agents
export function loadAgentsActivity(): Record<string, AgentActivityState> {
  try {
    const stored = localStorage.getItem('crm_agents_activity');
    if (stored) return JSON.parse(stored);
    
    // Default activity: create initial records for the default agents
    const initial: Record<string, AgentActivityState> = {
      'agent-1': { agentId: 'agent-1', lastActiveAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), isOnline: true },
      'agent-2': { agentId: 'agent-2', lastActiveAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), isOnline: false },
      'agent-3': { agentId: 'agent-3', lastActiveAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), isOnline: false },
    };
    saveAgentsActivity(initial);
    return initial;
  } catch (e) {
    console.error('Error loading agents activity:', e);
    return {};
  }
}

// Save activity status of all agents
export function saveAgentsActivity(activities: Record<string, AgentActivityState>) {
  try {
    localStorage.setItem('crm_agents_activity', JSON.stringify(activities));
  } catch (e) {
    console.error('Error saving agents activity:', e);
  }
}

// Record an agent logging in
export function recordAgentLogin(agent: Agent): string {
  const sessionId = `session-${Date.now()}`;
  const nowStr = new Date().toISOString();
  
  // Update connection logs
  const logs = loadConnectionLogs();
  const newLog: ConnectionLog = {
    id: sessionId,
    agentId: agent.id,
    agentName: `${agent.prenom} ${agent.nom}`,
    agentRole: agent.role,
    loginTime: nowStr,
    status: 'active'
  };
  saveConnectionLogs([newLog, ...logs]);

  // Update activity status
  const activities = loadAgentsActivity();
  activities[agent.id] = {
    agentId: agent.id,
    lastActiveAt: nowStr,
    isOnline: true,
    currentSessionId: sessionId
  };
  saveAgentsActivity(activities);

  // Trigger cross-tab/local updates
  window.dispatchEvent(new CustomEvent('crm_activity_updated'));
  return sessionId;
}

// Record an agent active ping (updates timestamp)
export function pingAgentActivity(agentId: string, sessionId?: string) {
  const nowStr = new Date().toISOString();
  const activities = loadAgentsActivity();
  
  const current = activities[agentId];
  activities[agentId] = {
    agentId,
    lastActiveAt: nowStr,
    isOnline: true,
    currentSessionId: sessionId || current?.currentSessionId
  };
  saveAgentsActivity(activities);
  window.dispatchEvent(new CustomEvent('crm_activity_updated'));
}

// Record an agent logging out
export function recordAgentLogout(agentId: string, status: 'disconnected' | 'timeout' = 'disconnected') {
  const activities = loadAgentsActivity();
  const activity = activities[agentId];
  const nowStr = new Date().toISOString();

  if (activity) {
    activity.isOnline = false;
    activity.lastActiveAt = nowStr;
    saveAgentsActivity(activities);
  }

  // Finalize active connection log for this session if it exists
  const logs = loadConnectionLogs();
  const activeLogIndex = logs.findIndex(l => l.agentId === agentId && l.status === 'active');
  
  if (activeLogIndex !== -1) {
    const log = logs[activeLogIndex];
    const loginTime = new Date(log.loginTime);
    const logoutTime = new Date(nowStr);
    const durationMs = logoutTime.getTime() - loginTime.getTime();
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

    logs[activeLogIndex] = {
      ...log,
      logoutTime: nowStr,
      durationMinutes,
      status: status
    };
    saveConnectionLogs(logs);
  }

  window.dispatchEvent(new CustomEvent('crm_activity_updated'));
}

// Function to check and prune offline agents (not active in last 10 minutes)
export function pruneOfflineAgents() {
  const activities = loadAgentsActivity();
  const now = Date.now();
  let modified = false;

  Object.keys(activities).forEach(agentId => {
    const act = activities[agentId];
    if (act.isOnline) {
      const lastActive = new Date(act.lastActiveAt).getTime();
      const diffMinutes = (now - lastActive) / 60000;
      
      // If no activity for more than 10 minutes, set offline but don't force logout log 
      // unless we know it timed out (15m is handled by the client-side session itself)
      if (diffMinutes > 10) {
        act.isOnline = false;
        modified = true;
      }
    }
  });

  if (modified) {
    saveAgentsActivity(activities);
    window.dispatchEvent(new CustomEvent('crm_activity_updated'));
  }
}
