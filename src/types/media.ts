export enum MediaTypeEnum {
  IMAGE = "IMAGE",
  PDF = "PDF",
  DOCS = "DOCS",
  OTHER = "OTHER",
}

export enum MediaStatusEnum {
  INIT = "INIT",
  TEMP = "TEMP",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  CANCELED = "CANCELED",
  DELETED = "DELETED",
}

export interface Media {
  id: string | number;
  type: MediaTypeEnum;
  status: MediaStatusEnum;
  title: string;
  description?: string;
  name: string;
  dir: string;
  path: string;
  provider: string;
  container?: string;
  mimeType?: string;
  size?: number;
  height?: number;
  width?: number;
  duration?: number;
  tags?: string[];
  checksum?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  deletedAt?: Date | string;
}

export interface MediaItem {
  localId: string;
  name: string;
  multiple?: boolean;
  file: File;
  tempPreviewUrl?: string;
  media: Partial<Media>;
}
