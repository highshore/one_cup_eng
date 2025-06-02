import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { fetchUserProfile, UserProfile } from '../services/user_service';

// Assuming default_user.jpg is in public/images/ directory
const DEFAULT_AVATAR_URL = '/images/default_user.jpg';

interface UserAvatarProps {
  uid: string;
  size?: number;
  isLeader?: boolean;
  className?: string;
  title?: string;
  onClick?: () => void;
  index?: number; // For stacking position
  isPast?: boolean; // For greyscale effect
}

const AvatarContainer = styled.div<{ 
  $size: number; 
  $bgColor?: string; 
  $index?: number;
  $isPast?: boolean;
  $isClickable: boolean;
}>`
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  border-radius: 50%;
  background-color: ${props => props.$bgColor || '#e0e0e0'};
  position: ${props => props.$index !== undefined ? 'absolute' : 'relative'};
  left: ${props => props.$index !== undefined ? props.$index * (props.$size * 0.75) : 0}px;
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.$isClickable ? 'pointer' : 'default'};
  transition: transform 0.2s;
  filter: ${props => props.$isPast ? 'grayscale(50%)' : 'none'};
  overflow: hidden;
  
  &:hover {
    transform: ${props => props.$isClickable ? 'scale(1.1)' : 'none'};
  }
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
`;

const AvatarPlaceholder = styled.div<{ $size: number }>`
  color: white;
  font-size: ${props => props.$size > 30 ? '16px' : '10px'};
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LoadingSpinner = styled.div<{ $size: number }>`
  width: ${props => Math.min(props.$size * 0.5, 16)}px;
  height: ${props => Math.min(props.$size * 0.5, 16)}px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #666;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export const UserAvatar: React.FC<UserAvatarProps> = ({
  uid,
  size = 40,
  isLeader = false,
  className,
  title,
  onClick,
  index,
  isPast = false
}) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const getAvatarColor = (uid: string, isLeader: boolean): string => {
    const colors = isLeader 
      ? ['#9c27b0', '#673ab7', '#3f51b5'] 
      : ['#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50'];
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
      hash = ((hash << 5) - hash + uid.charCodeAt(i)) & 0xffffffff;
    }
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  };

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true);
        setImageError(false); // Reset image error state on UID change
        const profile = await fetchUserProfile(uid);
        setUserProfile(profile);
        // console.log(`[UserAvatar] Fetched profile for UID ${uid}:`, profile);
      } catch (error) {
        console.error(`Error loading user profile for ${uid}:`, error);
      } finally {
        setLoading(false);
      }
    };
    if (uid) loadUserProfile(); else setLoading(false);
  }, [uid]);

  const handleImageError = () => {
    setImageError(true);
  };

  const displayName = userProfile?.displayName || `User ${uid ? uid.substring(0, 8) : ''}`;
  const initials = displayName
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const avatarColor = getAvatarColor(uid || '', isLeader);
  // Determine the image source: user's photoURL, or default if error/missing, or hide if still loading.
  const imageSrc = userProfile?.photoURL && !imageError ? userProfile.photoURL : DEFAULT_AVATAR_URL;
  // Show placeholder (initials) only if there was an error with both user photo and default photo, or if no photoURL and no default provided.
  // For this setup, we always try to show an image (user or default).
  const showImage = !loading;
  const showPlaceholder = loading || (imageError && imageSrc === DEFAULT_AVATAR_URL); // Show placeholder if loading or if default image also failed (or if only default image exists and it failed)

  return (
    <AvatarContainer
      $size={size}
      $bgColor={avatarColor}
      $index={index}
      $isPast={isPast}
      $isClickable={!!onClick}
      className={className}
      title={title || displayName}
      onClick={onClick}
    >
      {loading ? (
        <LoadingSpinner $size={size} />
      ) : (
        showImage && !showPlaceholder ? (
          <AvatarImage
            src={imageSrc}
            alt={displayName}
            onError={imageSrc === DEFAULT_AVATAR_URL ? undefined : handleImageError} // Only handle error for non-default images to prevent loop if default fails
          />
        ) : (
          <AvatarPlaceholder $size={size}>
            {initials || '👤'}
          </AvatarPlaceholder>
        )
      )}
    </AvatarContainer>
  );
};

// Component for multiple avatars in a stack
interface UserAvatarStackProps {
  uids: string[];
  maxAvatars?: number;
  size?: number;
  isLeader?: boolean;
  isPast?: boolean;
  onAvatarClick?: (uid: string) => void;
}

export const UserAvatarStack: React.FC<UserAvatarStackProps> = ({
  uids,
  maxAvatars = 5,
  size = 22,
  isLeader = false,
  isPast = false,
  onAvatarClick
}) => {
  const displayedUids = uids.slice(0, maxAvatars);
  const hasMore = uids.length > maxAvatars;
  const moreCount = uids.length - maxAvatars;

  return (
    <div style={{ position: 'relative', height: `${size}px`, minWidth: `${(displayedUids.length * size * 0.75) + (size * 0.25)}px` }}>
      {displayedUids.map((uid, index) => (
        <UserAvatar
          key={uid}
          uid={uid}
          size={size}
          isLeader={isLeader}
          index={index}
          isPast={isPast}
          onClick={onAvatarClick ? () => onAvatarClick(uid) : undefined}
        />
      ))}
      {hasMore && (
        <AvatarContainer
          $size={size}
          $bgColor="#f0f0f0"
          $index={displayedUids.length}
          $isPast={isPast}
          $isClickable={false}
          title={`+${moreCount} more`}
        >
          <AvatarPlaceholder $size={size}>
            +{moreCount}
          </AvatarPlaceholder>
        </AvatarContainer>
      )}
    </div>
  );
};

export default UserAvatar; 
