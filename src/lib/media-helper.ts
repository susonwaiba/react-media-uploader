import { type Media, MediaTypeEnum } from "@/types/media";
import axios, { type AxiosProgressEvent } from "axios";

export const imageMimeTypes = [
  "image/webp",
  "image/gif",
  "image/png",
  "image/jpeg",
  "image/jpg",
];

export async function generateMediaType(file: File): Promise<MediaTypeEnum> {
  if (imageMimeTypes.includes(file.type)) {
    return MediaTypeEnum.IMAGE;
  }
  if (file.type === "application/pdf") {
    return MediaTypeEnum.PDF;
  }
  return MediaTypeEnum.OTHER;
}

export async function generateFileHash(
  file: File,
  algorithm = "sha-1",
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest(algorithm, arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexHash = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hexHash;
}

export const defaultHeaders = {
  "Content-Type": "application/json",
};

export interface GenerateUploadUrlProps {
  url?: string;
  additionalHeaders?: Record<string, string>;
  media: Partial<Media>;
}

export async function generateUploadUrl({
  url,
  additionalHeaders,
  media,
}: GenerateUploadUrlProps) {
  const res = await axios.post(url ?? "/api/media/generate-upload-url", media, {
    headers: {
      ...defaultHeaders,
      ...additionalHeaders,
    },
  });
  return res;
}

export interface UploadToStorageProps {
  uploadUrl: string;
  file: File;
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
  abortController?: AbortController;
}

export async function uploadToStorage({
  uploadUrl,
  file,
  onUploadProgress,
  abortController,
}: UploadToStorageProps) {
  const res = await axios.put(uploadUrl, file, {
    headers: {
      "x-ms-blob-type": "BlockBlob",
      "Content-Type": file.type,
    },
    onUploadProgress: onUploadProgress,
    signal: abortController ? abortController?.signal : undefined,
  });
  return res;
}

export interface MarkMediaAsTempProps {
  url?: string;
  additionalHeaders?: Record<string, string>;
  mediaIds: (string | number)[];
}

export async function markMediaAsTemp({
  url,
  additionalHeaders,
  mediaIds,
}: MarkMediaAsTempProps) {
  const res = await axios.post(
    url ?? `/api/media/mark-media-as-temp`,
    { mediaIds },
    {
      headers: {
        ...defaultHeaders,
        ...additionalHeaders,
      },
    },
  );
  return res;
}

export interface MarkMediaAsActiveProps {
  url?: string;
  additionalHeaders?: Record<string, string>;
  mediaIds: (string | number)[];
}

export async function markMediaAsActive({
  url,
  additionalHeaders,
  mediaIds,
}: MarkMediaAsActiveProps) {
  const res = await axios.post(
    url ?? `/api/media/mark-media-as-active`,
    { mediaIds },
    {
      headers: {
        ...defaultHeaders,
        ...additionalHeaders,
      },
    },
  );
  return res;
}

export interface MarkMediaAsCanceledProps {
  url?: string;
  additionalHeaders?: Record<string, string>;
  mediaIds: (string | number)[];
}

export async function markMediaAsCanceled({
  url,
  additionalHeaders,
  mediaIds,
}: MarkMediaAsActiveProps) {
  const res = await axios.post(
    url ?? `/api/media/mark-media-as-canceled`,
    [mediaIds],
    {
      headers: {
        ...defaultHeaders,
        ...additionalHeaders,
      },
    },
  );
  return res;
}

export async function getMediaImageDimension(imageUrl: string): Promise<{
  height: number;
  width: number;
}> {
  return new Promise((res, rej) => {
    const tempImg = new Image();
    tempImg.src = imageUrl;
    tempImg.onload = () => {
      res({
        height: tempImg.naturalHeight,
        width: tempImg.naturalWidth,
      });
    };
    tempImg.onerror = () => rej(new Error(`Failed to load image: ${imageUrl}`));
  });
}
