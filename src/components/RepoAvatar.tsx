import { useState } from 'react';
import type { GpuTarget } from '../types/telemetry';

interface RepoAvatarProps {
  owner: string;
  avatarUrl?: string;
  gpuTarget: GpuTarget;
  size?: 'sm' | 'md' | 'lg';
}

const GPU_TINT: Record<GpuTarget, string> = {
  'AMD RDNA3/4': 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  'NVIDIA Ada/Blackwell': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'Multi-Vendor / Vulkan': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
};

const SIZE_MAP = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
};

export function RepoAvatar({ owner, avatarUrl, gpuTarget, size = 'md' }: RepoAvatarProps) {
  const [failed, setFailed] = useState(false);
  const initials = owner.slice(0, 2).toUpperCase();
  const sizeClass = SIZE_MAP[size];

  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt={`${owner} avatar`}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${sizeClass} rounded-md object-cover border border-[#242E42] shrink-0 bg-[#161D2B]`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${sizeClass} rounded-md border font-mono font-semibold inline-flex items-center justify-center shrink-0 select-none ${GPU_TINT[gpuTarget]}`}
    >
      {initials}
    </span>
  );
}
