/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Lead, QualificationStatus, NextAction, Agent } from '../types';
import { 
  Users, 
  TrendingUp, 
  ClipboardList, 
  Calendar, 
  Phone, 
  Mail, 
  FileCheck, 
  CheckCircle2, 
  ArrowUpRight, 
  Car, 
  ShieldCheck,
  Home,
  Check,
  Clock,
  Briefcase
} from 'lucide-react';
import { playChime } from '../utils/notifications';

interface DashboardViewProps {
  leads: Lead[];
  qualifications: QualificationStatus[];
  agents?: Agent[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLeadAction: (leadId: string, executed: boolean) => void;
  setCurrentTab: (tab: string) => void;
}

export default function DashboardView({ 
  leads, 
  qualifications, 
  agents = [],
  onSelectLead, 
  onUpdateLeadAction,
  setCurrentTab
}: DashboardViewProps) {
  
  // Calculate general statistics
  const totalLeads = leads.length;
  
  const typeCounts = React.useMemo(() => {
    return leads.reduce((acc, lead) => {
      acc[lead.type] = (acc[lead.type] || 0) + 1;
      return acc;
    }, { auto: 0, vtc: 0, habitation: 0 } as Record<string, number>);
  }, [leads]);

  const activeNegociationsCount = React.useMemo(() => {
    // en_cours, attente_doc, attente_paiement
    return leads.filter(l => ['en_cours', 'attente_doc', 'attente_paiement'].includes(l.qualificationId)).length;
  }, [leads]);

  const wonLeadsCount = React.useMemo(() => {
    return leads.filter(l => ['devis_accepted', 'devis_accepte', 'paiement_recu'].includes(l.qualificationId)).length;
  }, [leads]);

  const conversionRate = totalLeads > 0 ? Math.round((wonLeadsCount / totalLeads) * 100) : 0;

  // Reminders for today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayReminders = React.useMemo(() => {
    return leads.filter(l => l.nextAction && l.nextAction.date === todayStr);
  }, [leads, todayStr]);

  const pendingTodayCount = todayReminders.filter(r => r.nextAction && !r.nextAction.executed).length;

  // Group by qualifications for the charts
  const leadsByQualification = React.useMemo(() => {
    const counts: Record<string, number> = {};
    qualifications.forEach(q => { counts[q.id] = 0; });
    leads.forEach(l => {
      counts[l.qualificationId] = (counts[l.qualificationId] || 0) + 1;
    });
    return qualifications.map(q => ({
      ...q,
      count: counts[q.id] || 0
    }));
  }, [leads, qualifications]);

  // Lead trend over the past 14 days
  const dailyTrend = React.useMemo(() => {
    const trend: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trend[dateStr] = 0;
    }
    
    leads.forEach(l => {
      const createdDate = l.createdAt.split('T')[0];
      if (trend[createdDate] !== undefined) {
        trend[createdDate]++;
      }
    });

    return Object.entries(trend).map(([date, count]) => {
      const parts = date.split('-');
      return {
        label: `${parts[2]}/${parts[1]}`,
        count
      };
    });
  }, [leads]);

  const handleActionToggle = (lead: Lead) => {
    if (lead.nextAction) {
      const currentStatus = lead.nextAction.executed;
      if (!currentStatus) {
        playChime();
      }
      onUpdateLeadAction(lead.id, !currentStatus);
    }
  };

  // Helper to color statuses properly using their settings config
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

  // SVG Chart rendering computations
  const maxStatusCount = Math.max(...leadsByQualification.map(q => q.count), 1);
  const maxTrendCount = Math.max(...dailyTrend.map(t => t.count), 1);

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Page Title Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Tableau de bord</h2>
          <p className="text-sm text-slate-500">Suivi en temps réel de votre portefeuille d'assurances courtage.</p>
        </div>
        <div className="flex items-center gap-2.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-mono">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Mise à jour : {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
        </div>
      </div>

      {/* Grid statistics metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Leads */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Prospects</span>
            <div className="p-2 rounded bg-blue-50 text-blue-600 border border-blue-200">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 font-mono">{totalLeads}</h3>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-mono">
              <span className="flex items-center gap-0.5"><Car className="w-3 h-3 text-emerald-500" /> Auto: {typeCounts.auto}</span>
              <span className="flex items-center gap-0.5"><Briefcase className="w-3 h-3 text-blue-500" /> VTC: {typeCounts.vtc}</span>
              <span className="flex items-center gap-0.5"><Home className="w-3 h-3 text-amber-500" /> Hab: {typeCounts.habitation}</span>
            </div>
          </div>
        </div>

        {/* Négociations en Cours */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Négociations Actives</span>
            <div className="p-2 rounded bg-amber-50 text-amber-600 border border-amber-200">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 font-mono">{activeNegociationsCount}</h3>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>En cours, attente doc / paiement</span>
            </p>
          </div>
        </div>

        {/* Taux de Conversion */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Taux de Conversion</span>
            <div className="p-2 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 font-mono">{conversionRate}%</h3>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${conversionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Rappels du Jour */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rappels du Jour</span>
            <div className={`p-2 rounded ${pendingTodayCount > 0 ? 'bg-rose-50 text-rose-600 animate-pulse border border-rose-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 font-mono">{pendingTodayCount}</h3>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-slate-400" />
              <span>{todayReminders.length - pendingTodayCount} traité(s)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Charts & Reminders Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SVG Charts Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>Analyses & Statistiques</span>
            </h3>
            <span className="text-xs text-indigo-600 font-medium">Répartition globale</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lead Types Donut Chart */}
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
              <h4 className="text-xs font-semibold text-slate-600 mb-3">Produits d'Assurance</h4>
              
              <div className="flex items-center justify-center py-2 gap-4">
                {/* SVG Donut Chart */}
                <div className="relative w-28 h-28 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                    {totalLeads > 0 && (() => {
                      const autoPct = (typeCounts.auto / totalLeads) * 100;
                      const vtcPct = (typeCounts.vtc / totalLeads) * 100;
                      const habPct = (typeCounts.habitation / totalLeads) * 100;
                      
                      return (
                        <>
                          {/* Auto Segment - Emerald */}
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3" 
                            strokeDasharray={`${autoPct} ${100 - autoPct}`} 
                            strokeDashoffset="0"
                          />
                          {/* VTC Segment - Blue */}
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#2563eb" strokeWidth="3" 
                            strokeDasharray={`${vtcPct} ${100 - vtcPct}`} 
                            strokeDashoffset={-autoPct}
                          />
                          {/* Habitation Segment - Amber */}
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3" 
                            strokeDasharray={`${habPct} ${100 - habPct}`} 
                            strokeDashoffset={-(autoPct + vtcPct)}
                          />
                        </>
                      );
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-slate-900 font-mono">{totalLeads}</span>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Leads</span>
                  </div>
                </div>

                {/* Donut Legend */}
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <div>
                      <div className="text-slate-800 font-medium">Auto Part.</div>
                      <div className="text-[10px] text-slate-400">{typeCounts.auto} ({totalLeads > 0 ? Math.round((typeCounts.auto/totalLeads)*100) : 0}%)</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <div>
                      <div className="text-slate-800 font-medium">VTC</div>
                      <div className="text-[10px] text-slate-400">{typeCounts.vtc} ({totalLeads > 0 ? Math.round((typeCounts.vtc/totalLeads)*100) : 0}%)</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <div>
                      <div className="text-slate-800 font-medium">Habitation</div>
                      <div className="text-[10px] text-slate-400">{typeCounts.habitation} ({totalLeads > 0 ? Math.round((typeCounts.habitation/totalLeads)*100) : 0}%)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom SVG Column Chart: Statuses */}
            <div className="border border-slate-100 rounded p-3 bg-slate-50/50 flex flex-col justify-between">
              <h4 className="text-xs font-semibold text-slate-600 mb-2">Cycle de qualification</h4>
              
              <div className="h-32 flex items-end justify-between pt-4 px-2">
                {leadsByQualification.map(q => {
                  const heightPct = maxStatusCount > 0 ? (q.count / maxStatusCount) * 80 : 0;
                  
                  // Map custom colors to standard colors
                  let barColor = 'bg-slate-400';
                  if (q.color === 'orange') barColor = 'bg-orange-500';
                  else if (q.color === 'amber') barColor = 'bg-amber-500';
                  else if (q.color === 'emerald') barColor = 'bg-emerald-500';
                  else if (q.color === 'teal') barColor = 'bg-teal-500';
                  else if (q.color === 'rose') barColor = 'bg-rose-500';
                  else if (q.color === 'sky') barColor = 'bg-sky-500';
                  else if (q.color === 'indigo') barColor = 'bg-blue-600';

                  return (
                    <div key={q.id} className="flex flex-col items-center flex-1 group relative">
                      {/* Tooltip on Hover */}
                      <div className="absolute bottom-full mb-1 bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 font-mono">
                        {q.label} : {q.count}
                      </div>

                      {/* Column block */}
                      <div className="w-4 rounded-t bg-slate-200 w-full mx-0.5 max-w-[20px] transition-all duration-300 flex items-end">
                        <div 
                          className={`w-full rounded-t ${barColor} transition-all duration-500`}
                          style={{ height: `${Math.max(heightPct, 6)}%` }} // minimum height so it is clickable
                        />
                      </div>
                      
                      {/* Count text */}
                      <span className="text-[10px] font-bold mt-1 text-slate-800 font-mono">{q.count}</span>
                      {/* Tiny visual label dot */}
                      <div className={`w-1.5 h-1.5 rounded-full ${barColor} mt-1`} title={q.label} />
                    </div>
                  );
                })}
              </div>
              
              <div className="text-[9px] text-slate-400 text-center mt-2 font-mono italic">
                Survolez les colonnes pour voir les étapes de négociation.
              </div>
            </div>
          </div>

          {/* SVG Trend Line Chart */}
          <div className="border border-slate-100 rounded p-3 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-600">Flux de nouveaux leads (14 derniers jours)</h4>
              <span className="text-[10px] font-mono text-blue-600 font-semibold flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> Croissance continue
              </span>
            </div>

            <div className="h-28 relative pt-4">
              {/* Build an SVG Polyline trend graph */}
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                {(() => {
                  const padding = 10;
                  const points = dailyTrend.map((t, index) => {
                    const xPct = (index / (dailyTrend.length - 1)) * 100;
                    const yPct = 100 - (t.count / maxTrendCount) * 80 - padding;
                    return { x: `${xPct}%`, y: `${yPct}%`, count: t.count, label: t.label };
                  });

                  // Join them to build standard polyline points
                  const pointsString = points.map(p => `${parseFloat(p.x) * 4} , ${parseFloat(p.y) * 0.8}`).join(' ');

                  return (
                    <>
                      {/* Grid Horizontal Guidelines */}
                      <line x1="0" y1="10%" x2="100%" y2="10%" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="0" y1="90%" x2="100%" y2="90%" stroke="#e2e8f0" strokeWidth="1.5" />

                      {/* Interactive Areas and dots */}
                      {points.map((p, i) => (
                        <g key={i}>
                          {/* Vertical lines connecting dot to bottom */}
                          <line x1={p.x} y1={p.y} x2={p.x} y2="90%" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2 2" className="opacity-40" />
                          
                          {/* Main line segments (drawn implicitly by using precise absolute coordinates in SVG overlay) */}
                          {i < points.length - 1 && (
                            <line 
                              x1={p.x} 
                              y1={p.y} 
                              x2={points[i+1].x} 
                              y2={points[i+1].y} 
                              stroke="#2563eb" 
                              strokeWidth="2" 
                              strokeLinecap="round"
                            />
                          )}

                          {/* Data point dot circles */}
                          <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r="4" 
                            fill="#ffffff" 
                            stroke="#2563eb" 
                            strokeWidth="2.5" 
                            className="cursor-pointer hover:r-5 transition-all"
                            title={`${p.label} : ${p.count} prospect(s)`}
                          />

                          {/* Invisible larger hover trigger */}
                          <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r="12" 
                            fill="transparent" 
                            className="cursor-pointer group"
                          >
                            <title>{`${p.label} : ${p.count} lead(s)`}</title>
                          </circle>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>

              {/* Labels on X Axis */}
              <div className="flex justify-between text-[8px] font-mono text-slate-400 mt-2">
                {dailyTrend.map((t, index) => {
                  // Only display alternate labels to avoid crowding
                  const show = index % 2 === 0 || index === dailyTrend.length - 1;
                  return (
                    <span key={index} className={show ? 'visible' : 'invisible'}>
                      {t.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Reminders / Actions Panel */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-500" />
                <span>Rappels & Actions</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full font-bold">
                Aujourd'hui
              </span>
            </div>

            {/* List of Today's callbacks */}
            <div className="mt-4 space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {todayReminders.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2.5" />
                  <p className="text-xs font-medium">Aucune action requise aujourd'hui !</p>
                  <p className="text-[10px] text-slate-400 mt-1">Vos fiches sont parfaitement à jour.</p>
                </div>
              ) : (
                todayReminders.map(lead => {
                  const act = lead.nextAction!;
                  let actLabel = '';
                  let actionColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                  
                  switch (act.type) {
                    case 'appel':
                      actLabel = 'Appel';
                      actionColor = 'bg-blue-50 text-blue-700 border-blue-200';
                      break;
                    case 'envoi_mail':
                      actLabel = 'E-mail';
                      actionColor = 'bg-amber-50 text-amber-700 border-amber-200';
                      break;
                    case 'envoi_devis':
                      actLabel = 'Envoi Devis';
                      actionColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      break;
                    case 'relance_devis':
                      actLabel = 'Relancer Devis';
                      actionColor = 'bg-rose-50 text-rose-700 border-rose-200';
                      break;
                  }

                  return (
                    <div 
                      key={lead.id} 
                      className={`p-3 rounded-xl border transition-all hover:border-slate-300 flex flex-col gap-2 ${
                        act.executed ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {/* Time & Action Tag */}
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${actionColor}`}>
                            {actLabel}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 font-mono flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {act.time}
                          </span>
                        </div>

                        {/* Complete Checklist Checkbox */}
                        <button 
                          onClick={() => handleActionToggle(lead)}
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                            act.executed 
                              ? 'bg-emerald-500 border-emerald-500 text-white' 
                              : 'bg-white border-slate-300 text-slate-300 hover:border-indigo-500'
                          }`}
                          title={act.executed ? "Marquer comme à faire" : "Marquer comme traité"}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3px]" />
                        </button>
                      </div>

                      {/* Lead details */}
                      <div>
                        <button 
                          onClick={() => onSelectLead(lead)}
                          className="text-xs font-semibold text-slate-800 hover:text-blue-600 text-left hover:underline"
                        >
                          {lead.driver.prenom} {lead.driver.nom}
                        </button>
                        <p className="text-[11px] text-slate-500 italic mt-0.5 font-mono leading-relaxed line-clamp-2">
                          "{act.details || 'Aucune consigne spécifique'}"
                        </p>
                      </div>

                      {/* Communication Quick Links (Active call, mail etc) */}
                      {!act.executed && (
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-50 mt-1">
                          <a 
                            href={`tel:${lead.driver.tel}`}
                            className="flex-1 py-1 px-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1.5"
                          >
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>Appeler</span>
                          </a>
                          <a 
                            href={`mailto:${lead.driver.email}`}
                            className="flex-1 py-1 px-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1.5"
                          >
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>Écrire</span>
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Prompt to add more actions */}
          <div className="pt-2.5 border-t border-slate-100 mt-2 text-center">
            <button 
              onClick={() => setCurrentTab('leads')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
            >
              Gérer et replanifier des prospects →
            </button>
          </div>
        </div>

      </div>

      {/* Recent Leads Panel */}
      <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Prospects Récents</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Dernières fiches ajoutées dans votre CRM.</p>
          </div>
          <button 
            onClick={() => setCurrentTab('leads')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 group"
          >
            <span>Voir toute la liste</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-400 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Date de Création</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4">Conseiller</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {leads.slice(0, 5).map(lead => (
                <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    {lead.driver.prenom} {lead.driver.nom}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="flex items-center gap-1.5 font-medium">
                      {lead.type === 'auto' && <span className="text-emerald-500 flex items-center gap-1"><Car className="w-3.5 h-3.5" /> Auto Part.</span>}
                      {lead.type === 'vtc' && <span className="text-blue-600 flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> VTC</span>}
                      {lead.type === 'habitation' && <span className="text-amber-500 flex items-center gap-1"><Home className="w-3.5 h-3.5" /> Habitation</span>}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[11px]">
                    <div>{lead.driver.tel}</div>
                    <div className="text-slate-400 text-[10px]">{lead.driver.email}</div>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-400">
                    {new Date(lead.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getQualBadgeColor(lead.qualificationId)}`}>
                      {getQualText(lead.qualificationId)}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    {(() => {
                      const agent = agents.find(a => a.id === lead.assignedAgentId);
                      if (agent) {
                        return (
                          <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            👤 {agent.prenom}
                          </span>
                        );
                      }
                      return <span className="text-[11px] text-slate-400 italic font-medium">Libre</span>;
                    })()}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button 
                      onClick={() => onSelectLead(lead)}
                      className="px-3 py-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-blue-600 rounded text-[11px] font-medium transition-colors"
                    >
                      Ouvrir la fiche
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
