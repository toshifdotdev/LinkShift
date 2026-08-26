import { UploadApiResponse } from "cloudinary";
import { Readable } from "stream";    
import cloudinary from "../config/cloudinary";
import { AppError } from "../errors/AppError";

export type UploadResult = {
    publicId: string;
    url: string;
}

export const uploadImage = async (file: Express.Multer.File, folder: string): Promise<UploadResult> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder : folder,
                resource_type: "image"
            },
            (error, result : UploadApiResponse | undefined) => {
                if(error) {
                    // Surface the real Cloudinary cause — a swallowed error
                    // here made logo uploads impossible to diagnose.
                    console.error("[upload] cloudinary error:", error.message || error);
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
    })

    
}