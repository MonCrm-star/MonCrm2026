import { ChatChannel, ChatMessage, Agent } from '../types';

const INITIAL_CHANNELS: ChatChannel[] = [
  {
    id: 'channel-general',
    name: 'Groupe Général (Agence)',
    type: 'group',
    memberIds: ['agent-1', 'agent-2', 'agent-3'],
    createdBy: 'agent-1',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
  },
  {
    id: 'channel-direct-1-2',
    name: 'Jean Courtier & Sarah Dupont',
    type: 'direct',
    memberIds: ['agent-1', 'agent-2'],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'channel-direct-1-3',
    name: 'Jean Courtier & Pierre Lemoine',
    type: 'direct',
    memberIds: ['agent-1', 'agent-3'],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    channelId: 'channel-general',
    senderId: 'agent-1',
    senderName: 'Jean Courtier',
    senderAvatarColor: 'bg-indigo-600',
    content: 'Bienvenue sur notre espace de discussion interne ! Ce chat est réservé aux échanges professionnels de l\'agence. Les conseillers peuvent échanger directement avec moi ou participer aux groupes.',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'msg-2',
    channelId: 'channel-general',
    senderId: 'agent-2',
    senderName: 'Sarah Dupont',
    senderAvatarColor: 'bg-emerald-600',
    content: 'Bonjour Jean, merci pour la mise en place. C\'est parfait pour coordonner nos relances et dossiers urgents !',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'msg-3',
    channelId: 'channel-direct-1-2',
    senderId: 'agent-1',
    senderName: 'Jean Courtier',
    senderAvatarColor: 'bg-indigo-600',
    content: 'Bonjour Sarah, as-tu pu avancer sur le dossier VTC de M. Martin ?',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'msg-4',
    channelId: 'channel-direct-1-2',
    senderId: 'agent-2',
    senderName: 'Sarah Dupont',
    senderAvatarColor: 'bg-emerald-600',
    content: 'Bonjour Jean ! Oui, j\'attends son relevé d\'informations pour finaliser la proposition. Je l\'ai relancé ce matin.',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  }
];

export function loadChatChannels(): ChatChannel[] {
  try {
    const stored = localStorage.getItem('crm_chat_channels');
    return stored ? JSON.parse(stored) : INITIAL_CHANNELS;
  } catch (e) {
    console.error('Error loading chat channels:', e);
    return INITIAL_CHANNELS;
  }
}

export function saveChatChannels(channels: ChatChannel[]) {
  try {
    localStorage.setItem('crm_chat_channels', JSON.stringify(channels));
  } catch (e) {
    console.error('Error saving chat channels:', e);
  }
}

export function loadChatMessages(): ChatMessage[] {
  try {
    const stored = localStorage.getItem('crm_chat_messages');
    return stored ? JSON.parse(stored) : INITIAL_MESSAGES;
  } catch (e) {
    console.error('Error loading chat messages:', e);
    return INITIAL_MESSAGES;
  }
}

export function saveChatMessages(messages: ChatMessage[]) {
  try {
    localStorage.setItem('crm_chat_messages', JSON.stringify(messages));
  } catch (e) {
    console.error('Error saving chat messages:', e);
  }
}

export function loadLastReadTimestamps(agentId: string): Record<string, string> {
  try {
    const stored = localStorage.getItem('crm_chat_last_read');
    const all = stored ? JSON.parse(stored) : {};
    return all[agentId] || {};
  } catch (e) {
    console.error('Error loading last read timestamps:', e);
    return {};
  }
}

export function saveLastReadTimestamp(agentId: string, channelId: string, timestamp: string) {
  try {
    const stored = localStorage.getItem('crm_chat_last_read');
    const all = stored ? JSON.parse(stored) : {};
    if (!all[agentId]) {
      all[agentId] = {};
    }
    all[agentId][channelId] = timestamp;
    localStorage.setItem('crm_chat_last_read', JSON.stringify(all));
  } catch (e) {
    console.error('Error saving last read timestamp:', e);
  }
}

