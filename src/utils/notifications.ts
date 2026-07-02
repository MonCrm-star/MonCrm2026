/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Lead } from '../types';

// Synthesize a high-quality double-chime using the Web Audio API
export const playChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    // Tone 1 (E5, clean sine wave)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);
    
    // Tone 2 (A5, slightly higher, delayed)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.5);
  } catch (error) {
    console.warn('Web Audio API is not supported or was blocked by browser autoplay policy:', error);
  }
};

// Request permission for Web Notifications
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notification');
    return false;
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (e) {
    return false;
  }
};

// Show a native notification (with fallbacks if in an iframe or permission denied)
export const triggerNativeNotification = (title: string, body: string, onClick?: () => void) => {
  playChime();
  
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico', // standard icon fallback
        tag: 'crm-assurance-reminders',
        requireInteraction: true
      });
      
      if (onClick) {
        notification.onclick = () => {
          window.focus();
          onClick();
          notification.close();
        };
      }
    } catch (error) {
      // In some sandboxed situations (like iframes), Notification construction might fail
      console.warn('Native notification failed to spawn (possibly in sandbox):', error);
    }
  }
};

// Checks if an action is scheduled for "now" or is overdue (within 10 mins)
export const checkPendingReminders = (leads: Lead[], lastCheckedTime: number): { lead: Lead; msg: string }[] => {
  const now = new Date();
  const currentDateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const triggered: { lead: Lead; msg: string }[] = [];
  
  leads.forEach(lead => {
    if (!lead.nextAction || lead.nextAction.executed) return;
    
    // Compare dates
    if (lead.nextAction.date === currentDateStr) {
      const [hrs, mins] = lead.nextAction.time.split(':').map(Number);
      const actionMinutes = hrs * 60 + mins;
      
      // If the scheduled time is right now or past, and hasn't been trigger-checked in this session
      // We look at a narrow window to prevent spamming old alerts
      const timeDiff = currentMinutes - actionMinutes;
      if (timeDiff >= 0 && timeDiff <= 3) {
        let textAction = '';
        switch (lead.nextAction.type) {
          case 'appel': textAction = 'Appel téléphonique'; break;
          case 'envoi_mail': textAction = 'Envoi d\'un email'; break;
          case 'envoi_devis': textAction = 'Envoi du devis'; break;
          case 'relance_devis': textAction = 'Relance du devis'; break;
        }
        
        triggered.push({
          lead,
          msg: `Rappel Action : ${textAction} pour ${lead.driver.prenom} ${lead.driver.nom} (Tél: ${lead.driver.tel}). Détail : ${lead.nextAction.details || 'Aucun'}`
        });
      }
    }
  });
  
  return triggered;
};
