/**
 * Cloudinary upload utility for candidate images
 * Uses the @jmacera/cloudinary-image-upload package
 */

import { handleFileChange } from "@jmacera/cloudinary-image-upload"

export interface CloudinaryUploadOptions {
  cloudinaryUrl: string
  uploadPreset: string
  apiKey: string
}

export interface CloudinaryUploadResult {
  url: string
  originalFile: File
}

/**
 * Upload file to Cloudinary using the package's handleFileChange function
 */
export async function uploadToCloudinary(
  file: File,
  options: CloudinaryUploadOptions
): Promise<CloudinaryUploadResult> {
  const { cloudinaryUrl, uploadPreset, apiKey } = options

  if (!cloudinaryUrl || !uploadPreset || !apiKey) {
    throw new Error('Cloudinary configuration is missing')
  }

  try {
    const uploadedUrl = await handleFileChange(cloudinaryUrl, uploadPreset, apiKey, file)

    if (!uploadedUrl || uploadedUrl.trim() === '') {
      throw new Error('Failed to upload image to Cloudinary - no URL returned')
    }

    return {
      url: uploadedUrl,
      originalFile: file,
    }
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to upload image to Cloudinary')
  }
}
