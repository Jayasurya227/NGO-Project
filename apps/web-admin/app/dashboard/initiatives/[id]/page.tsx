'use client';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { 
  ChevronLeft, 
  Plus, 
  Calendar, 
  Target, 
  IndianRupee, 
  AlertCircle,
  Trash2,
  CheckCircle,
  Settings,
  Clock,
  MoreVertical,
  Flag,
  Bookmark
} from 'lucide-react';

const SECTOR_MAP: Record<string, string> = {
  'EDUCATION': 'Education',
  'HEALTHCARE': 'Healthcare',
  'LIVELIHOOD': 'Livelihood',
  'INFRASTRUCTURE': 'Infrastructure',
  'ENVIRONMENT': 'Environment',
  'WATER_SANITATION': 'Water & Sanitation',
  'WOMEN_EMPOWERMENT': 'Women Empowerment',
  'CHILD_WELFARE': 'Child Welfare'
};

export default function InitiativeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAddMilestone, setShowAddMilestone] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['initiative', id],
    queryFn:  () => apiFetch<{ data: any }>(`/api/initiatives/${id}`),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => apiFetch(`/api/initiatives/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initiative', id] });
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      toast.success('Status updated');
    },

    onError: () => toast.error('Status update failed')
  });

  if (isLoading) return <div className="p-8 animate-pulse space-y-4">
    <div className="h-8 w-1/4 bg-slate-100 rounded" />
    <div className="h-32 bg-slate-50 rounded-xl" />
  </div>;

  const initiative = data?.data;
  if (!initiative) return <div className="p-8 text-red-500">Initiative not found</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Breadcrumb / Back Navigation */}
      <button 
        onClick={() => router.push('/dashboard/initiatives')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 transition-colors group"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back to Initiatives</span>
      </button>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {initiative.title}
            </h1>
            <StatusBadge status={initiative.status} />
          </div>
          <p className="text-slate-500 max-w-2xl leading-relaxed">
            {initiative.description}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={initiative.status}
            onChange={(e) => updateStatusMutation.mutate(e.target.value)}
            disabled={updateStatusMutation.isPending}
            className="bg-white border text-slate-700 border-slate-200 text-sm font-medium rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard 
          label="Budget Required" 
          value={`₹${initiative.budgetRequired?.toLocaleString()}`} 
          sub={`Funded: ₹${initiative.budgetFunded?.toLocaleString() ?? 0}`}
          icon={IndianRupee}
          color="blue"
        />
        <StatCard 
          label="Target Beneficiaries" 
          value={initiative.targetBeneficiaries?.toLocaleString()} 
          sub="Lives to be impacted"
          icon={Target}
          color="emerald"
        />
        <StatCard 
          label="Focus Area" 
          value={SECTOR_MAP[initiative.sector] || initiative.sector} 
          sub="Primary sector of intervention"
          icon={Flag}
          color="amber"
        />
        <StatCard 
          label="SDG Tags" 
          value={initiative.sdgTags?.join(', ')} 
          sub="Sustainable Development Goals"
          icon={Bookmark}
          color="purple"
        />
      </div>

      {/* Milestones Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h2 className="text-xl font-bold text-slate-900">Program Milestones</h2>
          <button 
            onClick={() => setShowAddMilestone(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Milestone
          </button>
        </div>

        {initiative.milestones?.length === 0 ? (
          <div className="py-16 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
            <Calendar className="w-12 h-12 mb-3 opacity-20" />
            <p className="font-medium">No milestones defined yet.</p>
            <p className="text-xs">Add milestones to track progress and release funding.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {initiative.milestones?.map((ml: any, idx: number) => (
              <MilestoneRow 
                key={ml.id} 
                milestone={ml} 
                index={idx + 1} 
                initiativeId={id}
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ['initiative', id] })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Milestone Modal Mockup */}
      {showAddMilestone && (
        <AddMilestoneModal 
          initiativeId={id} 
          onClose={() => setShowAddMilestone(false)} 
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['initiative', id] });
            setShowAddMilestone(false);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: any = {
    blue:    'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber:   'bg-amber-50 text-amber-600 border-amber-100',
    purple:  'bg-purple-50 text-purple-600 border-purple-100'
  };

  return (
    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
        {value}
      </p>
      <p className="text-xs text-slate-500 mt-2">
        {sub}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    DRAFT:      'bg-slate-100 text-slate-600 border-slate-200',
    ACTIVE:     'bg-emerald-100 text-emerald-700 border-emerald-200',
    COMPLETED:  'bg-blue-100 text-blue-700 border-blue-200',
    CLOSED:     'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${styles[status] ?? styles.DRAFT}`}>
      {status}
    </span>
  );
}

function MilestoneRow({ milestone, index, initiativeId, onRefresh }: { milestone: any; index: number; initiativeId: string; onRefresh: () => void }) {
  const [showOptions, setShowOptions] = useState(false);
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: (status: string) => apiFetch(`/api/initiatives/${initiativeId}/milestones/${milestone.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
    onSuccess: () => {
      onRefresh();
      setShowOptions(false);
      toast.success('Milestone updated');
    }
  });

  const deleteMilestone = useMutation({
    mutationFn: () => apiFetch(`/api/initiatives/${initiativeId}/milestones/${milestone.id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      onRefresh();
      toast.success('Milestone deleted');
    }
  });

  return (
    <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-center justify-between hover:border-blue-200 group transition-all relative">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
          {index}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
            {milestone.title}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Due: {new Date(milestone.dueDate).toLocaleDateString()}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
              <IndianRupee className="w-3 h-3" />
              ₹{milestone.budgetAllocated?.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider border ${
          milestone.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
          'bg-slate-50 text-slate-500 border-slate-100'
        }`}>
          {milestone.status}
        </span>
        <div className="relative">
          <button 
            onClick={() => setShowOptions(!showOptions)}
            className="text-slate-300 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showOptions && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowOptions(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {milestone.status !== 'COMPLETED' && (
                  <button 
                    onClick={() => updateStatus.mutate('COMPLETED')}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Mark Completed
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (window.confirm('Delete this milestone?')) {
                      deleteMilestone.mutate();
                    }
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Milestone
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AddMilestoneModal({ initiativeId, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    budgetAllocated: 0,
    sequenceOrder: 1
  });

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch(`/api/initiatives/${initiativeId}/milestones`, {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          dueDate: new Date(formData.dueDate).toISOString()
        })
      });
      if (res.success) {
        toast.success('Milestone added');
        onSuccess();
      } else {
        toast.error(res.error?.message ?? 'Failed to add milestone');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Add New Milestone</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 pb-1 text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-tighter mb-1">
              Milestone Title
            </label>
            <input 
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" 
              placeholder="e.g. Infrastructure Setup"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-tighter mb-1">
              Description
            </label>
            <textarea 
              required
              rows={3}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" 
              placeholder="Detailed objectives..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-tighter mb-1">
                Due Date
              </label>
              <input 
                required 
                type="date"
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-tighter mb-1">
                Budget Allocation
              </label>
              <input 
                required 
                type="number"
                value={formData.budgetAllocated}
                onChange={e => setFormData({ ...formData, budgetAllocated: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" 
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button 
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm transition-all shadow-md shadow-blue-200"
            >
              {loading ? 'Saving...' : 'Create Milestone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
