import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { fetchUserProfile, UserProfile } from "../services/user_service";
// Use the public directory image path
const DEFAULT_AVATAR_URL = "/images/default_user.jpg";

interface UserAvatarProps {
  uid: string;
  size?: number;
  isLeader?: boolean;
  className?: string;
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
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  border-radius: 50%;
  background-color: ${(props) => props.$bgColor || "#e0e0e0"};
  position: ${(props) =>
    props.$index !== undefined ? "absolute" : "relative"};
  left: ${(props) =>
    props.$index !== undefined ? props.$index * (props.$size * 0.6) : 0}px;
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${(props) => (props.$isClickable ? "pointer" : "default")};
  transition: transform 0.2s;
  filter: ${(props) => (props.$isPast ? "grayscale(50%)" : "none")};
  overflow: hidden;

  &:hover {
    transform: ${(props) => (props.$isClickable ? "scale(1.1)" : "none")};
  }
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;

  /* Prevent long-press context menu on mobile */
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;

  /* Prevent drag and drop */
  -webkit-user-drag: none;
  -khtml-user-drag: none;
  -moz-user-drag: none;
  -o-user-drag: none;
  user-drag: none;
`;

const AvatarPlaceholder = styled.div<{ $size: number }>`
  color: white;
  font-size: ${(props) => (props.$size > 30 ? "16px" : "10px")};
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LoadingSpinner = styled.div<{ $size: number }>`
  width: ${(props) => Math.min(props.$size * 0.5, 16)}px;
  height: ${(props) => Math.min(props.$size * 0.5, 16)}px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #666;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

export const UserAvatar: React.FC<UserAvatarProps> = ({
  uid,
  size = 40,
  isLeader = false,
  className,
  onClick,
  index,
  isPast = false,
}) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const getAvatarColor = (uid: string, isLeader: boolean): string => {
    const colors = isLeader
      ? ["#9c27b0", "#673ab7", "#3f51b5"]
      : ["#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50"];
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
      } catch (error) {
        console.error(`Error loading user profile for ${uid}:`, error);
      } finally {
        setLoading(false);
      }
    };
    if (uid) loadUserProfile();
    else setLoading(false);
  }, [uid]);

  const handleImageError = () => {
    setImageError(true);
  };

  const displayName =
    userProfile?.displayName || `User ${uid ? uid.substring(0, 8) : ""}`;
  const avatarColor = getAvatarColor(uid || "", isLeader);

  // Determine the image source: use default if user's photoURL is empty, null, or if there was an error
  const hasValidPhotoURL =
    userProfile?.photoURL && userProfile.photoURL.trim() !== "";
  const imageSrc =
    hasValidPhotoURL && !imageError ? userProfile.photoURL : DEFAULT_AVATAR_URL;

  return (
    <AvatarContainer
      $size={size}
      $bgColor={avatarColor}
      $index={index}
      $isPast={isPast}
      $isClickable={!!onClick}
      className={className}
      onClick={onClick}
    >
      {loading ? (
        <LoadingSpinner $size={size} />
      ) : (
        <AvatarImage
          src={imageSrc}
          alt={displayName}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          onError={
            hasValidPhotoURL && !imageError ? handleImageError : undefined
          }
        />
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
  onAvatarClick,
}) => {
  // Filter out duplicates and invalid UIDs to prevent React key errors
  const uniqueUids = Array.from(new Set(uids.filter(uid => uid && uid.trim() !== '')));
  const displayedUids = uniqueUids.slice(0, maxAvatars);
  const hasMore = uniqueUids.length > maxAvatars;
  const moreCount = uniqueUids.length - maxAvatars;

  return (
    <div
      style={{
        position: "relative",
        height: `${size}px`,
        minWidth: `${
          displayedUids.length > 0
            ? displayedUids.length * size * 0.6 + size * 0.4
            : size
        }px`,
      }}
    >
      {displayedUids.map((uid, index) => (
        <UserAvatar
          key={`${uid}-${index}`} // Use compound key to ensure uniqueness
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
          key="more-count"
          $size={size}
          $bgColor="#f0f0f0"
          $index={displayedUids.length}
          $isPast={isPast}
          $isClickable={false}
        >
          <AvatarPlaceholder $size={size}>+{moreCount}</AvatarPlaceholder>
        </AvatarContainer>
      )}
    </div>
  );
};

export default UserAvatar;
