'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const LIFESPAN_MS = 168 * 60 * 60 * 1000; // 168時間（7日間）

export default function RectaWall() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showInput, setShowInput] = useState<{file: File | null} | null>(null);
  const [inputText, setInputText] = useState('');
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  // 1. DATA FETCHING (With Debug Logs & Error Handling)
  const fetchData = useCallback(async () => {
    console.log("🛰 Fetching nodes...");
    const { data, error } = await supabase
      .from('mainline')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("❌ Supabase Error:", error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log("⚠️ No data found in 'mainline' table.");
      setNodes([]);
      return;
    }

    const now = new Date().getTime();
    // 寿命フィルター (created_atが不正な場合でも表示されるようにガード)
    const activeNodes = data.filter(n => {
      if (!n.created_at) return true; 
      const createdAt = new Date(n.created_at).getTime();
      if (isNaN(createdAt)) return true;
      return (now - createdAt) < LIFESPAN_MS;
    });

    console.log("✅ Nodes Loaded:", activeNodes.length);
    setNodes(activeNodes);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 2. UPLOAD LOGIC
  const handleUpload = async () => {
    if (!showInput && !inputText.trim()) return;
    setIsUploading(true);
    let publicUrl = null;

    try {
      if (showInput?.file) {
        const file = showInput.file;
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
        
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('images').getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }

      const { error: dbError } = await supabase.from('mainline').insert([{
        image_url: publicUrl,
        description: inputText.trim() || null,
        owner_id: 'guest'
      }]);

      if (dbError) throw dbError;

      setShowInput(null);
      setInputText('');
      fetchData();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  // 3. COMPONENTS
  const Tile = ({ node }: { node: any }) => {
    const hasImage = node.image_url && node.image_url !== "";
    return (
      <div 
        onClick={() => setSelectedNode(node)}
        className="relative mb-1 break-inside-avoid group cursor-pointer overflow-hidden rounded-sm transition-all duration-500 hover:z-10 hover:shadow-2xl active:scale-[0.98] bg-[#EDE9D9] border border-black/5"
      >
        {hasImage ? (
          <img 
            src={node.image_url} 
            alt="" 
            className="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="w-full p-6 flex items-center justify-center min-h-[120px] hover:bg-[#F5F2E9] transition-colors">
            <p className="text-[13px] leading-relaxed italic text-black/60 group-hover:text-black text-center whitespace-pre-wrap">
              {node.description}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif selection:bg-black selection:text-white">
      <style jsx global>{`
        .stone-wall { column-count: 2; column-gap: 0.25rem; }
        @media (min-width: 768px) { .stone-wall { column-count: 3; } }
        @media (min-width: 1024px) { .stone-wall { column-count: 4; } }
        @media (min-width: 1536px) { .stone-wall { column-count: 6; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* HEADER */}
      <header className="py-10 flex flex-col items-center sticky top-0 z-[50] pointer-events-none">
        <h1 className="text-[10px] tracking-[1.2em] font-black uppercase opacity-20 bg-[#EBE8DB]/60 backdrop-blur-md px-8 py-3 rounded-full border border-black/5">Rubbish</h1>
      </header>

      {/* MAIN WALL */}
      <main className="px-1 max-w-[140rem] mx-auto pb-40">
        <div className="stone-wall">
          {nodes.map((node) => (
            <Tile key={node.id} node={node} />
          ))}
        </div>
      </main>

      {/* FULL VIEW MODAL */}
      {selectedNode && (
        <div 
          className="fixed inset-0 z-[1000] bg-[#EBE8DB]/98 backdrop-blur-3xl flex flex-col items-center overflow-y-auto no-scrollbar animate-in fade-in duration-300"
          onClick={() => setSelectedNode(null)}
        >
          <button className="fixed top-8 right-8 text-3xl opacity-20 hover:opacity-100 z-[1100]">✕</button>
          
          <div className="w-full max-w-5xl px-6 pt-24 pb-48 flex flex-col items-center" onClick={e => e.stopPropagation()}>
            {selectedNode.image_url && (
              <div className="w-full shadow-2xl mb-10 rounded-sm overflow-hidden bg-black/5">
                <img src={selectedNode.image_url} className="w-full h-auto max-h-[85vh] object-contain" alt="" />
              </div>
            )}
            {selectedNode.description && (
              <div className={`w-full max-w-2xl text-center ${selectedNode.image_url ? 'mt-4' : 'mt-20'}`}>
                <p className={`${selectedNode.image_url ? 'text-lg leading-relaxed' : 'text-4xl leading-tight'} italic text-black/80 whitespace-pre-wrap`}>
                  {selectedNode.description}
                </p>
              </div>
            )}
            <div className="mt-20 text-[8px] font-bold opacity-10 tracking-[0.5em] uppercase">
              Fragment {selectedNode.id?.toString().slice(-6)}
            </div>
          </div>
        </div>
      )}

      {/* FOOTER NAV */}
      <nav className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[500]">
        <button 
          onClick={() => setShowInput({ file: null })}
          className="bg-[#F5F2E9]/80 backdrop-blur-xl px-14 py-6 rounded-full shadow-2xl border border-white/20 text-3xl opacity-40 hover:opacity-100 hover:scale-105 active:scale-95 transition-all duration-500"
        >
          ◎
        </button>
      </nav>

      {/* POST MODAL */}
      {showInput && (
        <div className="fixed inset-0 bg-[#EBE8DB]/99 backdrop-blur-3xl z-[2000] flex flex-col items-center justify-center p-8 animate-in zoom-in-95 duration-300">
          <textarea 
            autoFocus 
            value={inputText} 
            onChange={(e) => setInputText(e.target.value)} 
            placeholder="Write a fragment..." 
            className="w-full max-w-2xl bg-transparent border-none text-3xl italic outline-none text-center text-black/70 h-64 resize-none no-scrollbar" 
          />
          
          <div className="mt-20 flex items-center space-x-20">
            <button onClick={() => { setShowInput(null); setInputText(''); }} className="text-[10px] uppercase tracking-[0.3em] opacity-30 hover:opacity-100 transition-opacity">Discard</button>
            
            <label className="text-3xl opacity-30 hover:opacity-100 transition-opacity cursor-pointer relative">
              {showInput.file ? '📸' : '◎'}
              <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setShowInput({ file: f });
              }} />
            </label>

            <button onClick={handleUpload} className="text-[10px] uppercase tracking-[0.3em] font-black border-b-2 border-black/10 pb-1">Archive</button>
          </div>
        </div>
      )}

      {/* LOADING OVERLAY */}
      {isUploading && (
        <div className="fixed inset-0 bg-[#EBE8DB]/80 backdrop-blur-md z-[3000] flex items-center justify-center text-[10px] tracking-[1em] font-black uppercase italic animate-pulse">Archiving</div>
      )}
    </div>
  );
}