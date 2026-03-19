const userModel = require('../models/userModel');

const getProfile = async (req, res) => {
  try {
    // req.user viene del middleware authenticateToken
    const user = await userModel.findUserByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    // No devolvemos el hash de la contraseña
    const { password_hash, ...safeUser } = user;
    res.json({
      message: 'Perfil de usuario',
      user: safeUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { getProfile };