import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
} from 'lucide-react';

import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import { useToast } from '@/context/ToastContext';

const INSTALL_SNIPPET = 'npm install @jamesbond007db05/events-sdk';

const QUICK_START_SNIPPET = "import { initTracker } from '@jamesbond007db05/events-sdk';\n\nconst tracker = initTracker({\n  apiKey: 'your_api_key_here',\n  autoPage: true,\n  debug: false\n});\n\nawait tracker.track('signup_started', {\n  plan: 'pro',\n  source: 'landing-page'\n});";

const ERROR_HANDLING_SNIPPET = "import {\n  initTracker,\n  normalizeSdkError,\n  SDKValidationError\n} from '@jamesbond007db05/events-sdk';\n\ntry {\n  const tracker = initTracker({ apiKey: 'your_api_key_here' });\n  await tracker.track('checkout_completed', { amount: 199 });\n} catch (error) {\n  const normalized = normalizeSdkError(error);\n  console.error(normalized.code, normalized.message);\n\n  if (error instanceof SDKValidationError) {\n    // show friendly validation feedback\n  }\n}";

const IDENTITY_SNIPPET = "// Attach to every event from now on (persisted across reloads)\nEngagement.register({ app_version: '3.2.0', plan: 'free' });\nEngagement.registerOnce({ first_referrer: document.referrer });\n\n// Anonymous visitor: events are keyed by the device id\nawait Engagement.track('pricing_viewed', { tier: 'team' });\n\n// After sign-in: later events are keyed by the user id\nawait Engagement.identify('user_42', { name: 'Ada', plan: 'pro' });\nconsole.log(Engagement.getDistinctId()); // 'user_42'\n\n// Send queued events now (e.g. before navigating away)\nawait Engagement.flush();\n\n// On logout: forget the user, clear super properties, new device id\nEngagement.reset();";

const FUNCTION_REFERENCE: Array<[string, string]> = [
  ['init(config)', 'Starts the runtime with your SDK key (sdk_… live or sdk_test_… sandbox).'],
  ['track(eventName, properties?)', 'Records an event. Super properties are merged in; call-site properties win.'],
  ['identify(userId, traits?)', 'Associates this device with a user and merges traits into their profile.'],
  ['register(properties)', 'Sets super properties attached to every later event.'],
  ['registerOnce(properties)', 'Sets super properties only where no value exists yet.'],
  ['unregister(name)', 'Removes one super property.'],
  ['getSuperProperties()', 'Returns the current super properties.'],
  ['getDistinctId()', 'The id events are attributed to: the user id, or the device id when anonymous.'],
  ['flush()', 'Sends queued events immediately instead of waiting for the batch interval.'],
  ['reset()', 'Call on logout: clears the user and super properties and starts a new device id and session.'],
  ['refresh()', 'Re-evaluates which guides, surveys and checklists should show.'],
  ['debug(enabled)', 'Logs every request and decision to the console.'],
];

const ENGAGEMENT_SNIPPET = "import { Engagement } from '@jamesbond007db05/events-sdk';\n\n// Initialize the Engagement Runtime\nEngagement.init({\n  apiKey: 'sdk_...', // or your sandbox key: sdk_test_...\n  userId: 'user_123',\n  debug: false\n});\n\n// Trigger a custom event (evaluated immediately for checklist/tour triggers)\nawait Engagement.track('user_onboarded_step1');\n\n// Fetch/refresh eligible flows manually (usually handled automatically on SPA routes)\nawait Engagement.refresh();";

