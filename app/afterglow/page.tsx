"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js'; // 要：npm install @supabase/supabase-js

// Supabase設定（君のプロジェクトのURLとキーを入れる）
const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');

export default function EngineFullConnect() {
  const [mode, setMode] = useState('WIKI'); 
  const [wikiData, setWikiData] = useState({ title: '', content: '' });
  const [streetPost, setStreetPost] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // --- Wikipedia 全文取得 ---
  const fetchWikiFull = async () => {
    setIsLoading(true);
    try {
      // ランダムなタイトルを取得
      const resRandom = await fetch(`https://ja.wikipedia.org/api/rest_v1/page/random/title`);
      const dataRandom = await resRandom.json();
      const title = dataRandom.items[0].title;

      // そのタイトルの本文（モバイル用セクション）を取得
      const resContent = await fetch(`https://ja.wikipedia.org/api/rest_v1/page/mobile-sections/${title}`);
      const dataContent = await resContent.json();
      
      // HTMLタグを除去してテキストのみ抽出（90sテキストスタイル）
      const leadSection = dataContent.lead.sections[0].text.replace(/<[^>]*>/g, '');
      const otherSections = dataContent.remaining.sections.map((s: any) => s.text.replace(/<[^>]*>/g, '')).join('\n\n');

      setWikiData({ title: dataContent.lead.displaytitle, content: leadSection + '\n\n' + otherSections });
    } catch (e) {
      setWikiData({ title: 'ERROR', content: '通信失敗。' });
    }
    setIsLoading(false);
  };

  // --- STREET (他人のポスト) 取得 ---
  const fetchStreet = async () => {
    setIsLoading(true);
    // PostgreSQLの random() 関数を使って1件サンプリング
    const { data, error } = await supabase.from('posts').select('*').limit(1); 
    // ※本来は order('random()') を使いたいが、Supabaseクライアントからは直接呼べないため
    // 実際は RPC (Stored Procedure) を使うか、件数を数えてオフセットで取得するのが定石。
    if (data && data.length > 0) setStreetPost(data[0]);
    setIsLoading(false);
  };

  // --- POST (ストリートに放流) ---
  const handlePost = async (title: string, body: string) => {
    const { error } = await supabase.from('posts').insert([
      { title, body, author_id: 'SESSION_USER_ID' } // 認証後のIDを入れる
    ]);
    if (!error) {
      alert("放流完了。");
      setMode('MAIN');
      fetchStreet();
    }
  };

  return (
    <div className="bg-white text-black font-mono h-[100dvh] flex flex-col border-2 border-black overflow-hidden">
      {/* HEADER, FOOTER は前回のデザインを維持 */}
      <main className="flex-grow p-4 relative flex flex-col overflow-hidden">
        
        {/* WIKI MODE (全文表示) */}
        {mode === 'WIKI' && (
          <div className="flex flex-col h-full">
            <div className="flex-grow border-4 border-black p-6 bg-white overflow-hidden flex flex-col">
              <h2 className="text-2xl font-black mb-4 underline decoration-4 break-words">{wikiData.title}</h2>
              <div className="flex-grow overflow-y-auto text-sm leading-relaxed border-t-2 border-black pt-4 whitespace-pre-wrap">
                {isLoading ? "LOADING_DATA_FROM_WIKIPEDIA..." : wikiData.content}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-4">
              <button onClick={fetchWikiFull} className="col-span-3 border-4 border-black py-4 font-black text-xl active:invert">NEXT_WIKI →</button>
              <button className="border-4 border-black font-black uppercase text-xs">Keep</button>
            </div>
          </div>
        )}

        {/* STREET (MAIN) MODE */}
        {mode === 'MAIN' && (
          <div className="flex flex-col h-full">
            <div className="flex-grow border-4 border-black p-6 bg-white overflow-hidden flex flex-col">
              {streetPost ? (
                <>
                  <h2 className="text-2xl font-black mb-4">{streetPost.title}</h2>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{streetPost.body}</p>
                </>
              ) : (
                <p className="text-xs italic text-gray-400">ストリートにはまだ誰もいない...</p>
              )}
            </div>
            <button onClick={fetchStreet} className="mt-4 border-4 border-black py-4 font-black">NEXT_STREET →</button>
          </div>
        )}
      </main>
      
      {/* ... FOOTER (省略) ... */}
    </div>
  );
}