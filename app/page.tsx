'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const LIFESPAN_MS = 168 * 60 * 60 * 1000; 

export default function Page() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showInput, setShowInput] = useState<{file: File | null} | null>(null);
  const [inputText, setInputText] = useState('');
  const [networkView, setNetworkView] = useState<{originNode: any, linkedNodes: any[]} | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase.from('mainline').select('*').order('created_at', { ascending: false });
    if (error) return;
    const now = new Date().getTime();
    const active = data.filter(n => (now - new Date(n.created_at).getTime()) < LIFESPAN_MS);
    setNodes(active);
  }, []);

  const openNetwork = async (nodeId: string) => {
    const origin = nodes.find(n => n.id === nodeId);
    if (!origin) return;
    const { data: links } = await supabase.from('links').select('*').or(`node_a.eq.${nodeId},node_b.eq.${nodeId}`);
    const linkedIds = links ? links.map(l => l.node_a === nodeId ? l.node_b : l.node_a) : [];
    const linkedNodes = nodes.filter(n => linkedIds.includes(n.id));
    setNetworkView({ originNode: origin, linkedNodes });
  };

  const handleUpload = async () => {
    if (!showInput) return;
    const { file } = showInput;
    setIsUploading(true);
    let publicUrl = null;

    try {
      if (file) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
        const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
        if (!uploadError) {
          const { data } = supabase.storage.from('images').getPublicUrl(fileName);
          publicUrl = data.publicUrl;
        }
      }

      await supabase.from('mainline').insert([{
        id: `${Date.now()}`,
        image_url: publicUrl,
        description: inputText.trim() || null,
        owner_id: 'user'
      }]);

      setShowInput(null);
      setInputText('');
      fetchData();
    } catch (e) { console.error(e); } finally { setIsUploading(false); }
  };

  const Tile = ({ node, onClick }: any) => {
    const isImage = !!node.image_url;
    return (
      <div 
        onClick={() => onClick(node.id)}
        className="relative mb-2 break-inside-avoid group cursor-pointer overflow-hidden rounded-sm transition-all duration-500 hover:shadow-2xl active:scale-95 bg-[#EDE9D9]"
      >
        {isImage ? (
          <div className="w-full h-auto overflow-hidden">
            <img 
              src={node.image_url} 
              className="w-full h-auto object-contain grayscale group-hover:grayscale-0 opacity-90 group-hover:opacity-100 transition-all duration-700 ease-out" 
              alt=""
              loading="lazy"
            />
            {node.description && (
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-[9px] italic line-clamp-2 leading-tight">{node.description}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full p-8 flex items-center justify-center min-h-[120px]">
            <p className="text-[13px] leading-relaxed italic text-black/60 group-hover:text-black transition-colors text-center whitespace-pre-wrap">
              {node.description}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-[#2D2D2D] font-serif p-2">
      <style jsx global>{`
        .stone-wall {
          column-count: 2;
          column-gap: 0.5rem;
        }
        @media (min-width: 768px) { .stone-wall { column-count: 3; } }
        @media (min-width: 1024px) { .stone-wall { column-count: 4; } }
        @media (min-width: 1536px) { .stone-wall { column-count: 5; } }
      `}</style>

      <header className="py-8 flex flex-col items-center sticky top-0 z-[100]">
        <h1 className="text-[9px] tracking-[1em] font-black uppercase opacity-20 bg-[#EBE8DB]/60 backdrop-blur-md px-6 py-2 rounded-full border border-black/5">Rubbish Fragments</h1>
      </header>

      <div className="stone-wall max-w-[110rem] mx-auto pb-40">
        {nodes.map(node => (
          <Tile key={node.id} node={node} onClick={openNetwork} />
        ))}
      </div>

      {/* View Overlay */}
      {networkView && (
        <div className="fixed inset-0 z-[1000] bg-[#EBE8DB]/95 backdrop-blur-3xl overflow-y-auto p-4 animate-in fade-in duration-500">
           <button onClick={() => setNetworkView(null)} className="fixed top-8 right-8 text-2xl opacity-20 hover:opacity-100 z-[1100]">✕</button>
           <div className="flex flex-col items-center pt-24 pb-48 max-w-6xl mx-auto">
              <p className="text-[9px] tracking-[0.5em] opacity-30 uppercase font-bold mb-16">Connected Fragment</p>
              <div className="w-full max-w-lg mb-12 shadow-2xl">
                <Tile node={networkView.originNode} onClick={()=>{}} />
              </div>
              <div className="stone-wall w-full">
                {networkView.linkedNodes.map(ln => (
                  <Tile key={ln.id} node={ln} onClick={openNetwork} />
                ))}
              </div>
           </div>
        </div>
      )}

      {/* UI Navigation */}
      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center bg-[#F5F2E9]/60 backdrop-blur-xl px-8 py-4 rounded-full shadow-2xl border border-white/20 space-x-12 z-[500] hover:bg-[#F5F2E9] transition-all duration-500">
         <button onClick={() => setShowInput({file: null})} className="text-xl opacity-30 hover:opacity-100 transition-opacity">✎</button>
         <div className="h-4 w-px bg-black/10"></div>
         <label className="text-xl opacity-30 hover:opacity-100 transition-opacity cursor-pointer">◎<input type="file" className="hidden" accept="image/*" onChange={(e) => {
           const f = e.target.files?.[0];
           if (f) setShowInput({file: f});
         }} /></label>
      </nav>

      {/* Input */}
      {showInput && (
        <div className="fixed inset-0 bg-[#EBE8DB]/98 backdrop-blur-3xl z-[2000] flex flex-col items-center justify-center p-6 animate-in zoom-in-95 duration-300">
          {showInput.file && <p className="mb-4 text-[10px] opacity-40 uppercase tracking-widest">Image Loaded</p>}
          <textarea autoFocus value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Fragment..." className="w-full max-w-lg bg-transparent border-none text-2xl italic outline-none text-center text-black/80" />
          <div className="mt-16 flex space-x-16">
            <button onClick={() => { setShowInput(null); setInputText(''); }} className="text-[10px] uppercase tracking-widest opacity-20 hover:opacity-100">Cancel</button>
            <button onClick={handleUpload} className="text-[10px] uppercase tracking-widest font-black">Archive</button>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="fixed inset-0 bg-[#EBE8DB]/80 backdrop-blur-md z-[3000] flex items-center justify-center text-[9px] tracking-[0.8em] font-black uppercase italic animate-pulse">Archiving...</div>
      )}
    </div>
  );
}