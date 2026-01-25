'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// 【確認】このURLとKey、昨日の掃除後も変わりありませんか？
const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CARD_BG = "#F5F2E9";
const MAX_PIXEL = 320; 

const getRandomStr = (len: number) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({length: len}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export default function AfterglowPage() {
  const [allCards, setAllCards] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [pocketId, setPocketId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [pairId, setPairId] = useState<string | null>(null);
  const [debugMsg, setDebugMsg] = useState<string>('Initializing...');

  useEffect(() => {
    let id = localStorage.getItem('recta_pocket_id');
    if (!id) {
      id = `PKT-${getRandomStr(9)}`;
      localStorage.setItem('recta_pocket_id', id);
    }
    setPocketId(id);

    const params = new URLSearchParams(window.location.search);
    const p = params.get('pair') || 'public-afterglow';
    setPairId(p);
    setDebugMsg(`PairID: ${p}`);
  }, []);

  const fetchData = useCallback(async () => {
    if (!pairId) return;
    setDebugMsg("Fetching data...");

    const { data, error } = await supabase
      .from('afterglow_scraps')
      .select('*')
      .eq('pair_id', pairId);

    if (error) {
      setDebugMsg(`Fetch Error: ${error.message} (Code: ${error.code})`);
      return;
    }

    setDebugMsg(`Data Found: ${data?.length || 0} items`);
    setAllCards(data || []); 
  }, [pairId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const uploadFile = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file || isUploading || !pocketId || !pairId) return;
    setIsUploading(true);
    setDebugMsg("Processing image...");

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = MAX_PIXEL; canvas.height = MAX_PIXEL; // 簡易リサイズ
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, MAX_PIXEL, MAX_PIXEL);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        setDebugMsg("Uploading to Storage...");
        
        const fileName = `afterglow/${Date.now()}.png`;
        const { error: storageError } = await supabase.storage.from('images').upload(fileName, blob);
        
        if (storageError) {
          setDebugMsg(`Storage Error: ${storageError.message}`);
          setIsUploading(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
        setDebugMsg("Inserting into DB...");
        
        const { error: insertError } = await supabase.from('afterglow_scraps').insert([{
          image_url: publicUrl,
          keyword: note,
          pair_id: pairId,
          owner_id: pocketId
        }]);

        if (insertError) {
          setDebugMsg(`Insert Error: ${insertError.message}`);
        } else {
          setDebugMsg("Upload Success!");
          setNote('');
          fetchData();
        }
        setIsUploading(false);
      }, 'image/png');
    };
  };

  return (
    <div className="min-h-screen bg-[#EBE8DB] text-black font-serif p-10">
      {/* 診断メッセージ表示エリア */}
      <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-[10px] p-2 z-[100] text-center font-mono">
        DEBUG: {debugMsg}
      </div>

      <header className="mt-10 mb-10 opacity-30 text-center uppercase tracking-widest">
        Rubbish / Afterglow
      </header>
      
      <main className="flex flex-wrap justify-center gap-10">
        {allCards.map(item => (
          <div key={item.id} className="w-[200px] bg-white p-2 shadow-xl border border-black/10">
            <img src={item.image_url} className="w-full h-auto grayscale" alt="sediment" />
            <p className="mt-2 text-[12px] italic">{item.keyword}</p>
          </div>
        ))}
      </main>

      <nav className="fixed bottom-10 left-0 right-0 flex justify-center">
        <div className="bg-white p-4 rounded-full shadow-2xl flex items-center space-x-4 px-6 border border-black/10">
          <input 
            type="text" 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note"
            className="bg-transparent border-b border-black/10 outline-none text-sm w-32 pb-1"
          />
          <label className="cursor-pointer">
            <span className="text-2xl">◎</span>
            <input type="file" className="hidden" onChange={uploadFile} />
          </label>
        </div>
      </nav>
    </div>
  );
}