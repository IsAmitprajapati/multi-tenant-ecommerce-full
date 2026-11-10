import { sellerPortalApi as sellerApi, type UploadKind } from '@/api/seller-portal'
import { getAxiosErrorMessage } from './api.error'

const UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload'

export interface UploadedFile {
    fileId: string
    name: string
    url: string
    filePath: string
}

export class UploadError extends Error { }

/**
 * Uploads a file straight from the browser to ImageKit — it never touches our API server.
 * Our API only signs the request (`/sellers/upload-auth`) and later verifies the fileId.
 */
export async function uploadToImageKit(
    kind: UploadKind,
    file: File,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal
): Promise<UploadedFile> {
    let auth
    try {
        auth = (await sellerApi.uploadAuth(kind)).data
    } catch (err) {
        throw new UploadError(getAxiosErrorMessage(err, 'Could not start the upload'))
    }

    if (!auth.allowedMimeTypes.includes(file.type)) {
        const exts = auth.allowedMimeTypes.map(m => m.split('/')[1].toUpperCase().replace('JPEG', 'JPG')).join(', ')
        throw new UploadError(`Unsupported file type. Use ${exts}.`)
    }
    if (file.size > auth.maxBytes) {
        throw new UploadError(`File is larger than ${Math.round(auth.maxBytes / 1024 / 1024)} MB`)
    }

    const form = new FormData()
    form.append('file', file)
    form.append('fileName', file.name)
    form.append('publicKey', auth.publicKey)
    form.append('signature', auth.signature)
    form.append('expire', String(auth.expire))
    form.append('token', auth.token)
    form.append('folder', auth.folder)
    form.append('useUniqueFileName', 'true')
    form.append('isPrivateFile', String(auth.isPrivateFile))

    return new Promise<UploadedFile>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', UPLOAD_URL)
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => {
            let body: any = null
            try { body = JSON.parse(xhr.responseText) } catch { /* ignore */ }
            if (xhr.status >= 200 && xhr.status < 300 && body?.fileId) {
                resolve({ fileId: body.fileId, name: body.name, url: body.url, filePath: body.filePath })
            } else {
                reject(new UploadError(body?.message ?? 'Upload failed'))
            }
        }
        xhr.onerror = () => reject(new UploadError('Network error while uploading'))
        xhr.onabort = () => reject(new UploadError('Upload cancelled'))
        signal?.addEventListener('abort', () => xhr.abort())
        xhr.send(form)
    })
}