function SdkDocsPanel(): JSX.Element {
  const { showToast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string): Promise<void> => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast({ variant: 'success', message: 'Code copied.' });
    window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1600);
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Documentation"
        description="Install the Events SDK, initialize it once, and start sending events, guides and surveys."
        actions={
          <a
            className="btn btn-secondary"
            href="https://www.npmjs.com/package/@jamesbond007db05/events-sdk"
            rel="noreferrer"
            target="_blank"
          >
            View on npm
            <ExternalLink size={14} />
          </a>
        }
      />

      <SectionCard className="grid gap-6" id="getting-started">
        <div>
          <p className="section-label mb-2 text-brand-700">Getting started</p>
          <h2 className="m-0 text-xl font-semibold tracking-tight text-olive-950">Install, initialize, ship events</h2>
        </div>
        <div className="w-full flex flex-col">
          <div className="space-y-4">
            <div className="rounded-xl border border-olive-200 p-4">
              <h3 className="m-0 text-[15px] font-semibold text-olive-950">1. Install package</h3>
              <p className="mb-0 mt-2 text-sm leading-6 text-olive-600 pb-3">
                Use npm in your frontend app. SDK ships browser-focused tracking APIs.
              </p>
              <CodePanel copiedId={copiedId} id="install" onCopy={handleCopy} title="Installation">
                {INSTALL_SNIPPET}
              </CodePanel>
            </div>
            <div className="rounded-xl border border-olive-200 p-4">
              <h3 className="m-0 text-[15px] font-semibold text-olive-950">2. Create API key</h3>
              <p className="mb-0 mt-2 text-sm leading-6 text-olive-600">
                Open Event Tracking in app, provision a node, copy secret key once, then store it in your app config.
              </p>
            </div>
            <div className="rounded-xl border border-olive-200 p-4">
              <h3 className="m-0 text-[15px] font-semibold text-olive-950">3. Initialize once</h3>
              <p className="mb-0 mt-2 text-sm leading-6 text-olive-600">
                Call initTracker() or Engagement.init() once at app bootstrap.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="grid gap-6" id="quick-start">
        <div className="grid gap-2">
          <h2 className="m-0 text-lg font-semibold tracking-tight text-olive-950">Quick Start</h2>
          <p className="m-0 text-sm leading-6 text-olive-600">
            Copy-paste setup for most browser apps.
          </p>
        </div>
        <CodePanel copiedId={copiedId} id="quick-start-code" onCopy={handleCopy} title="Quick Start Example">
          {QUICK_START_SNIPPET}
        </CodePanel>
      </SectionCard>

      <SectionCard className="grid gap-6" id="engagement-runtime">
        <div className="grid gap-2">
          <h2 className="m-0 text-lg font-semibold tracking-tight text-olive-950">In-App Engagement Engine</h2>
          <p className="m-0 text-sm leading-6 text-olive-600">
            Automatically deliver Modals, Banners, NPS Surveys, Checklist onboarding widgets and Tours directly to targeted users.
          </p>
        </div>
        <CodePanel copiedId={copiedId} id="engagement-code" onCopy={handleCopy} title="Engagement Runtime Example">
          {ENGAGEMENT_SNIPPET}
        </CodePanel>
      </SectionCard>

      <SectionCard className="grid gap-6" id="identity">
        <div className="grid gap-2">
          <h2 className="m-0 text-lg font-semibold tracking-tight text-olive-950">Identity, super properties &amp; ingestion rules</h2>
          <p className="m-0 text-sm leading-6 text-olive-600">
            Every event carries a <code className="font-mono text-[13px]">deviceId</code> (anonymous, per browser) and a{' '}
            <code className="font-mono text-[13px]">distinctId</code> — the user id once you call <code className="font-mono text-[13px]">identify()</code>,
            otherwise the device id. Super properties are attached to every event that follows.
          </p>
        </div>
        <CodePanel copiedId={copiedId} id="identity-code" onCopy={handleCopy} title="Identity & super properties">
          {IDENTITY_SNIPPET}
        </CodePanel>
        <ul className="m-0 pl-5 grid gap-1.5 text-sm leading-6 text-olive-600 list-disc">
          <li><strong className="font-medium text-olive-900">/track</strong> and <strong className="font-medium text-olive-900">/batch</strong> accept events up to 5 days old and at most 1 hour in the future.</li>
          <li>Send older history to <code className="font-mono text-[13px]">POST /api/import</code> (same body as /batch; every event needs an <code className="font-mono text-[13px]">eventId</code> and a <code className="font-mono text-[13px]">timestamp</code>).</li>
          <li>Events are de-duplicated by <code className="font-mono text-[13px]">eventId</code> (also accepted as <code className="font-mono text-[13px]">insertId</code> or <code className="font-mono text-[13px]">$insert_id</code>), so retries are safe.</li>
          <li>Browser, OS, URL, referrer, screen, library version and processing time are added automatically as default properties.</li>
        </ul>
      </SectionCard>

      <SectionCard className="grid gap-5" id="functions">
        <div className="grid gap-2">
          <h2 className="m-0 text-lg font-semibold tracking-tight text-olive-950">Function reference</h2>
          <p className="m-0 text-sm leading-6 text-olive-600">Available on both <code className="font-mono text-[13px]">Engagement</code> and the tracker returned by <code className="font-mono text-[13px]">initTracker()</code>.</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-olive-200">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-olive-50 border-b border-olive-200 text-xs text-olive-500">
                <th className="text-left font-medium px-4 h-10">Function</th>
                <th className="text-left font-medium px-4 h-10">What it does</th>
              </tr>
            </thead>
            <tbody>
              {FUNCTION_REFERENCE.map(([signature, description]) => (
                <tr key={signature} className="border-b border-olive-100 last:border-0 align-top">
                  <td className="px-4 py-3 font-mono text-[13px] text-olive-900 whitespace-nowrap">{signature}</td>
                  <td className="px-4 py-3 text-olive-600">{description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard className="grid gap-6" id="examples">
        <div className="grid gap-2">
          <h2 className="m-0 text-lg font-semibold tracking-tight text-olive-950">Real-World Examples</h2>
          <p className="m-0 text-sm leading-6 text-olive-600">
            Practical patterns you can drop into app code.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <CodePanel copiedId={copiedId} id="example-onboarding" onCopy={handleCopy} title="Onboarding Flow">
            {"const tracker = initTracker({\n  apiKey: 'live_1234567890abcdef',\n  autoPage: true\n});\n\nawait tracker.identify('user_42', {\n  role: 'owner',\n  workspace: 'northstar'\n});\n\nawait tracker.track('workspace_created', {\n  template: 'product-ops'\n});\n\nawait tracker.flush();"}
          </CodePanel>
          <CodePanel copiedId={copiedId} id="example-auth" onCopy={handleCopy} title="Anonymous to Authenticated">
            {"const tracker = initTracker({ apiKey: 'live_1234567890abcdef' });\n\nawait tracker.track('pricing_viewed', {\n  source: 'landing'\n});\n\nawait tracker.alias('anon_browser_id', 'user_42');\nawait tracker.identify('user_42', {\n  email: 'ada@example.com'\n});\n\nawait tracker.trackWithUser('user_42', 'checkout_completed', {\n  amount: 199,\n  currency: 'USD'\n});"}
          </CodePanel>
        </div>
      </SectionCard>

      <SectionCard className="grid gap-6" id="errors">
        <div className="grid gap-2">
          <h2 className="m-0 text-lg font-semibold tracking-tight text-olive-950">Common Errors and Solutions</h2>
          <p className="m-0 text-sm leading-6 text-olive-600">
            Use normalized errors in UI and logs.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <CodePanel copiedId={copiedId} id="error-snippet" onCopy={handleCopy} title="Error Handling">
            {ERROR_HANDLING_SNIPPET}
          </CodePanel>
          <div className="grid gap-3">
            {[
              ['API_KEY_REQUIRED', 'Pass non-empty apiKey to initTracker().'],
              ['API_KEY_INVALID', 'Use real node key from Event Tracking page.'],
              ['PAYLOAD_INVALID', 'Send plain object to validatePayload().'],
              ['Event payload too large', 'Reduce nested payload size or split event shape.'],
              ['Tracker not initialized', 'Call initTracker() before getTracker().'],
            ].map(([code, fix]) => (
              <div
                className="rounded-xl border border-olive-200 p-4"
                key={code}
              >
                <strong className="font-mono text-sm text-olive-950 ">{code}</strong>
                <p className="mb-0 mt-2 text-sm leading-6 text-olive-600">{fix}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function CodePanel({
  title,
  children,
  id,
  copiedId,
  onCopy
}: {
  title: string;
  children: string;
  id: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => Promise<void>;
}): JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border border-olive-200">
      <div className="flex items-center justify-between gap-3 border-b border-olive-200 bg-olive-50 px-4 h-10">
        <strong className="text-[13px] font-medium text-olive-800">{title}</strong>
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-olive-200 bg-white px-3 py-1.5 text-xs font-semibold text-olive-600 transition-colors hover:bg-olive-50    "
          onClick={() => void onCopy(children, id)}
          type="button"
        >
          {copiedId === id ? <Check size={13} /> : <Copy size={13} />}
          {copiedId === id ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto bg-olive-950 p-4 font-mono text-[13px] leading-6 text-olive-100">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export default SdkDocsPanel;