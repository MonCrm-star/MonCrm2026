import React from 'react';
import { Agent, ChatChannel, ChatMessage } from '../types';
import { 
  loadChatChannels, 
  saveChatChannels, 
  loadChatMessages, 
  saveChatMessages,
  loadLastReadTimestamps,
  saveLastReadTimestamp
} from '../utils/chatStorage';
import { loadAgentsActivity } from '../utils/activityTracker';
import { MessageSquare, Send, Users, User, Plus, X, Lock, Shield, Info } from 'lucide-react';

interface ChatViewProps {
  connectedAgent: Agent | null;
  agents: Agent[];
  initialChannelId?: string;
}

export default function ChatView({ connectedAgent, agents, initialChannelId }: ChatViewProps) {
  const [channels, setChannels] = React.useState<ChatChannel[]>([]);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [selectedChannel, setSelectedChannel] = React.useState<ChatChannel | null>(null);
  const [newMessageText, setNewMessageText] = React.useState('');
  const [lastReadTimes, setLastReadTimes] = React.useState<Record<string, string>>({});
  const [agentActivities, setAgentActivities] = React.useState<Record<string, { isOnline: boolean }>>({});
  
  // Create Group State
  const [showCreateGroup, setShowCreateGroup] = React.useState(false);
  const [groupName, setGroupName] = React.useState('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = React.useState<string[]>([]);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Sync agent online/offline activities
  React.useEffect(() => {
    setAgentActivities(loadAgentsActivity());

    const handleUpdate = () => {
      setAgentActivities(loadAgentsActivity());
    };
    window.addEventListener('crm_activity_updated', handleUpdate);
    return () => {
      window.removeEventListener('crm_activity_updated', handleUpdate);
    };
  }, []);

  // Load chat data
  React.useEffect(() => {
    const loadedChannels = loadChatChannels();
    const loadedMessages = loadChatMessages();
    setChannels(loadedChannels);
    setMessages(loadedMessages);

    if (connectedAgent) {
      const readTimes = loadLastReadTimestamps(connectedAgent.id);
      setLastReadTimes(readTimes);

      // 1. Prefer initialChannelId if provided
      if (initialChannelId) {
        const targetChan = loadedChannels.find(
          c => c.id === initialChannelId && c.memberIds.includes(connectedAgent.id)
        );
        if (targetChan) {
          setSelectedChannel(targetChan);
          const nowStr = new Date().toISOString();
          saveLastReadTimestamp(connectedAgent.id, targetChan.id, nowStr);
          setLastReadTimes(prev => ({ ...prev, [targetChan.id]: nowStr }));
          window.dispatchEvent(new CustomEvent('crm_chat_updated'));
          return;
        }
      }

      // 2. Fallback to general channel
      const generalChan = loadedChannels.find(
        c => c.id === 'channel-general' && c.memberIds.includes(connectedAgent.id)
      );
      if (generalChan) {
        setSelectedChannel(generalChan);
        const nowStr = new Date().toISOString();
        saveLastReadTimestamp(connectedAgent.id, generalChan.id, nowStr);
        setLastReadTimes(prev => ({ ...prev, [generalChan.id]: nowStr }));
        window.dispatchEvent(new CustomEvent('crm_chat_updated'));
      } else {
        const firstChan = loadedChannels.find(c => c.memberIds.includes(connectedAgent.id));
        if (firstChan) {
          setSelectedChannel(firstChan);
          const nowStr = new Date().toISOString();
          saveLastReadTimestamp(connectedAgent.id, firstChan.id, nowStr);
          setLastReadTimes(prev => ({ ...prev, [firstChan.id]: nowStr }));
          window.dispatchEvent(new CustomEvent('crm_chat_updated'));
        }
      }
    }
  }, [connectedAgent, initialChannelId]);

  // Sync dynamic change to initialChannelId
  React.useEffect(() => {
    if (connectedAgent && initialChannelId && channels.length > 0) {
      const targetChan = channels.find(
        c => c.id === initialChannelId && c.memberIds.includes(connectedAgent.id)
      );
      if (targetChan && (!selectedChannel || selectedChannel.id !== initialChannelId)) {
        setSelectedChannel(targetChan);
        const nowStr = new Date().toISOString();
        saveLastReadTimestamp(connectedAgent.id, targetChan.id, nowStr);
        setLastReadTimes(prev => ({ ...prev, [targetChan.id]: nowStr }));
        window.dispatchEvent(new CustomEvent('crm_chat_updated'));
      }
    }
  }, [initialChannelId, channels, connectedAgent, selectedChannel]);

  // Update last read timestamp when selected channel changes
  React.useEffect(() => {
    if (connectedAgent && selectedChannel) {
      const nowStr = new Date().toISOString();
      saveLastReadTimestamp(connectedAgent.id, selectedChannel.id, nowStr);
      setLastReadTimes(prev => ({ ...prev, [selectedChannel.id]: nowStr }));
      window.dispatchEvent(new CustomEvent('crm_chat_updated'));
    }
  }, [selectedChannel, connectedAgent]);

  // Scroll to bottom when messages or selectedChannel changes
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedChannel]);

  if (!connectedAgent) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-slate-500">
        <Lock className="w-8 h-8 mb-2 text-slate-300" />
        <p className="text-xs">Veuillez vous connecter pour accéder à la messagerie interne.</p>
      </div>
    );
  }

  const isAdmin = connectedAgent.role === 'admin';

  // Filter channels based on members
  const visibleChannels = channels.filter(c => c.memberIds.includes(connectedAgent.id));
  const groupChannels = visibleChannels.filter(c => c.type === 'group');
  
  // Direct chats:
  // For admins: all other agents (we want to list or create direct channels dynamically)
  // For agents: ONLY direct chats involving the admin.
  // Let's get the list of active direct channels
  const directChannels = visibleChannels.filter(c => c.type === 'direct');

  // Let's list potential direct chat partners:
  // Admin can chat with any agent (except themselves)
  // Agent can ONLY chat with admins (typically agent-1 is the primary admin)
  const availablePartners = agents.filter(a => {
    if (a.id === connectedAgent.id) return false;
    if (isAdmin) return true; // Admin can chat with anyone
    return a.role === 'admin'; // Agent can only chat with admins
  });

  // Get display name for a channel
  const getChannelDisplayName = (channel: ChatChannel) => {
    if (channel.type === 'group') return channel.name;
    
    // For direct chat, find the other member
    const otherMemberId = channel.memberIds.find(id => id !== connectedAgent.id);
    const otherMember = agents.find(a => a.id === otherMemberId);
    if (otherMember) {
      return `👤 ${otherMember.prenom} ${otherMember.nom} (${otherMember.role === 'admin' ? 'Directeur' : 'Conseiller'})`;
    }
    return channel.name;
  };

  // Helper to get selected channel's details
  const getSelectedChannelSub = () => {
    if (!selectedChannel) return '';
    if (selectedChannel.type === 'group') {
      const names = selectedChannel.memberIds
        .map(id => {
          const a = agents.find(agent => agent.id === id);
          return a ? `${a.prenom} ${a.nom}` : '';
        })
        .filter(Boolean)
        .join(', ');
      return `Membres : ${names}`;
    } else {
      const otherMemberId = selectedChannel.memberIds.find(id => id !== connectedAgent.id);
      const otherMember = agents.find(a => a.id === otherMemberId);
      return otherMember 
        ? `${otherMember.role === 'admin' ? 'Directeur de l\'agence' : 'Conseiller'} • ${otherMember.email}`
        : 'Discussion directe';
    }
  };

  // Select or create a direct channel
  const handleSelectPartner = (partnerId: string) => {
    // Check if direct channel already exists
    const existing = channels.find(
      c => c.type === 'direct' && 
      c.memberIds.length === 2 && 
      c.memberIds.includes(connectedAgent.id) && 
      c.memberIds.includes(partnerId)
    );

    if (existing) {
      setSelectedChannel(existing);
    } else {
      // Create a new direct channel
      const partner = agents.find(a => a.id === partnerId);
      const partnerName = partner ? `${partner.prenom} ${partner.nom}` : 'Agent';
      const newChan: ChatChannel = {
        id: `channel-direct-${connectedAgent.id}-${partnerId}-${Date.now()}`,
        name: `${connectedAgent.prenom} & ${partnerName}`,
        type: 'direct',
        memberIds: [connectedAgent.id, partnerId],
        createdAt: new Date().toISOString()
      };

      const updated = [newChan, ...channels];
      setChannels(updated);
      saveChatChannels(updated);
      setSelectedChannel(newChan);
    }
  };

  // Send message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedChannel) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      channelId: selectedChannel.id,
      senderId: connectedAgent.id,
      senderName: `${connectedAgent.prenom} ${connectedAgent.nom}`,
      senderAvatarColor: connectedAgent.avatarColor || 'bg-slate-600',
      content: newMessageText.trim(),
      createdAt: new Date().toISOString()
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    saveChatMessages(updated);

    // Update last read timestamp for this channel
    const nowStr = new Date().toISOString();
    saveLastReadTimestamp(connectedAgent.id, selectedChannel.id, nowStr);
    setLastReadTimes(prev => ({ ...prev, [selectedChannel.id]: nowStr }));

    setNewMessageText('');
    window.dispatchEvent(new CustomEvent('crm_chat_updated'));
  };

  // Create Group Submit
  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedGroupMemberIds.length === 0) return;

    // Always include admin in the members list
    const members = Array.from(new Set([connectedAgent.id, ...selectedGroupMemberIds]));

    const newChan: ChatChannel = {
      id: `channel-group-${Date.now()}`,
      name: groupName.trim(),
      type: 'group',
      memberIds: members,
      createdBy: connectedAgent.id,
      createdAt: new Date().toISOString()
    };

    const updated = [newChan, ...channels];
    setChannels(updated);
    saveChatChannels(updated);
    setSelectedChannel(newChan);
    
    // Reset state
    setGroupName('');
    setSelectedGroupMemberIds([]);
    setShowCreateGroup(false);
  };

  const toggleGroupMember = (id: string) => {
    if (selectedGroupMemberIds.includes(id)) {
      setSelectedGroupMemberIds(selectedGroupMemberIds.filter(mid => mid !== id));
    } else {
      setSelectedGroupMemberIds([...selectedGroupMemberIds, id]);
    }
  };

  const getUnreadCount = (channelId: string) => {
    const lastRead = lastReadTimes[channelId] || new Date(0).toISOString();
    const chanMessages = messages.filter(m => m.channelId === channelId);
    return chanMessages.filter(
      m => m.senderId !== connectedAgent.id && m.createdAt > lastRead
    ).length;
  };

  const channelMessages = selectedChannel 
    ? messages.filter(m => m.channelId === selectedChannel.id)
    : [];

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-110px)] p-4 md:p-6 animate-fade-in" id="chat-view-container">
      {/* Header section */}
      <div className="flex items-center justify-between mb-5 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5.5 h-5.5 text-blue-600" />
            Messagerie Interne
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin 
              ? 'Discutez en direct avec vos conseillers ou gérez vos groupes de discussion.' 
              : 'Échangez avec le directeur d\'agence ou participez aux groupes officiels.'}
          </p>
        </div>

        {/* Security / Rule Reminder Banner */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded text-[11px] font-medium text-blue-700">
          <Shield className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span>
            {isAdmin 
              ? 'Règle de sécurité active : Les agents ne peuvent pas discuter entre eux en privé.'
              : 'Messagerie sécurisée : Vos échanges directs s\'effectuent uniquement avec le Directeur.'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-[580px]">
        
        {/* Left Side: Channel / Contact Selector (col-span-4) */}
        <div className="lg:col-span-4 border-r border-slate-100 flex flex-col h-full bg-slate-50/50">
          
          {/* Header of Channel Selector */}
          <div className="p-3 border-b border-slate-100 bg-white flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Canaux et échanges</span>
            
            {/* Create group button (Admin Only) */}
            {isAdmin && (
              <button
                onClick={() => setShowCreateGroup(true)}
                className="px-2 py-1 text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                title="Créer un nouveau groupe d'agence"
              >
                <Plus className="w-3 h-3" />
                <span>Nouveau groupe</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            
            {/* Groups Section */}
            <div>
              <div className="px-2 mb-1 flex items-center gap-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <Users className="w-3 h-3" />
                <span>Mes groupes ({groupChannels.length})</span>
              </div>
              <div className="space-y-0.5">
                {groupChannels.length === 0 ? (
                  <p className="px-2 py-1.5 text-[11px] text-slate-400 italic">Aucun groupe disponible</p>
                ) : (
                  groupChannels.map(channel => {
                    const isSelected = selectedChannel?.id === channel.id;
                    const unread = getUnreadCount(channel.id);
                    return (
                      <button
                        key={channel.id}
                        onClick={() => setSelectedChannel(channel)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-600 text-white shadow-xs' 
                            : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Users className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                          <span className="truncate">{channel.name}</span>
                        </div>
                        {unread > 0 && (
                          <span className="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 animate-pulse">
                            {unread}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Direct Conversations Section */}
            <div>
              <div className="px-2 mb-1 flex items-center gap-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <User className="w-3 h-3" />
                <span>{isAdmin ? 'Membres de l\'équipe (Individuel)' : 'Mon Directeur (En direct)'}</span>
              </div>
              
              <div className="space-y-0.5">
                {availablePartners.map(partner => {
                  // Find if there is an existing direct channel for this partner
                  const existingChan = channels.find(
                    c => c.type === 'direct' && 
                    c.memberIds.includes(connectedAgent.id) && 
                    c.memberIds.includes(partner.id)
                  );
                  const isSelected = selectedChannel && existingChan && selectedChannel.id === existingChan.id;
                  const unread = existingChan ? getUnreadCount(existingChan.id) : 0;

                  return (
                    <button
                      key={partner.id}
                      onClick={() => handleSelectPartner(partner.id)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                        <div className="relative flex-shrink-0">
                          <span className={`w-2.5 h-2.5 rounded-full ${partner.avatarColor || 'bg-slate-400'} block border border-white`} />
                          {agentActivities[partner.id]?.isOnline && (
                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full border border-white animate-pulse" />
                          )}
                        </div>
                        <span className="truncate">{partner.prenom} {partner.nom}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {unread > 0 && (
                          <span className="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                            {unread}
                          </span>
                        )}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                          isSelected 
                            ? 'bg-blue-500 text-white' 
                            : partner.role === 'admin' 
                              ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                              : 'bg-slate-100 text-slate-500'
                        }`}>
                          {partner.role === 'admin' ? 'Dir' : 'Agent'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* User Status Card */}
          <div className="p-3 border-t border-slate-100 bg-white flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full ${connectedAgent.avatarColor || 'bg-slate-600'} text-white flex items-center justify-center font-bold text-sm shadow-xs`}>
              {connectedAgent.prenom[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-700 truncate">{connectedAgent.prenom} {connectedAgent.nom}</p>
              <p className="text-[10px] text-slate-400 font-medium capitalize">{connectedAgent.role === 'admin' ? '👑 Directeur' : '💼 Conseiller'}</p>
            </div>
          </div>

        </div>

        {/* Right Side: Message Thread (col-span-8) */}
        <div className="lg:col-span-8 flex flex-col h-full bg-slate-50/20">
          {selectedChannel ? (
            <>
              {/* Message Header */}
              <div className="p-3 border-b border-slate-100 bg-white flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    {selectedChannel.type === 'group' ? (
                      <Users className="w-4 h-4 text-blue-600" />
                    ) : (
                      <User className="w-4 h-4 text-blue-600" />
                    )}
                    {getChannelDisplayName(selectedChannel)}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-md lg:max-w-xl">
                    {getSelectedChannelSub()}
                  </p>
                </div>

                {selectedChannel.id === 'channel-general' && (
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded">
                    Groupe Officiel
                  </span>
                )}
              </div>

              {/* Message Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/40">
                {channelMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <MessageSquare className="w-10 h-10 mb-2 text-slate-200 stroke-1" />
                    <p className="text-xs font-medium">Aucun message dans cette discussion.</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Envoyez le premier message ci-dessous !</p>
                  </div>
                ) : (
                  channelMessages.map((msg) => {
                    const isMe = msg.senderId === connectedAgent.id;
                    const dateObj = new Date(msg.createdAt);
                    const formattedTime = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div 
                        key={msg.id} 
                        className={`flex gap-2.5 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                      >
                        {/* Avatar */}
                        {!isMe && (
                          <div className={`w-7.5 h-7.5 rounded-full ${msg.senderAvatarColor || 'bg-slate-400'} text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs`}>
                            {msg.senderName[0]}
                          </div>
                        )}

                        <div>
                          {/* Sender name (for group chats only) */}
                          {!isMe && selectedChannel.type === 'group' && (
                            <span className="text-[10px] font-bold text-slate-500 block mb-0.5 ml-1">
                              {msg.senderName}
                            </span>
                          )}

                          {/* Message bubble */}
                          <div className={`px-3 py-2 rounded-xl text-xs font-medium leading-relaxed ${
                            isMe 
                              ? 'bg-blue-600 text-white rounded-tr-none shadow-sm' 
                              : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none shadow-xs'
                          }`}>
                            {msg.content}
                          </div>

                          {/* Date timestamp */}
                          <span className={`text-[9px] text-slate-400 block mt-1 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                            {formattedTime}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Form Area */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white flex gap-2">
                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Tapez votre message ici..."
                  className="flex-1 text-xs px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700 bg-slate-50 focus:bg-white transition-all font-medium"
                  required
                />
                <button
                  type="submit"
                  className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center justify-center cursor-pointer shadow-xs"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <MessageSquare className="w-12 h-12 mb-3 text-slate-200 stroke-1" />
              <p className="text-xs font-bold">Bienvenue sur la messagerie</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-sm text-center">
                Veuillez sélectionner un canal ou une discussion directe dans le menu latéral pour commencer à échanger.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* CREATE GROUP CHAT MODAL (Admin Only) */}
      {showCreateGroup && isAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full shadow-xl overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Créer un groupe d'échange
              </h3>
              <button 
                onClick={() => {
                  setShowCreateGroup(false);
                  setGroupName('');
                  setSelectedGroupMemberIds([]);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateGroupSubmit} className="p-4 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nom du Groupe <strong className="text-rose-500">*</strong></label>
                <input 
                  type="text" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="ex: Équipe Auto / VTC"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700 bg-white font-semibold"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sélectionner les conseillers <strong className="text-rose-500">*</strong></label>
                <p className="text-[10px] text-slate-400 mb-2">Seuls les membres sélectionnés auront accès à ce groupe.</p>
                
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-44 overflow-y-auto">
                  {agents
                    .filter(a => a.id !== connectedAgent.id) // Exclude admin since they are auto-included
                    .map(agent => {
                      const isChecked = selectedGroupMemberIds.includes(agent.id);
                      return (
                        <label 
                          key={agent.id} 
                          className="flex items-center gap-2.5 p-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => toggleGroupMember(agent.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className={`w-2.5 h-2.5 rounded-full ${agent.avatarColor || 'bg-slate-400'}`} />
                          <div className="text-xs">
                            <span className="font-bold text-slate-700">{agent.prenom} {agent.nom}</span>
                            <span className="text-[10px] text-slate-400 block font-medium">{agent.email}</span>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Warning/Rule label */}
              <div className="flex gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-[10px] text-amber-700 font-medium">
                <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>
                  Conformément aux règles de confidentialité, les conseillers d'assurance ajoutés au groupe pourront interagir ensemble uniquement au sein de ce groupe.
                </span>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateGroup(false);
                    setGroupName('');
                    setSelectedGroupMemberIds([]);
                  }}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!groupName.trim() || selectedGroupMemberIds.length === 0}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Créer le groupe
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
