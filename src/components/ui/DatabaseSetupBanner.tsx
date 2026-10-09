import React, { useEffect, useState } from 'react';
import { Database, AlertTriangle, RefreshCw, Terminal, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface DbHealthState {
  checked: boolean;
  connected: boolean;
  database?: string;
  host?: string;
  error?: string;
  instructions?: string[];
}

export const DatabaseSetupBanner: React.FC = () => {
  const [status, setStatus] = useState<DbHealthState>({ checked: false, connected: true });
  const [expanded, setExpanded] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const checkDb = async () => {
    setRetrying(true);
    try {
      const res = await fetch('/api/health/db');
      const data = await res.json();
      setStatus({
        checked: true,
        connected: Boolean(data.connected),
        database: data.database,
        host: data.host,
        error: data.error,
        instructions: data.instructions,
      });
    } catch {
      // Backend server not reachable or still booting
      setStatus({ checked: true, connected: true });
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => {
    checkDb();
  }, []);

  if (!status.checked || status.connected) return null;

  return (
    <div className="bg-amber-950/90 border-b border-amber-700/70 text-amber-100 px-4 py-3 relative z-40">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-amber-200">
                  MySQL Database Connection Required ({status.database || 'u199400152_linkgenerator'})
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/80 border border-amber-700 text-amber-300">
                  Host: {status.host || 'unconfigured'}
                </span>
              </div>
              <p className="text-xs text-amber-300/90 mt-0.5">
                {status.error || 'Cannot reach MySQL server.'} LinkPulse never falls back to fake data or localStorage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={checkDb}
              disabled={retrying}
              className="px-3 py-1.5 rounded-lg bg-amber-800/70 hover:bg-amber-800 text-xs font-medium text-amber-100 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
              Retry Connection
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg hover:bg-amber-900/60 text-amber-300"
              aria-label="Toggle setup instructions"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-amber-800/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-black/40 rounded-xl p-3.5 border border-amber-800/40">
              <div className="font-semibold text-amber-200 flex items-center gap-1.5 mb-2">
                <Database className="w-4 h-4 text-amber-400" />
                <span>How to Connect Your MySQL Database (.env)</span>
              </div>
              <ol className="space-y-1 text-amber-100/90 list-decimal list-inside">
                <li>Open <code className="text-amber-300">.env</code> in the project root.</li>
                <li>Set <code className="text-amber-300">DB_HOST</code> to your Hostinger MySQL host (or <code className="text-amber-300">127.0.0.1</code> for local MySQL).</li>
                <li>Confirm <code className="text-amber-300">DB_NAME=u199400152_linkgenerator</code> and <code className="text-amber-300">DB_USER=u199400152_linkgenerator</code>.</li>
                <li>Enter your database password in <code className="text-amber-300">DB_PASSWORD=</code>.</li>
                <li>In Hostinger hPanel → Databases → Remote MySQL, whitelist your IP if connecting remotely.</li>
              </ol>
            </div>
            <div className="bg-black/40 rounded-xl p-3.5 border border-amber-800/40 flex flex-col justify-between">
              <div>
                <div className="font-semibold text-amber-200 flex items-center gap-1.5 mb-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span>Initialize Tables & Admin Account</span>
                </div>
                <pre className="bg-black/60 p-2.5 rounded-lg text-emerald-300 font-mono text-[11px] overflow-x-auto">
{`npm run db:migrate
npm run db:seed-admin`}
                </pre>
              </div>
              <p className="text-[11px] text-amber-200/80 flex items-center gap-1.5 mt-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>You can also import <code className="text-amber-100">server/db/migrations/001_initial_schema.sql</code> directly in phpMyAdmin.</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseSetupBanner;
