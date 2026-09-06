import { UploadApiResponse } from "cloudinary";
import { Readable } from "stream";
import cloudinary from "../config/cloudinary";
import { AppError } from "../errors/AppError";
import { withRetry } from "./retry";
import { log } from "./logger";

export type UploadResult = {
    publicId: string;
    url: string;
}

const performUpload = (file: Express.Multer.File, folder: string): Promise<UploadResult> =>
    new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder : folder,
                resource_type: "image"
            },
            (error, result : UploadApiResponse | undefined) => {
                if(error) {
                    // Surface the real Cloudinary cause — a swallowed error
                    // here made logo uploads impossible to diagnose.
                    return reject(new AppError(`Image upload failed: ${error.message || "unknown error"}`, 502));
                }
                if (!result) {
                    return reject(new Error("Unknown error: Cloudinary returned no result."));
                }

                resolve({
                    publicId : result.public_id,
                    url : result.secure_url
                })

            }
        )
         Readable.from(file.buffer).pipe(uploadStream);
    });

export const uploadImage = async (file: Express.Multer.File, folder: string): Promise<UploadResult> => {
    try {
        return await withRetry("uploadImage", () => performUpload(file, folder));
    } catch (err) {
        if (err instanceof AppError) {
            log.error("cloudinary_upload_failed", { message: err.message });
        }
        throw err;
    }
};