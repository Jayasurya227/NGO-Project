'use client';

import { useQuery } from '@tanstack/react-query';
import { Search, Filter, MapPin, Target, Wallet, ArrowUpRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

const SDG_MAP: Record<string, string> = {
  'NO_POVERTY': 'SDG 1: No Poverty',
  'ZERO_HUNGER': 'SDG 2: Zero Hunger',
  'GOOD_HEALTH': 'SDG 3: Good Health',
  'QUALITY_EDUCATION': 'SDG 4: Quality Education',
  'GENDER_EQUALITY': 'SDG 5: Gender Equality',
  'CLEAN_WATER': 'SDG 6: Clean Water',
  'REDUCED_INEQUALITY': 'SDG 10: Reduced Inequality',
  'SDG4': 'SDG 4: Quality Education',
  'SDG1': 'SDG 1: No Poverty',
  'SDG2': 'SDG 2: Zero Hunger',
  'SDG3': 'SDG 3: Good Health',
  'SDG5': 'SDG 5: Gender Equality',
  'SDG6': 'SDG 6: Clean Water',
  'SDG10': 'SDG 10: Reduced Inequality'
};

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

export default function DonorInitiativesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('ALL');

  const { data: initiativesData, isLoading } = useQuery({
    queryKey: ['donor-initiatives'],
    queryFn: async () => {
      const token = localStorage.getItem('donorAccessToken');
      const res = await fetch('http://localhost:4000/api/initiatives', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const initiatives = initiativesData?.data || [];

  const filteredInitiatives = initiatives.filter((init: any) => {
    const matchesSearch = init.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        init.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector = sectorFilter === 'ALL' || init.sector === sectorFilter;
    return matchesSearch && matchesSector;
  });

  const sectors = ["ALL", "EDUCATION", "HEALTHCARE", "LIVELIHOOD", "ENVIRONMENT", "WATER_SANITATION"];

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Explore Initiatives</h1>
        <p className="text-slate-500">Discover handpicked NGO projects ready for your CSR contribution.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search projects, SDGs, or locations..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {sectors.map(sector => (
            <button 
              key={sector}
              onClick={() => setSectorFilter(sector)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                sectorFilter === sector 
                ? 'bg-slate-900 text-white border-slate-900' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {sector}
            </button>
          ))}
        </div>
      </div>

      {filteredInitiatives.length === 0 ? (
        <div className="bg-white border rounded-2xl p-20 text-center">
          <p className="text-slate-400 font-medium">No initiatives found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {filteredInitiatives.map((init: any) => {
            const progress = (init.budgetFunded / init.budgetRequired) * 100 || 0;
            return (
              <div key={init.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col">
                <div className="aspect-video bg-slate-100 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold rounded uppercase">
                        {SECTOR_MAP[init.sector] || init.sector}
                      </span>
                      <span className="text-white/40 text-xs">•</span>
                      <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                        {init.tenant?.name || "Verified NGO"}
                      </span>
                    </div>
                    <h3 className="text-white font-bold text-lg line-clamp-1">{init.title}</h3>
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <p className="text-slate-500 text-xs line-clamp-2 mb-4">
                    {init.description || "Building sustainable impact through community-led development and resource optimization."}
                  </p>

                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">

                    <MapPin className="w-3 h-3" />
                    {init.geography.state}{init.geography.district ? `, ${init.geography.district}` : ''}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-500 font-bold uppercase tracking-wider">Funding Goal</span>
                        <span className="text-slate-900 font-bold">₹{init.budgetRequired.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                          style={{ width: `${Math.min(100, progress)}%` }}
                        ></div>
                      </div>
                      <p className="text-[10px] text-right mt-1 text-emerald-600 font-bold">
                        {Math.round(progress)}% Funded
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {init.sdgTags?.map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-bold border border-slate-100 rounded">
                          {SDG_MAP[tag] || `#${tag}`}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Target className="w-3 h-3 text-emerald-600" />
                       <span className="text-xs font-bold text-slate-900">{init.targetBeneficiaries.toLocaleString()} Lives</span>
                    </div>
                    <Link 
                      href={`/dashboard/initiatives/${init.id}`}
                      className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold group-hover:gap-2 transition-all"
                    >
                      View Details
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
