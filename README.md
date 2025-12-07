# React Media Uploader

`Status: Under development`

## Quick start

```bash
bun install

bun run build
```

## Hook

#### Upload on select

```typescript
"use client";

import { useMediaUploader } from "@susonwaiba/react-media-uploader";

export function Uploader() {
  const uploader = useMediaUploader();
  return (
    <input
      name="image"
      type="file"
      onChange={uploader.onFileInputChange}
    />
  );
}
```

#### Manual upload

```typescript
"use client";

import { useMediaUploader, MediaStatusEnum } from "@susonwaiba/react-media-uploader";

export function ManualUploader() {
  const uploader = useMediaUploader({
    enableManualUpload: true,
    // Update media status to ACTIVE status on success
    mediaUploadSuccessStatus: MediaStatusEnum.ACTIVE,
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mediaValues = await uploader.uploadManually();
    console.log("mediaValues ->", mediaValues);
    // submit data to API
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="mb-4">
        <input
          name="image"
          type="file"
          multiple
          onChange={uploader.onFileInputChange}
        />
      </div>
      <div>
        <button type="submit">Upload</button>
      </div>
    </form>
  );
}
```

#### UseMediaUploaderProps

```typescript
export interface UseMediaUploaderProps<T extends object> {
  defaultValues?: T;
  mediaUploadSuccessStatus?: MediaStatusEnum;
  enableManualUpload?: boolean;
  serverConfig?: {
    additionalHeaders?: Record<string, string>;
    generateUploadUrl?: string;
    markMediaAsTemp?: string;
    markMediaAsActive?: string;
    markMediaAsCanceled?: string;
  };
  onUploadSuccess?: (currentValues: any) => Promise<void>;
  onUploadFailure?: (uploadRes: any) => Promise<void>;
}
```

#### UseMediaUploaderResponse

```typescript
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
```
