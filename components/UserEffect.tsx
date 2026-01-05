
import React from 'react';
import { Profile } from '../types';

interface UserNicknameProps {
    profile: Profile;
    className?: string;
}

export const UserNickname: React.FC<UserNicknameProps> = ({ profile, className = "" }) => {
    const isRainbow = profile.active_items?.special_effects?.includes('rainbow');
    const isGlitch = profile.active_items?.special_effects?.includes('glitch');

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
                data-text={profile.username}
            >
                {profile.username}
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
            <div className={`rounded-full overflow-hidden ${sizeMap[size]} ${frameClass}`}>
                <img
                    src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                    alt={profile.username}
                    className={`w-full h-full object-cover ${isGlitch ? 'effect-glitch opacity-80' : ''}`}
                    data-text={profile.username} // Glitch effect needs this for pseudo-elements if applied to container
                />
            </div>
            {isGlitch && (
                <div className="absolute inset-0 bg-cyan-500/10 pointer-events-none mix-blend-screen animate-pulse rounded-full" />
            )}
        </div>
    );
};
