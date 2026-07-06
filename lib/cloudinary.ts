/**
 * Cloudinary v1 helper (Node.js / API routes only — not Edge)
 * Images are stored under the "goc_gallery" folder.
 */
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key:    process.env.CLOUDINARY_API_KEY    as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
})

/**
 * Upload a base64 data-URL to Cloudinary.
 * Returns the secure URL and public_id.
 */
export async function uploadToCloudinary(
  base64DataUrl: string,
  folder = 'goc_gallery'
): Promise<{ url: string; publicId: string; thumbnailUrl: string }> {
  const result = await cloudinary.uploader.upload(base64DataUrl, {
    folder,
    // Auto-generate a thumbnail transformation
    transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto', fetch_format: 'auto' }],
    resource_type: 'image',
  })

  // Build a 400px thumbnail URL via Cloudinary transformations
  const thumbnailUrl = cloudinary.url(result.public_id, {
    width: 400, height: 400,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto',
    secure: true,
  })

  return {
    url:          result.secure_url,
    publicId:     result.public_id,
    thumbnailUrl,
  }
}

/**
 * Delete an image from Cloudinary by its public_id.
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  if (!publicId) return
  await cloudinary.uploader.destroy(publicId)
}
