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
  media: Partial<Media>;
}

export async function generateUploadUrl({ media }: GenerateUploadUrlProps) {
  const res = await axios.post("/api/media/generate-upload-url", media, {
    headers: defaultHeaders,
  });
  return res;
}

export interface UploadToStorageProps {
  sasUrl: string;
  file: File;
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
  abortController?: AbortController;
}

export async function uploadToStorage({
  sasUrl,
  file,
  onUploadProgress,
  abortController,
}: UploadToStorageProps) {
  const res = await axios.put(sasUrl, file, {
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
  mediaIds: (string | number)[];
}

export async function markMediaAsTemp({ mediaIds }: MarkMediaAsTempProps) {
  const res = await axios.post(
    `/api/media/mark-media-as-temp`,
    { mediaIds },
    {
      headers: defaultHeaders,
    },
  );
  return res;
}

export interface MarkMediaAsActiveProps {
  mediaIds: (string | number)[];
}

export async function markMediaAsActive({ mediaIds }: MarkMediaAsActiveProps) {
  const res = await axios.post(
    `/api/media/mark-media-as-active`,
    { mediaIds },
    {
      headers: defaultHeaders,
    },
  );
  return res;
}

export interface MarkMediaAsCanceledProps {
  mediaIds: (string | number)[];
}

export async function markMediaAsCanceled({
  mediaIds,
}: MarkMediaAsActiveProps) {
  const res = await axios.post(
    `/api/media/mark-media-as-canceled`,
    [mediaIds],
    {
      headers: defaultHeaders,
    },
  );
  return res;
}
