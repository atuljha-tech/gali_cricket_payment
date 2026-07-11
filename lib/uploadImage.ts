export type UploadFolder = 'gallery' | 'qr'

export interface UploadedImage {
  url: string
  thumbnailUrl: string
  publicId: string
  width: number
  height: number
  bytes: number
}

const MAX_FILE_BYTES = 15 * 1024 * 1024 // Cloudinary free-tier friendly ceiling

/**
 * Uploads a single image file directly from the browser to Cloudinary
 * (bypassing our own server entirely, so there's no Vercel body-size limit
 * and no giant base64 string ever touches MongoDB). Only the resulting
 * secure URL + metadata should be persisted afterwards.
 */
export async function uploadToCloudinary(
  file: File,
  folder: UploadFolder,
  onProgress?: (pct: number) => void
): Promise<UploadedImage> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`Image is too large (max ${Math.round(MAX_FILE_BYTES / (1024 * 1024))}MB)`)
  }

  const sigRes = await fetch('/api/upload/signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder }),
  })

  if (!sigRes.ok) {
    const d = await sigRes.json().catch(() => ({}))
    throw new Error(d.error || 'Could not authorize upload')
  }

  const { signature, timestamp, folder: fullFolder, apiKey, cloudName } = await sigRes.json()

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', apiKey)
  formData.append('timestamp', String(timestamp))
  formData.append('signature', signature)
  formData.append('folder', fullFolder)

  const data = await new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) resolve(json)
        else reject(new Error(json?.error?.message || `Upload failed (${xhr.status})`))
      } catch {
        reject(new Error('Upload failed — invalid response from image host'))
      }
    }

    xhr.onerror = () => reject(new Error('Network error while uploading image'))
    xhr.send(formData)
  })

  // Cloudinary on-the-fly transformation for a fast-loading thumbnail —
  // no separate upload or storage needed, it's generated from the same asset.
  const thumbnailUrl = String(data.secure_url).replace('/upload/', '/upload/w_400,h_400,c_fill,q_auto,f_auto/')

  return {
    url: data.secure_url,
    thumbnailUrl,
    publicId: data.public_id,
    width: data.width,
    height: data.height,
    bytes: data.bytes,
  }
}
