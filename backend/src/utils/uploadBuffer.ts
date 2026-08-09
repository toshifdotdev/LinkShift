import { UploadApiResponse } from "cloudinary";
import { Readable } from "stream";    
import cloudinary from "../config/cloudinary";
import { AppError } from "../errors/AppError";

export type UploadResult = {
    publicId: string;
    url: string;
}

export const uploadBuffer = async (buffer : Buffer, folder: string): Promise<UploadResult> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder : folder,
                resource_type: "image"
            },
            (error, result : UploadApiResponse | undefined) => {
                if(error) {
                    return reject(new AppError("Failed to upload image.", 500));
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
         Readable.from(buffer).pipe(uploadStream);
    })

    
}