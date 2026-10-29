import { explainSignal } from '../lib/link-analysis/explain-signal';
import { analyzeStatic, finalizeVerdict } from '../lib/link-analysis/build-verdict';
import { analyzeMessage, type MessageFinding } from '../lib/link-analysis/message-analysis';
import { inspectUrlPrivacy } from '../lib/link-analysis/url-privacy';
import { decideNotification, type ExtraChecks } from '../lib/link-analysis/notification-decision';
import type { DestinationCheck } from '../lib/link-analysis/types';

/** Shared local entry. Raw message text is consumed here and never returned. */
export const analyze = (url: string, destination?: DestinationCheck, message = '', extra: ExtraChecks = {}, previousFindings?: MessageFinding[]) => {
  const verdict = finalizeVerdict(analyzeStatic(url), destination ?? { checked: false });
  const messageSignals = previousFindings ?? analyzeMessage(message, url);
  const privacy = inspectUrlPrivacy(url);
  return {
    url, verdict: { ...verdict, signals: verdict.signals.map(s => explainSignal(s, url, destination)) },
    destination: destination ?? null, messageSignals, privacy, extra,
    decision: decideNotification(verdict, destination, messageSignals, privacy, extra),
  };
};
