import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface UserAvatarProps {
  user: {
    full_name: string;
    avatar_url?: string | null;
  };
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12"
};

export function UserAvatar({ user, size = "md", showTooltip = true, className = "" }: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const avatarContent = (
    <Avatar className={`${sizeMap[size]} ${className} border-2 border-background`}>
      {user.avatar_url && !imageError ? (
        <AvatarImage 
          src={user.avatar_url} 
          alt={user.full_name}
          onError={() => setImageError(true)}
        />
      ) : null}
      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
        {getInitials(user.full_name)}
      </AvatarFallback>
    </Avatar>
  );

  if (!showTooltip) {
    return avatarContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {avatarContent}
        </TooltipTrigger>
        <TooltipContent>
          <p>{user.full_name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}