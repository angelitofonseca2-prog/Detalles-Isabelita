import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Obtener ruta BASE del proyecto (no la del backend)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "../../public/imagenes");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, ROOT);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + path.extname(file.originalname);
    cb(null, unique);
  }
});

const upload = multer({ storage });
export default upload;
