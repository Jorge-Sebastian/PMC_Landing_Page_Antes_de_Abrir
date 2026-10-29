import { Capacitor, registerPlugin } from '@capacitor/core';
import type { MessageFinding } from '@/lib/link-analysis/message-analysis';
import type { Decision, ExtraChecks } from '@/lib/link-analysis/notification-decision';
import type { DestinationCheck, Verdict } from '@/lib/link-analysis/types';

export const isAndroidPilot = Capacitor.getPlatform() === 'android';
export type Detail = { id: number; pending: boolean; test: boolean; url: string; verdict?: Verdict; destination?: DestinationCheck | null; messageSignals?: MessageFinding[]; privacy?: { sensitive: boolean; reason?: string }; decision?: Decision; extra?: ExtraChecks };
export type ProtectionStatus = { enabled: boolean; access: boolean; notifications: boolean; showAll: boolean; processed: number; lastAt: number; apps: Record<string, boolean>; historyEnabled: boolean; history: Array<{ color: string; domain: string; date: number }>; feedbackCount: number; externalReady: boolean; rulesVersion: string };
export const Protection = registerPlugin<{
  status(): Promise<ProtectionStatus>;
  activate(): Promise<void>;
  pause(): Promise<void>;
  alertSettings(): Promise<void>;
  setApp(options: { app: string; value: boolean }): Promise<void>;
  setHistory(options: { value: boolean }): Promise<void>;
  clearHistory(): Promise<void>;
  reportResult(options: { id: number; expected: string }): Promise<void>;
  exportFeedback(): Promise<void>;
  setShowAll(options: { value: boolean }): Promise<void>;
  testBanner(options: { level: string }): Promise<void>;
  openedAnalysis(): Promise<{ detail: Detail | null }>;
  recheckAnalysis(options: { id: number }): Promise<void>;
  closeAnalysis(): Promise<void>;
  copyDomain(options: { domain: string }): Promise<void>;
}>('Protection');
