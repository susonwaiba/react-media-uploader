import {
  markMediaAsCanceled,
  generateFileHash,
  generateUploadUrl,
  uploadToStorage,
  markMediaAsTemp,
  markMediaAsActive,
  generateMediaType,
} from "@/lib/media-helper";
import { type Media, MediaStatusEnum, type MediaItem } from "@/types/media";
import { type AxiosProgressEvent } from "axios";
import { useState } from "react";

export interface UploadMediaInfo extends Omit<AxiosProgressEvent, "event"> {
  event?: undefined;
  cancel?: () => Promise<void>;
}

export interface UseMediaUploaderProps<T extends object> {
  defaultValues?: T;
  mediaUploadSuccessStatus?: MediaStatusEnum;
  enableManualUpload?: boolean;
}

export interface UseMediaUploaderResponse<T extends object> {
  values: T;
  setValues: (val: T) => void;
  enableManualUpload?: boolean;
  uploadManually: () => Promise<T>;
  mediaItems: Record<string, MediaItem>;
  uploadInfos: Record<string, UploadMediaInfo>;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onFileChange: (file: File, name: string, multiple?: boolean) => Promise<void>;
}

export function useMediaUploader<T extends object>({
  defaultValues,
  mediaUploadSuccessStatus = MediaStatusEnum.TEMP,
  enableManualUpload = false,
}: UseMediaUploaderProps<T> = {}): UseMediaUploaderResponse<T> {
  const [values, setValues] = useState<T>(defaultValues ?? ({} as T));
  const [mediaItems, setMediaItems] = useState<Record<string, MediaItem>>({});
  const [uploadInfos, setUploadInfos] = useState<
    Record<string, UploadMediaInfo>
  >({});

  const onFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("onFileInputChange -> e ->", e);
    const target = e.target as any;
    const name = target.name;
    const multiple = target.multiple || false;
    if (target.files && target.files.length) {
      for (const file of target.files) {
        onFileChange(file, name, multiple);
      }
    }
  };

  const onFileChange = async (
    file: File,
    name: string,
    multiple: boolean = false,
  ) => {
    const localId = crypto.randomUUID();
    const item: MediaItem = {
      localId,
      name,
      multiple,
      file,
      tempPreviewUrl: URL.createObjectURL(file),
      media: {
        type: await generateMediaType(file),
        name: file.name,
        mimeType: file.type,
        size: file.size,
        checksum: await generateFileHash(file),
      },
    };
    setMediaItems((previous) => {
      const newState = { ...previous };
      newState[localId] = item;
      return newState;
    });
    if (!enableManualUpload) {
      uploadMediaFile(item);
    }
  };

  const uploadMediaFile = async (item: MediaItem): Promise<T | undefined> => {
    const sasUrlRes = await generateUploadUrl({ media: item?.media });
    if (sasUrlRes?.data?.item && sasUrlRes?.data?.sasUrl) {
      item["media"] = sasUrlRes?.data?.item;
      setMediaItems((previous) => {
        const newState = { ...previous };
        newState[item.localId] = item;
        return newState;
      });

      const abortController = new AbortController();
      const uploadRes = await uploadToStorage({
        sasUrl: sasUrlRes?.data?.sasUrl,
        file: item.file,
        onUploadProgress: (progressEvent) => {
          const currentUploadInfo = {
            ...progressEvent,
            event: undefined,
            cancel: async () => {
              abortController.abort();
              setUploadInfos((previous) => {
                const newState = { ...previous };
                if (newState[item.localId]) {
                  delete newState[item.localId];
                }
                return newState;
              });
              await markMediaAsCanceled({
                mediaIds: [sasUrlRes?.data?.item?.id],
              });
            },
          };
          setUploadInfos((previous) => {
            const newState = { ...previous };
            newState[item.localId] = currentUploadInfo;
            return newState;
          });
        },
        abortController,
      });
      if (uploadRes?.status === 201) {
        return await onMediaUploadSuccess(item);
      } else {
        console.log("Media upload failed");
      }
    }
    return undefined;
  };

  const onMediaUploadSuccess = async (
    item: MediaItem,
  ): Promise<T | undefined> => {
    if (item.media.id) {
      let markRes:
        | {
            data?: {
              items?: Array<Media>;
            };
          }
        | undefined;
      if (mediaUploadSuccessStatus === MediaStatusEnum.TEMP) {
        markRes = await markMediaAsTemp({
          mediaIds: [item.media.id],
        });
      } else if (mediaUploadSuccessStatus === MediaStatusEnum.ACTIVE) {
        markRes = await markMediaAsActive({
          mediaIds: [item.media.id],
        });
      }
      if (markRes?.data?.items?.length && markRes.data.items[0]) {
        const newMedia = markRes.data.items[0];

        item["media"] = newMedia;
        setMediaItems((previous) => {
          const newState = { ...previous };
          newState[item.localId] = item;
          return newState;
        });

        const currentValues: any = {};
        if (item.multiple) {
          currentValues[item.name] = [newMedia.id];
        } else {
          currentValues[item.name] = newMedia.id;
        }
        setValues((previous: T) => {
          const newState: any = { ...previous };
          if (item.multiple) {
            if (Array.isArray(newState[item.name])) {
              newState[item.name].push(currentValues[item.name]);
            } else {
              newState[item.name] = [currentValues[item.name]];
            }
          } else {
            newState[item.name] = currentValues[item.name];
          }
          return newState;
        });
        console.log("Media uploaded successfully");
        return currentValues;
      }
    }
    return undefined;
  };

  const uploadManually = async () => {
    const uploadInfoIds = Object.keys(uploadInfos);
    const mediaItemsToBeUploaded = Object.values(mediaItems).filter(
      (item) => !uploadInfoIds?.includes(item.localId),
    );
    const uploadResponses = await Promise.all(
      mediaItemsToBeUploaded?.map(async (item) => await uploadMediaFile(item)),
    );
    console.log("uploadResponses ->", uploadResponses);
    const result: any = { ...values };
    for (const uploadResponse of uploadResponses.filter(
      (item) => item !== undefined,
    )) {
      for (const key in uploadResponse) {
        if (Array.isArray(result[key])) {
          if (
            Array.isArray(uploadResponse[key]) &&
            uploadResponse[key]?.length
          ) {
            for (const mediaId of uploadResponse[key]) {
              if (!result[key]?.includes(mediaId)) {
                result[key].push(mediaId);
              }
            }
          }
        } else {
          result[key] = uploadResponse[key];
        }
      }
    }
    return result;
  };

  return {
    values,
    setValues,
    enableManualUpload,
    uploadManually,
    mediaItems,
    uploadInfos,
    onFileInputChange,
    onFileChange,
  };
}
