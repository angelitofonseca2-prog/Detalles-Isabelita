import cloudinary from "cloudinary";
import createCloudinaryStorage from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

// Configuración Cloudinary (multer-storage-cloudinary usa cloudinary.v2.uploader)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Filtro de archivos permitidos
const fileFilter = (req, file, cb) => {
  const allowed = ["jpeg", "jpg", "png"];
  const ext = file.originalname.toLowerCase().split(".").pop();

  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten imágenes JPG o PNG"), false);
  }
};

// Configuración del storage - params como función para que public_id sea un string resuelto
const storage = createCloudinaryStorage({
  cloudinary,
  params: (req, file, cb) => {
    const name = (file.originalname || "file").split(".")[0].replace(/\W/g, "_");
    cb(null, {
      folder: "floreria_productos",
      allowed_formats: ["jpg", "jpeg", "png"],
      resource_type: "image",
      public_id: `producto_${name}_${Date.now()}`,
    });
  },
});

// Exportar middleware
const uploadProducto = multer({ storage, fileFilter });

export default uploadProducto;
