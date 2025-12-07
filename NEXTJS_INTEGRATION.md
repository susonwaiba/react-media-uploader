# NextJS Integration

## Prisma schema

```text
enum MediaStatusEnum {
  INIT
  TEMP
  ACTIVE
  INACTIVE
  CANCELED
  DELETED
}

enum MediaTypeEnum {
  IMAGE
  PDF
  DOCS
  OTHER
}

model Media {
  id          String          @id @default(cuid())
  status      MediaStatusEnum @default(INIT)
  type        MediaTypeEnum
  title       String
  description String?
  name        String
  dir         String?
  path        String
  provider    String
  container   String?
  mimeType    String?
  size        Float?
  height      Float?
  width       Float?
  duration    Float?
  tags        String[]        @default([])
  checksum    String?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @default(now()) @updatedAt
  deletedAt   DateTime?
}
```

## API endpoints

- POST: `/api/media/generate-upload-url`

Payload:

```json
{
    "type": "IMAGE",
    "name": "screenshot.jpeg",
    "mimeType": "image/jpeg",
    "size": 40868,
    "checksum": "b745eb078c31eaa2ef5d87f772bbf37d78528d3c"
}
```

Response:

```json
{
    "item": {},
    "uploadUrl": "<upload_url_with_token>"
}
```

- POST: `/api/media/mark-media-as-active`

Payload:

```json
{
    "mediaIds": []
}
```

Response:

```json
{
    "items": []
}
```

- POST: `/api/media/mark-media-as-canceled`

Payload:

```json
{
    "mediaIds": []
}
```

Response:

```json
{
    "items": []
}
```

- POST: `/api/media/mark-media-as-temp`

Payload:

```json
{
    "mediaIds": []
}
```

Response:

```json
{
    "items": []
}
```

## Storage cleanup

Run cron and filter with status for unused media cleanup.

