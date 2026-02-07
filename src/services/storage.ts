import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * Storage service for managing photos using Capacitor Filesystem
 */

const PHOTO_DIRECTORY = 'pregnancy-photos';
const FILES_DIRECTORY = 'pregnancy-files';

export const storageService = {
    /**
     * Initialize photo directory
     */
    async initializeStorage(): Promise<void> {
        try {
            await Filesystem.mkdir({
                path: PHOTO_DIRECTORY,
                directory: Directory.Data,
                recursive: true,
            });
        } catch (error) {
            // Directory might already exist, ignore error
            console.log('Photo directory already exists or created');
        }
    },

    /**
     * Save a photo from base64 data
     */
    async savePhoto(
        base64Data: string,
        photoId: string,
        createThumbnail = true
    ): Promise<{ filepath: string; thumbnail?: string }> {
        await this.initializeStorage();

        // Remove data URL prefix if present
        const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

        // Save original photo
        const filepath = `${PHOTO_DIRECTORY}/${photoId}.jpg`;
        await Filesystem.writeFile({
            path: filepath,
            data: base64,
            directory: Directory.Data,
        });

        let thumbnail: string | undefined;

        // Create thumbnail if requested
        if (createThumbnail) {
            try {
                const thumbnailData = await this.createThumbnail(base64);
                const thumbnailPath = `${PHOTO_DIRECTORY}/${photoId}_thumb.jpg`;
                await Filesystem.writeFile({
                    path: thumbnailPath,
                    data: thumbnailData,
                    directory: Directory.Data,
                });
                thumbnail = thumbnailPath;
            } catch (error) {
                console.error('Failed to create thumbnail:', error);
            }
        }

        return { filepath, thumbnail };
    },

    /**
     * Read a photo and return as base64
     */
    async readPhoto(filepath: string): Promise<string> {
        const result = await Filesystem.readFile({
            path: filepath,
            directory: Directory.Data,
        });
        return `data:image/jpeg;base64,${result.data}`;
    },

    /**
     * Delete a photo
     */
    async deletePhoto(filepath: string, thumbnailPath?: string): Promise<void> {
        try {
            await Filesystem.deleteFile({
                path: filepath,
                directory: Directory.Data,
            });

            if (thumbnailPath) {
                await Filesystem.deleteFile({
                    path: thumbnailPath,
                    directory: Directory.Data,
                });
            }
        } catch (error) {
            console.error('Failed to delete photo:', error);
        }
    },

    /**
     * Create a thumbnail from base64 image data
     * This is a simple implementation - in production, you might want to use a library
     */
    async createThumbnail(base64Data: string, maxSize = 200): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > height) {
                    if (width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Get base64 without data URL prefix
                const thumbnailData = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
                resolve(thumbnailData);
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = `data:image/jpeg;base64,${base64Data}`;
        });
    },

    /**
     * Get file URI for displaying in img tags
     */
    async getPhotoUri(filepath: string): Promise<string> {
        const result = await Filesystem.getUri({
            path: filepath,
            directory: Directory.Data,
        });
        return result.uri;
    },

    /**
     * Save a file from base64 data or File object
     */
    async saveFile(
        data: string | File,
        fileId: string,
        fileName: string,
        mimeType: string
    ): Promise<{ filepath: string; thumbnail?: string }> {
        await this.initializeFileStorage();

        let base64Data: string;
        let extension = fileName.split('.').pop() || 'bin';

        if (typeof data === 'string') {
            // Remove data URL prefix if present
            base64Data = data.replace(/^data:[^;]+;base64,/, '');
        } else {
            // Convert File to base64
            base64Data = await this.fileToBase64(data);
        }

        // Save file
        const filepath = `${FILES_DIRECTORY}/${fileId}.${extension}`;
        await Filesystem.writeFile({
            path: filepath,
            data: base64Data,
            directory: Directory.Data,
        });

        let thumbnail: string | undefined;

        // Create thumbnail for images
        if (mimeType.startsWith('image/')) {
            try {
                const thumbnailData = await this.createThumbnail(base64Data);
                const thumbnailPath = `${FILES_DIRECTORY}/${fileId}_thumb.jpg`;
                await Filesystem.writeFile({
                    path: thumbnailPath,
                    data: thumbnailData,
                    directory: Directory.Data,
                });
                thumbnail = thumbnailPath;
            } catch (error) {
                console.error('Failed to create thumbnail:', error);
            }
        }

        return { filepath, thumbnail };
    },

    /**
     * Initialize file directory
     */
    async initializeFileStorage(): Promise<void> {
        try {
            await Filesystem.mkdir({
                path: FILES_DIRECTORY,
                directory: Directory.Data,
                recursive: true,
            });
        } catch (error) {
            console.log('File directory already exists or created');
        }
    },

    /**
     * Convert File object to base64
     */
    async fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                // Remove data URL prefix
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    /**
     * Read a file and return as base64 data URL
     */
    async readFile(filepath: string, mimeType: string): Promise<string> {
        const result = await Filesystem.readFile({
            path: filepath,
            directory: Directory.Data,
        });
        return `data:${mimeType};base64,${result.data}`;
    },

    /**
     * Delete a file
     */
    async deleteFile(filepath: string, thumbnailPath?: string): Promise<void> {
        try {
            await Filesystem.deleteFile({
                path: filepath,
                directory: Directory.Data,
            });

            if (thumbnailPath) {
                await Filesystem.deleteFile({
                    path: thumbnailPath,
                    directory: Directory.Data,
                });
            }
        } catch (error) {
            console.error('Failed to delete file:', error);
        }
    },

    /**
     * Get file URI for displaying/downloading
     */
    async getFileUri(filepath: string): Promise<string> {
        const result = await Filesystem.getUri({
            path: filepath,
            directory: Directory.Data,
        });
        return result.uri;
    },
};
