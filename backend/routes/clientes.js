import express from 'express';
import {
  obtenerClientePublico,
  buscarClientesPublico,
  obtenerClientes,
  obtenerClientePorCedula,
  verificarCliente,
  crearCliente,
  actualizarCliente,
  eliminarCliente
} from '../controllers/clientesController.js';

import { auth } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminOnly.js";

const router = express.Router();

// ADMIN - Listar cliente
router.get('/', auth, adminOnly, obtenerClientes);

// ADMIN - Verificar cliente
router.get('/verificar/:cedula', auth, adminOnly, verificarCliente);

// ADMIN – obtener cliente por cédula
router.get('/:cedula', auth, adminOnly, obtenerClientePorCedula);

// ADMIN - Crear / actualizar / eliminar
router.post('/', auth, adminOnly, crearCliente);
router.put('/:cedula', auth, adminOnly, actualizarCliente);
router.delete('/:cedula', auth, adminOnly, eliminarCliente);

// 🔓 PUBLICA – usada en checkout
router.get("/publico/busqueda/:termino", buscarClientesPublico);
router.get("/publico/:cedula", obtenerClientePublico);
router.post("/publico", crearCliente);


export default router;
