"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('YOUR_URL', 'YOUR_KEY');

export default function EngineKeepConnect() {
  const [mode, setMode] = useState('WIKI'); 
  const [wikiData, setWikiData] = useState({ title: '', content: '' });
  const [keeps, setKeeps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // --- WIKI全文取得 (HTMLタグ除去版) ---
  const fetchWikiFull = async () => {
    setIsLoading(true);
    try {
      const resR = await fetch(`https://ja.wikipedia.org/api/rest_v1/page/random/title`);
      const dataR = await resR.json();
      const title = dataR.items[0].title;
      const resC = await fetch(`https://ja.wikipedia.org/api/rest_v1/page/mobile-sections/${title}`);
      const dataC = await resC.json();
      
      const cleanText = (html: string) => html.replace(/<[^>]*>/g, '');
      const lead = cleanText(dataC.lead.sections[0].text);
      const remaining = dataC.remaining.sections.map((s: any) => cleanText(s.text)).join('\n\n');

      setWikiData({ title: dataC.lead.displaytitle, content: lead + '\n\n' + remaining });
    } catch (e) {
      setWikiData({ title: 'ERROR', content: 'Wikipediaへの接続に失敗。' });
    }
    setIsLoading(false);
  };

  // --- KEEPの保存 (DBへ) ---
  const handleKeep = async (title: string, body: string, source: string) => {
    const { error } = await supabase.from('keeps').insert([
      { title, body, source }
    ]);
    if (!error) {
      alert("横丁へ運んだ。");
      fetchKeeps(); // リスト更新
    }
  };

  // --- KEEPした記事の取得 ---
  const fetchKeeps = async () => {
    const { data, error } = await supabase
      .from('keeps')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setKeeps(data);
  };

  useEffect(() => {
    fetchWikiFull();
    fetchKeeps();
  }, []);

  return (
    <div className="bg-white text-black font-mono h-[100dvh] flex flex-col border-2 border-black overflow-hidden">
      {/* HEADER省略 */}

      <main className="flex-grow p-4 relative flex flex-col overflow-hidden">
        
        {/* WIKI MODE */}
        {mode === 'WIKI' && (
          <div className="flex flex-col h-full animate-in fade-in">
            <div className="flex-grow border-4 border-black p-6 bg-white overflow-hidden flex flex-col">
              <h2 className="text-2xl font-black mb-4 underline decoration-4 break-words">{wikiData.title}</h2>
              <div className="flex-grow overflow-y-auto text-sm leading-relaxed border-t-2 border-black pt-4 whitespace-pre-wrap">
                {isLoading ? "LOADING_FULL_TEXT..." : wikiData.content}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-4">
              <button onClick={fetchWikiFull} className="col-span-3 border-4 border-black py-4 font-black text-xl active:bg-black active:text-white uppercase">Next_Wiki</button>
              <button onClick={() => handleKeep(wikiData.title, wikiData.content, 'WIKI')} className="border-4 border-black font-black text-xs uppercase active:bg-black active:text-white">Keep</button>
            </div>
          </div>
        )}

        {/* KEEP MODE (横丁) */}
        {mode === 'KEEP' && (
          <div className="flex flex-col h-full animate-in fade-in">
            <div className="text-[10px] font-bold bg-black text-white px-2 self-start mb-2 uppercase">Your_Keep_Box ({keeps.length})</div>
            <div className="flex-grow border-4 border-black p-6 flex flex-col overflow-hidden">
              {keeps.length > 0 ? (
                <>
                  <h3 className="text-xl font-black mb-4 underline">{keeps[currentIndex % keeps.length].title}</h3>
                  <div className="flex-grow overflow-y-auto text-sm whitespace-pre-wrap">{keeps[currentIndex % keeps.length].body}</div>
                  <div className="mt-4 pt-2 border-t border-dotted border-gray-400 text-[8px] text-gray-500 uppercase">
                    Expires: {new Date(keeps[currentIndex % keeps.length].expires_at).toLocaleString()}
                  </div>
                </>
              ) : (
                <div className="flex-grow flex items-center justify-center text-xs italic text-gray-300 uppercase">Empty_Alleyway</div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button onClick={() => setCurrentIndex(prev => prev + 1)} className="border-2 border-black py-4 font-bold uppercase">Next_Keep</button>
              <button className="border-2 border-black py-4 font-bold uppercase active:bg-black active:text-white">Share</button>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER省略 (Mode切替時にfetchKeepsを呼ぶようにする) */}
    </div>
  );
}