// 📂 backend/middleware/uploadComprobanteCloud.js

import multer from "multer";
import cloudinary from "cloudinary";
import createCloudinaryStorage from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

// 🔧 Configuración de Cloudinary (multer-storage-cloudinary usa cloudinary.v2.uploader)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 🔐 Filtro de archivos permitido (se mantiene igual que tu versión anterior)
const fileFilter = (req, file, cb) => {
    const allowed = ["jpeg", "jpg", "png", "pdf"];
    const ext = file.originalname.toLowerCase().split(".").pop();

    if (allowed.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error("Solo se permiten imágenes (jpg, png) o PDF"), false);
    }
};


// ☁️ Storage Cloudinary - params como función para que public_id sea un string resuelto
const storage = createCloudinaryStorage({
    cloudinary: cloudinary,
    params: (req, file, cb) => {
        const original = (file.originalname || "file").split(".")[0].replace(/\W/g, "_");
        cb(null, {
            folder: "floreria_comprobantes",
            allowed_formats: ["jpg", "jpeg", "png", "pdf"],
            resource_type: "auto",
            public_id: `comprobante_${original}_${Date.now()}`,
        });
    },
});

// 🚀 Middleware final
const uploadComprobanteCloud = multer({
    storage,
    fileFilter,
});

export default uploadComprobanteCloud;
