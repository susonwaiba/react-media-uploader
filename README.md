# React Media Uploader

`Status: Under development`

## Quick start

```bash
bun install

bun run build
```

## `useMediaUploader()` hook

#### Upload on select

```typescript
export function Uploader() {
  const uploader = useMediaUploader();
  return (
    <input
      name="image"
      type="file"
      multiple
      onChange={uploader.onFileInputChange}
    />
  );
}
```

#### Manual upload

```typescript
export function Uploader() {
  const uploader = useMediaUploader({
    enableManualUpload: true,
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
