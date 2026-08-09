import cloudinary from "../config/cloudinary"

export const deleteImage = async(publicId : string) => {
    await cloudinary.uploader.destroy(publicId, {
        resource_type :"image"
    })
}