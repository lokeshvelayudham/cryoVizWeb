'use client';

import dynamic from 'next/dynamic';
const VolumeViewer = dynamic(() => import('@/components/VolumeViewerVti'), { ssr: false });

export default function HomePage() {
  return (
    <div>
      <h1 style={{ color: 'white', zIndex: 10, position: 'absolute' }}>Volume Viewer</h1>
      <VolumeViewer />
    </div>
  );
}