import React from 'react';
import { Profile } from '../types';
import { BadgeCheck, Shield } from 'lucide-react';

interface UserNicknameProps {
    profile: Profile;
    className?: string;
}

export const UserNickname: React.FC<UserNicknameProps> = ({ profile, className = "" }) => {
    const isRainbow = profile.active_items?.special_effects?.includes('rainbow');
    const isGlitch = profile.active_items?.special_effects?.includes('glitch');
    const displayName = (profile as any).nickname || profile.username;

    return (
        <span className={`inline-flex items-center gap-1 ${className}`}>
            {profile.active_items?.custom_title && (
                <span className="text-[10px] font-black text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded uppercase tracking-tighter mr-1">
                    {profile.active_items.custom_title}
                </span>
            )}
            {profile.active_items?.badge && (
                <span className="text-xs">{profile.active_items.badge}</span>
            )}
            <span
                className={`font-black ${isRainbow ? 'effect-rainbow' : ''} ${isGlitch ? 'effect-glitch font-mono' : ''}`}
                style={{ color: !isRainbow ? profile.active_items?.name_color : undefined }}
                data-text={displayName}
            >
                {displayName}
            </span>
        </span>
    );
};

interface UserAvatarProps {
    profile: Profile;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ profile, size = 'md', className = "" }) => {
    const isGlitch = profile.active_items?.special_effects?.includes('glitch');
    const frameClass = profile.active_items?.frame || "";

    const sizeMap = {
        sm: 'w-6 h-6',
        md: 'w-10 h-10',
        lg: 'w-16 h-16',
        xl: 'w-24 h-24'
    };

    return (
        <div className={`relative inline-block ${className}`}>
            <div className={`
                ${sizeMap[size]} 
                relative overflow-hidden
                ${frameClass}
                flex items-center justify-center
                group
            `}>
                {profile.avatar_url ? (
                    <img
                        src={profile.avatar_url}
                        alt={profile.username}
                        className={`w-full h-full object-cover transition-transform group-hover:scale-110 ${isGlitch ? 'animate-glitch' : ''}`}
                        data-text={profile.username}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold">
                        {((profile as any).nickname || profile.username)[0].toUpperCase()}
                    </div>
                )}
            </div>

            {/* Online Status or Shield */}
            {profile.shields && profile.shields > 0 && (
                <div className="absolute -top-1 -right-1 bg-blue-500 text-white p-1 rounded-full border-2 border-white dark:border-gray-900 shadow-lg animate-bounce-subtle">
                    <Shield size={size === 'sm' ? 8 : 12} fill="currentColor" />
                    {profile.shields > 1 && (
                        <span className="absolute -bottom-1 -right-1 bg-red-500 text-[8px] font-black px-1 rounded-full">{profile.shields}</span>
                    )}
                </div>
            )}
            {isGlitch && (
                <div className="absolute inset-0 bg-cyan-500/10 pointer-events-none mix-blend-screen animate-pulse rounded-full" />
            )}
        </div>
    );
};
