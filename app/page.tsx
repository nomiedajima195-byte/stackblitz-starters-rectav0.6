'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- 設定チェック ---
const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function RectaDiagnostic() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [status, setStatus] = useState('Initializing...');

  // 1. 接続テスト & データ取得
  const testConnection = async () => {
    setStatus('Connecting to Supabase...');
    try {
      const { data, error } = await supabase
        .from('mainline') // 💡 ここ！テーブル名が「mainline」で合っているか？
        .select('*')
        .limit(10);

      if (error) {
        setErrorLog(`DB Error: ${error.message} (Code: ${error.code})`);
        setStatus('Failed');
      } else {
        setNodes(data || []);
        setStatus(data.length > 0 ? `Online: Found ${data.length} nodes` : 'Online: Table is EMPTY');
      }
    } catch (e: any) {
      setErrorLog(`System Error: ${e.message}`);
      setStatus('Crashed');
    }
  };

  useEffect(() => { testConnection(); }, []);

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-green-400 p-8 font-mono text-xs">
      <h1 className="text-xl font-bold mb-4 border-b border-green-900 pb-2">RECTA_SYSTEM_CHECK v1.0</h1>
      
      {/* 診断パネル */}
      <div className="bg-black p-4 rounded border border-green-900 mb-8">
        <div className="mb-2">STATUS: <span className="text-white bg-green-900 px-2">{status}</span></div>
        {errorLog && (
          <div className="text-red-500 mt-4 p-4 border border-red-900 bg-red-900/10">
            <div className="font-bold">⚠️ ERROR DETECTED:</div>
            <pre className="mt-2 whitespace-pre-wrap">{errorLog}</pre>
          </div>
        )}
      </div>

      {/* データ表示テスト */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {nodes.map((node) => (
          <div key={node.id} className="border border-green-900/30 p-2 opacity-50">
            {node.image_url ? ' [IMAGE] ' : ' [TEXT] '}
            <div className="truncate text-[8px] mt-1">{node.description || 'no-desc'}</div>
          </div>
        ))}
      </div>

      {/* 修正アドバイス */}
      <div className="mt-12 text-white/40">
        <p>If "Table is EMPTY": 投稿がまだDBに届いていないか、RLSでブロックされています。</p>
        <p>If "DB Error: relation does not exist": テーブル名が 'mainline' ではありません。</p>
        <p>If "System Error: invalid url": supabaseUrl が間違っています。</p>
      </div>

      <button 
        onClick={() => window.location.reload()}
        className="fixed bottom-8 right-8 bg-green-700 text-black px-6 py-3 font-bold hover:bg-green-400"
      >
        REBOOT_SYSTEM
      </button>
    </div>
  );
}