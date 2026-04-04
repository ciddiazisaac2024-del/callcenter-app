import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useScripts } from '../hooks/useScripts';
import QuickSearch   from '../components/QuickSearch';
import RecentActivity from '../components/dashboard/RecentActivity';
import ScriptCard    from '../components/dashboard/ScriptCard';
import toast         from 'react-hot-toast';
import {
  Search, LogOut, Phone, FileText, Tag,
  User, Star, Command, Settings, BarChart2
} from 'lucide-react';

export default function DashboardPage() {
  const [search, setSearch]                     = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showSearch, setShowSearch]             = useState(false);
  const [favorites, setFavorites]               = useState<string[]>([]);
  const { user, logout }                        = useAuth();
  const navigate                                = useNavigate();
  const { scripts, categories, loading }        = useScripts(search, selectedCategory);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowSearch(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    setFavorites(JSON.parse(localStorage.getItem('favorites') || '[]'));
  }, []);

  const isSupervisorOrAdmin = user?.role === 'admin' || user?.role === 'supervisor';
  const favoriteScripts     = scripts.filter(s => favorites.includes(s.id));
  const regularScripts      = scripts.filter(s => !favorites.includes(s.id));

  return (
    <div className="min-h-screen bg-slate-950">
      {showSearch && <QuickSearch onClose={() => setShowSearch(false)} />}

      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-600/20">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-white font-bold text-lg leading-tight">CallScript AI</h1>
              <p className="text-slate-500 text-xs">Scripts para call center</p>
            </div>
          </div>

          <button onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl px-3 py-2 text-sm transition-colors flex-1 max-w-sm border border-slate-700/50">
            <Search className="w-4 h-4 shrink-0" />
            <span className="text-slate-500 hidden sm:inline">Buscar script...</span>
            <span className="text-slate-500 sm:hidden">Buscar...</span>
            <kbd className="ml-auto text-xs bg-slate-700 px-1.5 py-0.5 rounded hidden sm:flex items-center gap-0.5 text-slate-500 border border-slate-600">
              <Command className="w-3 h-3" />K
            </kbd>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden md:flex items-center gap-2 bg-slate-800 border border-slate-700/50 rounded-xl px-3 py-2">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300 text-sm">{user?.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${
                user?.role === 'admin'      ? 'bg-purple-600/20 text-purple-400' :
                user?.role === 'supervisor' ? 'bg-blue-600/20 text-blue-400' :
                                              'bg-slate-700 text-slate-400'}`}>
                {user?.role}
              </span>
            </div>
            {isSupervisorOrAdmin && (
              <>
                <button onClick={() => navigate('/metrics')} title="Métricas"
                  className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors">
                  <BarChart2 className="w-4 h-4" />
                </button>
                <button onClick={() => navigate('/manage')} title="Gestión"
                  className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={() => { logout(); navigate('/login'); }} title="Cerrar sesión"
              className="text-slate-400 hover:text-red-400 p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Scripts', value: scripts.length, icon: FileText, color: 'text-blue-400' },
            { label: 'Categorías', value: categories.length, icon: Tag, color: 'text-purple-400' },
            { label: 'Favoritos', value: favorites.length, icon: Star, color: 'text-amber-400' },
            { label: 'Mi rol', value: user?.role || '-', icon: User, color: 'text-slate-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-slate-500 text-xs">{label}</span>
              </div>
              <p className="text-white font-bold text-xl capitalize">{value}</p>
            </div>
          ))}
        </div>

        <RecentActivity />

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" placeholder="Buscar por título o descripción..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors text-sm" />
          </div>
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors sm:w-52 text-sm">
            <option value="">Todas las categorías</option>
            {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : (
          <>
            {/* Favoritos destacados */}
            {!search && !selectedCategory && favoriteScripts.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-amber-400 fill-current" />
                  <h2 className="text-slate-300 text-sm font-semibold">Mis favoritos</h2>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {favoriteScripts.map(s => (
                    <ScriptCard key={s.id} script={s} isFavorite onClick={() => navigate(`/scripts/${s.id}`)} />
                  ))}
                </div>
                {regularScripts.length > 0 && (
                  <div className="flex items-center gap-3 mt-6 mb-3">
                    <div className="flex-1 h-px bg-slate-800" />
                    <span className="text-slate-600 text-xs">Todos los scripts</span>
                    <div className="flex-1 h-px bg-slate-800" />
                  </div>
                )}
              </div>
            )}

            {/* Grid principal */}
            {regularScripts.length === 0 && favoriteScripts.length === 0 ? (
              <div className="text-center py-20">
                <FileText className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400">No se encontraron scripts</p>
                {isSupervisorOrAdmin && (
                  <button onClick={() => navigate('/manage')} className="mt-4 text-blue-400 hover:text-blue-300 text-sm underline">
                    Crear el primero →
                  </button>
                )}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(search || selectedCategory ? [...favoriteScripts, ...regularScripts] : regularScripts).map(s => (
                  <ScriptCard key={s.id} script={s} isFavorite={favorites.includes(s.id)} onClick={() => navigate(`/scripts/${s.id}`)} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
