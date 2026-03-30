export type Stage = {
  id: number;
  name: string;
  duration: string;
  description: string;
  skills: string[];
  resources: string[];
};

export type RoadmapContent = {
  title: string;
  stages: Stage[];
};

export type UserDTO = {
  id: number;
  name: string;
  email: string;
};

export type RoadmapRecord = {
  id: number;
  title: string;
  content: RoadmapContent;
  createdAt: string;
};
