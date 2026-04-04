import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useManage } from '../hooks/useManage';
import { Script } from '../types';
import { Plus, FileText, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader     from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ConfirmModal   from '../components/ui/ConfirmModal';
import ScriptModal, { ScriptForm } from '../components/manage/ScriptModal';
import ScriptList     from '../components/manage/ScriptList';
import CategoryManager from '../components/manage/CategoryManager';

export default function ManagePage() {
  const [modalScript, setModalScript]     = useState<Script | null | 'new'>(null);
  const [confirmDelete, setConfirmDelete] = useState<Script | null>(null);
  const [activeTab, setActiveTab]         = useState<'scripts' | 'categories'>('scripts');
  const { user }                          = useAuth();
  const navigate                          = useNavigate();

  const { scripts, categories, loading, saveScript, deleteScript, addCategory, deleteCategory } = useManage();

  useEffect(() => {
    if (user && user.role === 'agent') {
      toast.error('Sin permisos para esta sección');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSave = async (form: ScriptForm, id?: string) => {
    await saveScript(form, id);
    setModalScript(null);
  };

  const handleDelete = async (script: Script) => {
    await deleteScript(script);
    setConfirmDelete(null);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {modalScript !== null && (
        <ScriptModal
          script={modalScript === 'new' ? null : modalScript}
          categories={categories}
          onSave={handleSave}
          onClose={() => setModalScript(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          message={`Desactivará "${confirmDelete.title}" permanentemente.`}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <PageHeader
        title="Panel de Gestión"
        subtitle={`${user?.name} · ${user?.role}`}
        backTo="/dashboard"
        actions={
          <button
            onClick={() => setModalScript('new')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Nuevo script
          </button>
        }
      />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit mb-6">
          {([['scripts', 'Scripts', FileText], ['categories', 'Categorías', Tag]] as const).map(([tab, label, Icon]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {loading ? <LoadingSpinner /> : activeTab === 'scripts' ? (
          <ScriptList
            scripts={scripts}
            onEdit={setModalScript}
            onDelete={setConfirmDelete}
            onCreate={() => setModalScript('new')}
          />
        ) : (
          <CategoryManager
            categories={categories}
            scripts={scripts}
            onAdd={addCategory}
            onDelete={deleteCategory}
          />
        )}
      </main>
    </div>
  );
}
