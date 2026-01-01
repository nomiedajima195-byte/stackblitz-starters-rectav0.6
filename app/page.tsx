'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfxwhcgdbavycddapqmz.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHdoY2dkYmF2eWNkZGFwcW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjQ0NzUsImV4cCI6MjA4Mjc0MDQ3NX0.YNQlbyocg2olS6-1WxTnbr5N2z52XcVIpI1XR-XrDtM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Page() {
  const [mainline, setMainline] = useState<any[]>([]);
  const [sideCells, setSideCells] = useState<any>({});
  const [viewingSideParentId, setViewingSideParentId] = useState<string | null>(
    null
  );

  const fetchData = useCallback(async () => {
    try {
      const { data: mainData } = await supabase
        .from('mainline')
        .select('*')
        .order('created_at', { ascending: true });
      const { data: sideData } = await supabase
        .from('side_cells')
        .select('*')
        .order('created_at', { ascending: true });
      if (mainData)
        setMainline(
          mainData.map((d) => ({ cell: { id: d.id, imageUrl: d.image_url } }))
        );
      if (sideData) {
        const grouped: any = {};
        sideData.forEach((s) => {
          if (!grouped[s.parent_id]) grouped[s.parent_id] = [];
          grouped[s.parent_id].push({ id: s.id, imageUrl: s.image_url });
        });
        setSideCells(grouped);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('realtime')
      .on('postgres_changes', { event: '*', schema: 'public' }, () =>
        fetchData()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    parentId: string | null = null
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageUrl = event.target?.result as string;
      const id = `${Date.now()}`;
      if (!parentId) {
        await supabase.from('mainline').insert([{ id, image_url: imageUrl }]);
      } else {
        await supabase
          .from('side_cells')
          .insert([{ id, parent_id: parentId, image_url: imageUrl }]);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-white text-black p-4">
      <div className="max-w-md mx-auto">
        <header className="mb-8 flex justify-between items-center text-xs opacity-40 tracking-[0.3em]">
          <h1>RECTA CLOUD v0.6</h1>
          <button onClick={() => fetchData()} className="border px-2 py-1">
            SYNC
          </button>
        </header>

        {!viewingSideParentId ? (
          <div className="space-y-12 pb-32">
            {mainline.map((slot) => (
              <div key={slot.cell.id} className="relative">
                <div className="aspect-[3/4] bg-gray-50 rounded-xl overflow-hidden border">
                  <img
                    src={slot.cell.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => setViewingSideParentId(slot.cell.id)}
                  className="absolute -right-2 bottom-4 bg-black text-white w-10 h-10 rounded-full flex items-center justify-center"
                >
                  {' '}
                  →{' '}
                </button>
              </div>
            ))}
            <label className="block aspect-[3/4] border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer text-gray-300">
              <span className="text-3xl">＋</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileUpload(e)}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-8 pb-32">
            <button
              onClick={() => setViewingSideParentId(null)}
              className="text-[10px] opacity-40"
            >
              {' '}
              ← BACK{' '}
            </button>
            {(sideCells[viewingSideParentId] || []).map((cell: any) => (
              <div
                key={cell.id}
                className="aspect-[4/3] bg-gray-50 rounded-xl overflow-hidden border"
              >
                <img
                  src={cell.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            <label className="block aspect-[4/3] border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer text-gray-300">
              <span className="text-2xl">＋</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, viewingSideParentId)}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
