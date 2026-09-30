import multer from "multer";
import { AppError } from "../errors/AppError";
import { assertImageMatchesDeclaredType } from "../utils/imageContent";

const storage = multer.memoryStorage();

const fileFilter : multer.Options["fileFilter"] = (req, file, cb) => {
    const allowedMimeTypes = new Set([
        "image/png",
        "image/jpeg",
        "image/jpg", // Windows quirk: some sources report image/jpg
        "image/webp",
        "image/svg+xml"
    ]);

    if (!allowedMimeTypes.has(file.mimetype)) {
        cb(new AppError("Only image files are allowed.", 400));
        return;
    }

    // file.mimetype comes from the client and proves nothing. Confirm the
    // bytes actually are that image type before anything is stored.
    try {
        assertImageMatchesDeclaredType(file.buffer, file.mimetype);
        cb(null, true);
    } catch (err) {
        cb(err instanceof AppError ? err : new AppError("Invalid image file.", 400));
    }
};

export const imageUpload = multer({
    storage,
    fileFilter,
    limits : {
        fileSize : 2 * 1024 * 1024
    }
})
