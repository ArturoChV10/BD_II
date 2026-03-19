const userModel = require('../models/userModel');
const bcrypt = require('bcrypt');

const getProfile = async (req, res) => {
  try {
    // req.user viene del middleware authenticateToken
    const user = await userModel.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const { password_hash, ...safeUser } = user;
    res.json({ message: 'Perfil de usuario', user: safeUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userModel.findUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const { password_hash, ...safeUser } = user;
    res.json({ message: 'Usuario encontrado', user: safeUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.getAllUsers();
    res.json({ message: 'Usuarios obtenidos', users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, restaurantId } = req.body;

    // Verificar que el usuario exista
    const existingUser = await userModel.findUserById(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Autorización: solo el propio usuario o un admin pueden modificar
    if (req.user.id !== parseInt(id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para modificar este usuario' });
    }

    const fields = {};
    if (name) fields.name = name;
    if (email) {
      // Verificar que el email no esté en uso por otro usuario
      const userWithEmail = await userModel.findUserByEmail(email);
      if (userWithEmail && userWithEmail.id !== parseInt(id)) {
        return res.status(400).json({ error: 'El email ya está en uso' });
      }
      fields.email = email;
    }
    if (password) {
      fields.password_hash = await bcrypt.hash(password, 10);
    }

    if (req.user.role === 'admin') {
      if (role) fields.role = role;
      if (restaurantId) fields.restaurant_id = restaurantId;
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    const updatedUser = await userModel.updateUser(id, fields);
    const { password_hash, ...safeUser } = updatedUser;
    res.json({ message: 'Usuario actualizado', user: safeUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Solo admin puede eliminar usuarios
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para eliminar usuarios' });
    }

    const deleted = await userModel.deleteUser(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getProfile,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser
};