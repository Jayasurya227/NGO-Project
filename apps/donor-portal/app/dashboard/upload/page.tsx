'use client';
import { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

export default function UploadRFPPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setErrorMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setErrorMessage(null);
    
    try {
      const token = localStorage.getItem('donorAccessToken');
      const donorId = localStorage.getItem('donorId');
      const formData = new FormData();
      formData.append('file', file);
      if (donorId) {
        formData.append('donorId', donorId);
      }
      
      const res = await fetch('http://localhost:4000/api/requirements/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error?.message || 'Upload failed');
      }
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'An unexpected error occurred during upload.');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Upload RFP</h1>
        <p className="text-slate-500">Submit your Request for Proposal (RFP) document for AI-driven matching and deck generation.</p>
      </header>

      <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
        {status === 'success' ? (
          <div className="space-y-4">
            <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Upload Successful</h2>
            <p className="text-slate-500 text-sm">Our AI is now analyzing your RFP. You'll receive a notification once the match results are ready.</p>
            <button 
              onClick={() => { setFile(null); setStatus('idle'); }}
              className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-full text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Upload Another
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {status === 'error' ? <XCircle className="w-10 h-10 text-red-400" /> : <Upload className="w-10 h-10 text-slate-400" />}
            </div>
            {status === 'error' && errorMessage && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100 flex items-start gap-2 text-left mb-6">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>{errorMessage}</p>
              </div>
            )}
            
            {!file ? (
              <div>
                <label className="cursor-pointer">
                  <span className="bg-emerald-600 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-emerald-700 transition-colors">
                    Select RFP File
                  </span>
                  <input type="file" className="hidden" aria-label='file upload' onChange={handleFileChange} accept=".pdf,.docx,.doc" />
                </label>
                <p className="text-xs text-slate-400 mt-4">Supported formats: PDF, DOCX (Max 10MB)</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3 text-slate-700 font-medium">
                  <FileText className="w-5 h-5 text-emerald-500" />
                  {file.name}
                </div>
                <button 
                  onClick={handleUpload}
                  disabled={status === 'uploading'}
                  className="w-full max-w-xs bg-emerald-600 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {status === 'uploading' ? 'Analyzing...' : 'Submit for Analysis'}
                </button>
                <button 
                  onClick={() => setFile(null)}
                  className="block mx-auto text-xs text-slate-400 hover:text-slate-600"
                >
                  Remove file
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-10 grid grid-cols-2 gap-6">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-2">
            <AlertCircle className="w-4 h-4" />
            AI Guidelines
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">
            Ensure your RFP clearly states the budget range, target geography, and priority sectors for better matching results.
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
          <div className="flex items-center gap-2 text-blue-800 font-bold text-sm mb-2">
            <CheckCircle2 className="w-4 h-4" />
            Privacy Note
          </div>
          <p className="text-xs text-blue-700 leading-relaxed">
            Your documents are processed securely. Personally Identifiable Information (PII) is handled with strict confidentiality.
          </p>
        </div>
      </div>
    </div>
  );
}