import {
  markMediaAsCanceled,
  generateFileHash,
  generateUploadUrl,
  uploadToStorage,
  markMediaAsTemp,
  markMediaAsActive,
  generateMediaType,
  getMediaImageDimension,
} from "@/lib/media-helper";
import {
  type Media,
  MediaStatusEnum,
  type MediaItem,
  MediaTypeEnum,
} from "@/types/media";
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
  serverConfig?: {
    additionalHeaders?: Record<string, string>;
    generateUploadUrl?: string;
    onGenerateUploadUrl?: (
      media: Partial<Media>,
    ) => Promise<{ item: Media; uploadUrl: string }>;
    markMediaAsTemp?: string;
    onMarkMediaAsTemp?: (
      mediaIds: (string | number)[],
    ) => Promise<Partial<Media>[]>;
    markMediaAsActive?: string;
    onMarkMediaAsActive?: (
      mediaIds: (string | number)[],
    ) => Promise<Partial<Media>[]>;
    markMediaAsCanceled?: string;
    onMarkMediaAsCanceled?: (
      mediaIds: (string | number)[],
    ) => Promise<Partial<Media>[]>;
  };
  onUploadSuccess?: (currentValues: any) => Promise<void>;
  onUploadFailure?: (uploadRes: any) => Promise<void>;
}

export interface UseMediaUploaderResponse<T extends object> {
  values: T;
  setValues: (val: T) => void;
  enableManualUpload?: boolean;
  uploadManually: () => Promise<T>;
  mediaItems: Record<string, MediaItem>;
  setMediaItems: (items: Record<string, MediaItem>) => void;
  uploadInfos: Record<string, UploadMediaInfo>;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onFileChange: (file: File, name: string, multiple?: boolean) => Promise<void>;
}

export function useMediaUploader<T extends object>({
  defaultValues,
  mediaUploadSuccessStatus = MediaStatusEnum.TEMP,
  enableManualUpload = false,
  serverConfig,
  onUploadSuccess,
  onUploadFailure,
}: UseMediaUploaderProps<T> = {}): UseMediaUploaderResponse<T> {
  const [values, setValues] = useState<T>(defaultValues ?? ({} as T));
  const [mediaItems, setMediaItems] = useState<Record<string, MediaItem>>({});
  const [uploadInfos, setUploadInfos] = useState<
    Record<string, UploadMediaInfo>
  >({});

  const onFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    const mediaType = await generateMediaType(file);
    let tempPreviewUrl: string | undefined = undefined;
    let tempHeight: number | undefined = undefined;
    let tempWidth: number | undefined = undefined;
    if (mediaType === MediaTypeEnum.IMAGE) {
      tempPreviewUrl = URL.createObjectURL(file);
      try {
        const tempDimension = await getMediaImageDimension(tempPreviewUrl);
        tempHeight = tempDimension.height;
        tempWidth = tempDimension.width;
      } catch (e) {
        console.log("Error while generating media image dimension ->", e);
      }
    }
    const item: MediaItem = {
      localId,
      name,
      multiple,
      file,
      tempPreviewUrl,
      media: {
        type: mediaType,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        height: tempHeight,
        width: tempWidth,
        checksum: await generateFileHash(file),
      },
    };
    setMediaItems((previous) => {
      const newState = { ...previous };
      newState[localId] = item;
      return newState;
    });
    setValues((previous) => {
      const newState = { ...previous };
      newState[name] = tempPreviewUrl;
      return newState;
    });
    if (!enableManualUpload) {
      await uploadMediaFile(item);
    }
  };

  const uploadMediaFile = async (item: MediaItem): Promise<T | undefined> => {
    let uploadData:
      | {
          item: Media;
          uploadUrl: string;
        }
      | undefined;
    if (serverConfig?.onGenerateUploadUrl) {
      uploadData = await serverConfig?.onGenerateUploadUrl(item?.media);
    } else {
      const uploadUrlRes = await generateUploadUrl({
        url: serverConfig?.generateUploadUrl,
        additionalHeaders: serverConfig?.additionalHeaders,
        media: item?.media,
      });
      uploadData = uploadUrlRes.data;
    }
    if (uploadData?.item && uploadData?.uploadUrl) {
      item["media"] = uploadData?.item;
      setMediaItems((previous) => {
        const newState = { ...previous };
        newState[item.localId] = item;
        return newState;
      });

      const abortController = new AbortController();
      const uploadRes = await uploadToStorage({
        uploadUrl: uploadData?.uploadUrl,
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
              if (serverConfig?.markMediaAsCanceled) {
                await markMediaAsCanceled({
                  url: serverConfig?.markMediaAsCanceled,
                  additionalHeaders: serverConfig?.additionalHeaders,
                  mediaIds: [uploadData?.item?.id],
                });
              } else if (serverConfig?.onMarkMediaAsCanceled) {
                await serverConfig.onMarkMediaAsCanceled([
                  uploadData?.item?.id,
                ]);
              }
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
      if (uploadRes?.status === 201 || uploadRes?.status === 200) {
        return await onMediaUploadSuccess(item);
      } else if (onUploadFailure) {
        await onUploadFailure(uploadRes);
      }
    }
    return undefined;
  };

  const onMediaUploadSuccess = async (
    item: MediaItem,
  ): Promise<T | undefined> => {
    if (item.media.id) {
      let markResItems: Partial<Media>[] = [];
      if (mediaUploadSuccessStatus === MediaStatusEnum.TEMP) {
        if (serverConfig?.onMarkMediaAsTemp) {
          markResItems = await serverConfig.onMarkMediaAsTemp([item.media.id]);
        } else {
          const res = await markMediaAsTemp({
            url: serverConfig?.markMediaAsTemp,
            additionalHeaders: serverConfig?.additionalHeaders,
            mediaIds: [item.media.id],
          });
          if (res?.data?.items?.length) {
            markResItems = res.data.items;
          }
        }
      } else if (mediaUploadSuccessStatus === MediaStatusEnum.ACTIVE) {
        if (serverConfig.onMarkMediaAsActive) {
          markResItems = await serverConfig.onMarkMediaAsActive([
            item.media.id,
          ]);
        } else {
          const res = await markMediaAsActive({
            url: serverConfig?.markMediaAsActive,
            additionalHeaders: serverConfig?.additionalHeaders,
            mediaIds: [item.media.id],
          });
          if (res?.data?.items?.length) {
            markResItems = res.data.items;
          }
        }
      }
      if (markResItems?.length) {
        const newMedia = markResItems[0];

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
        if (onUploadSuccess) {
          await onUploadSuccess(currentValues);
        }
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
    setMediaItems,
    uploadInfos,
    onFileInputChange,
    onFileChange,
  };
}
