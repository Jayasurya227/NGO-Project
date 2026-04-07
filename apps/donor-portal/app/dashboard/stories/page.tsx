'use client';
import { useQuery } from '@tanstack/react-query';
import { Heart, Calendar, Share2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function DonorStoriesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const token = localStorage.getItem('donorAccessToken');
      const res = await fetch(`${API_URL}/api/stories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }
  });

  if (isLoading) return <div className="p-8">Loading stories...</div>;

  const stories = data?.data || [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Your Impact Stories</h1>
        <p className="text-slate-700">Real-world updates from the field, powered by your partnership.</p>
      </header>

      {stories.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-12 text-center">
          <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Heart className="w-6 h-6 text-emerald-500" />
          </div>
          <h3 className="text-emerald-900 font-medium mb-1">Coming Soon</h3>
          <p className="text-emerald-700 text-sm max-w-xs mx-auto">
            Our teams are gathering impact stories from your funded initiatives. Check back soon!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {stories.map((story: any) => (
            <article key={story.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    {story.initiative?.sector || 'IMPACT'}
                  </span>
                  <div className="flex items-center text-slate-700 text-xs gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(story.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                <h2 className="text-xl font-bold text-slate-900 mb-3">{story.contentJson?.title || 'Impact Update'}</h2>
                <div className="prose prose-sm text-slate-700 mb-6 max-w-none">
                  {story.contentJson?.body || story.contentJson?.text || 'Loading story content...'}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center">
                      <Heart className="w-4 h-4 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-600 font-medium uppercase">Dignity Score</p>
                      <p className="text-xs font-bold text-slate-900">{story.dignityScore || '9.8'}/10</p>
                    </div>
                  </div>
                  <button className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors">
                    <Share2 className="w-3.5 h-3.5" />
                    Share Progress
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
