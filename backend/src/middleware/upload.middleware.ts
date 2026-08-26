import multer from "multer";
import { AppError } from "../errors/AppError";

const storage = multer.memoryStorage();

const fileFilter : multer.Options["fileFilter"] = (req, file, cb) => {
    const allowedMimeTypes = new Set([
        "image/png",
        "image/jpeg",
        "image/jpg", // Windows quirk: some sources report image/jpg
        "image/webp",
        "image/svg+xml"
    ]);

    if (allowedMimeTypes.has(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError("Only image files are allowed.", 400));
    }
};

export const imageUpload = multer({
    storage,
    fileFilter,
    limits : {
        fileSize : 2 * 1024 * 1024
    }
})
