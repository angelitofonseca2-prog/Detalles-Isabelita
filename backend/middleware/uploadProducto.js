import { v2 as cloudinary } from "cloudinary";
import createCloudinaryStorage from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

// Configuración Cloudinary
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

// Configuración del storage (el paquete exporta una función, no la clase)
const storage = createCloudinaryStorage({
  cloudinary,
  params: {
    folder: "floreria_productos",
    allowed_formats: ["jpg", "jpeg", "png"],
    public_id: (req, file) => {
      const name = file.originalname.split(".")[0];
      return `producto_${name}_${Date.now()}`;
    },
    resource_type: "image",
  },
});

// Exportar middleware
const uploadProducto = multer({ storage, fileFilter });

export default uploadProducto;
