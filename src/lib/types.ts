export type UserRole = "member" | "admin";
export type UserStatus = "active" | "inactive";
export type MissionStatus = "pending" | "available" | "locked";
export type CheckStatus = "completed" | "missed";

export type Profile = {
  id: string;
  email: string;
  nickname: string;
  instagram_id: string;
  role: UserRole;
  status: UserStatus;
  joined_at: string;
  created_at: string;
  updated_at: string;
};

export type PublicProfile = Pick<Profile, "id" | "nickname" | "instagram_id" | "joined_at" | "status">;

export type Mission = {
  id: string;
  mission_date: string;
  hashtag_date: string;
  hashtag: string;
  instagram_url: string;
  status: MissionStatus;
  created_at: string;
  updated_at: string;
};

export type MissionCheck = {
  id: string;
  user_id: string;
  mission_id: string;
  mission_date: string;
  status: CheckStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};
