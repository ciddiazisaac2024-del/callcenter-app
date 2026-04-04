import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { scriptsService } from '../services/api';
import { Script, Variable } from '../types';
import toast from 'react-hot-toast';
import { ArrowLeft, Copy, Check, Star, StarOff, Zap, Eye, Edit3 } from 'lucide-react';

const extractVariables = (content: string): string[] => {
  const matches = content.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
};

const applyVariables = (content: string, values: Record<string, string>): string => {
  let result = content;
  Object.entries(values).forEach(([key, val]) => {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val || `{{${key}}}`);
  });
  return result;
};

function VariableField({ varKey, value, onChange, meta }: {
  varKey: string; value: string; onChange: (v: string) => void; meta?: Variable;
}) {
  const label  = meta?.label || varKey.replace(/_/g, ' ');
  const filled = value.trim().length > 0;
  const base   = "w-full bg-slate-800/60 border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none transition-all";
  const cls    = `${base} ${filled ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-slate-700 focus:border-blue-500'}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold tracking-widest uppercase text-slate-500">{label}</label>
        {filled && <span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" />OK</span>}
      </div>
      {meta?.type === 'select' && meta.options ? (
        <select value={value} onChange={e => onChange(e.target.value)} className={`${cls} appearance-none cursor-pointer`}>
          <option value="">Seleccionar...</option>
          {meta.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <input
          type={meta?.type === 'number' ? 'number' : 'text'}
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={meta?.placeholder || `Ingresa ${label.toLowerCase()}...`}
          className={cls}
        />
      )}
    </div>
  );
}

function ScriptPreview({ content }: { content: string }) {
  return (
    <div className="font-mono text-sm leading-7 space-y-1">
      {content.split('\n').filter(l => l !== undefined).map((line, i) => {
        if (line.startsWith('---')) return <div key={i} className="border-t border-slate-700/50 my-3" />;
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-bold text-slate-200 text-base">{line.replace(/\*\*/g, '')}</p>;
        }
        const parts = line.split(/(\{\{[\w]+\}\})/g);
        return (
          <p key={i} className="text-slate-300">
            {parts.map((part, pi) =>
              /^\{\{[\w]+\}\}$/.test(part)
                ? <span key={pi} className="bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded px-1 mx-0.5 text-xs">{part}</span>
                : <span key={pi}>{part}</span>
            )}
          </p>
        );
      })}
    </div>
  );
}

export default function ScriptDetailPage() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const [script, setScript]       = useState<Script | null>(null);
  const [loading, setLoading]     = useState(true);
  const [values, setValues]       = useState<Record<string, string>>({});
  const [copied, setCopied]       = useState(false);
  const [isFavorite, setFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'final'>('preview');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res    = await scriptsService.getById(id);
        const data: Script = res.data.data;
        setScript(data);
        const detected = extractVariables(data.base_content);
        const init: Record<string, string> = {};
        detected.forEach(v => { init[v] = ''; });
        setValues(init);
        const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
        setFavorite(favs.includes(id));
      } catch {
        toast.error('No se pudo cargar el script');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const detectedVars    = script ? extractVariables(script.base_content) : [];
  const filledCount     = detectedVars.filter(v => values[v]?.trim()).length;
  const progress        = detectedVars.length > 0 ? (filledCount / detectedVars.length) * 100 : 100;
  const isReady         = progress === 100;
  const generatedContent = script ? applyVariables(script.base_content, values) : '';

  const handleCopy = useCallback(async () => {
    if (!isReady) { toast.error(`Faltan ${detectedVars.length - filledCount} variable(s)`); return; }
    await navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    toast.success('¡Copiado! Listo para pegar en el CRM');
    const hist = JSON.parse(localStorage.getItem('usage_history') || '[]');
    hist.unshift({ id, title: script?.title, usedAt: new Date().toISOString() });
    localStorage.setItem('usage_history', JSON.stringify(hist.slice(0, 50)));
    setTimeout(() => setCopied(false), 2500);
  }, [generatedContent, isReady, detectedVars.length, filledCount, id, script?.title]);

  const toggleFavorite = () => {
    const favs    = JSON.parse(localStorage.getItem('favorites') || '[]');
    const updated = isFavorite ? favs.filter((f: string) => f !== id) : [...favs, id];
    localStorage.setItem('favorites', JSON.stringify(updated));
    setFavorite(!isFavorite);
    toast(isFavorite ? 'Removido de favoritos' : 'Agregado a favoritos', { icon: isFavorite ? '💔' : '⭐' });
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-400">Cargando script...</p>
      </div>
    </div>
  );

  if (!script) return null;

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${script.category_color}20`, color: script.category_color }}>
                  {script.category_name}
                </span>
              </div>
              <h1 className="text-white font-bold text-lg leading-tight">{script.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleFavorite} className={`p-2 rounded-lg transition-colors ${isFavorite ? 'text-amber-400 bg-amber-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>
              {isFavorite ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
            </button>
            <button
              onClick={handleCopy} disabled={!isReady}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${isReady ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? '¡Copiado!' : 'Copiar al CRM'}
            </button>
          </div>
        </div>

        {detectedVars.length > 0 && (
          <div className="max-w-7xl mx-auto px-6 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: isReady ? '#10b981' : '#3b82f6' }} />
              </div>
              <span className="text-xs text-slate-500 whitespace-nowrap">
                {filledCount}/{detectedVars.length} variables
                {isReady && <span className="text-emerald-400 ml-1">✓ Listo</span>}
              </span>
            </div>
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-5 gap-6">

          {/* Variables */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-400" />
                  <h2 className="text-white font-semibold text-sm">Variables</h2>
                </div>
                {detectedVars.length > 0 && <span className="text-xs text-slate-500">{detectedVars.length} campos</span>}
              </div>
              <div className="p-5 space-y-4">
                {detectedVars.length === 0 ? (
                  <div className="text-center py-6">
                    <Zap className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Sin variables. Copia directamente.</p>
                  </div>
                ) : detectedVars.map(varKey => (
                  <VariableField
                    key={varKey} varKey={varKey} value={values[varKey] || ''}
                    onChange={val => setValues(prev => ({ ...prev, [varKey]: val }))}
                    meta={script.variables?.find((m: Variable) => m.key === varKey)}
                  />
                ))}
              </div>
              {detectedVars.length > 0 && (
                <div className="px-5 pb-5">
                  <button onClick={() => setValues(Object.fromEntries(detectedVars.map(v => [v, ''])))} className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors py-2">
                    Limpiar todo
                  </button>
                </div>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-slate-500 mb-3">Info del script</h3>
              <p className="text-slate-300 text-sm mb-3">{script.description}</p>
              {script.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {script.tags.map(tag => (
                    <span key={tag} className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-md">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden sticky top-28">
              <div className="flex border-b border-slate-800">
                {([['preview', 'Vista previa', Eye], ['final', 'Script final', Zap]] as const).map(([tab, label, Icon]) => (
                  <button
                    key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab ? 'text-white border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                  >
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
                <div className="ml-auto flex items-center px-4">
                  {isReady && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Listo para CRM
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6 max-h-[calc(100vh-280px)] overflow-y-auto">
                {activeTab === 'preview' ? (
                  <div>
                    <p className="text-xs text-slate-600 mb-4">Variables en <span className="text-amber-400">amarillo</span> aún faltan completar</p>
                    <ScriptPreview content={generatedContent} />
                  </div>
                ) : (
                  <div>
                    {!isReady ? (
                      <div className="text-center py-8">
                        <Edit3 className="w-10 h-10 text-amber-400 mx-auto mb-3 opacity-50" />
                        <p className="text-slate-400 text-sm">Completa {detectedVars.length - filledCount} variable(s) para ver el script final</p>
                      </div>
                    ) : (
                      <div className="bg-slate-950/60 border border-slate-700/50 rounded-xl p-5">
                        <pre className="whitespace-pre-wrap font-mono text-sm text-slate-200 leading-7">{generatedContent}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 px-6 py-4 flex items-center justify-between">
                <span className="text-xs text-slate-600">{generatedContent.length} caracteres</span>
                <button
                  onClick={handleCopy} disabled={!isReady}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${isReady ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? '¡Copiado!' : 'Copiar al CRM'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
