// 📂 backend/middleware/uploadComprobanteCloud.js

import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import createCloudinaryStorage from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

// 🔧 Configuración de Cloudinary
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


// ☁️ Storage Cloudinary (el paquete exporta una función, no la clase)
const storage = createCloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "floreria_comprobantes", // carpeta en Cloudinary
        allowed_formats: ["jpg", "jpeg", "png", "pdf"],
        public_id: (req, file) => {
            const timestamp = Date.now();
            const original = file.originalname.split(".")[0];
            return `comprobante_${original}_${timestamp}`;
        },
        resource_type: "auto", // permite PDF también
    },
});

// 🚀 Middleware final
const uploadComprobanteCloud = multer({
    storage,
    fileFilter,
});

export default uploadComprobanteCloud;
