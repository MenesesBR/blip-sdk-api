const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');

// Importar todas as rotas aqui
const healthRoutes = require('./healthRoutes');
const blipRoutes = require('./blipRoutes');
const authRoutes = require('./auth.routes');

// Rotas públicas
router.use('/auth', authRoutes);

// Middleware de autenticação para rotas protegidas
router.use(authMiddleware);

// Rotas protegidas
router.use('/health', healthRoutes);
router.use('/blip', blipRoutes);

module.exports = router; 