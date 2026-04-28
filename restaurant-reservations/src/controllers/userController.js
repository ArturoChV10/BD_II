const { userDao } = require("../daos/factory");
const bcrypt = require("bcrypt");

const getProfile = async (req, res) => {
  try {
    const user = await userDao.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const { password_hash, ...safeUser } = user;
    res.json({ message: "Perfil de usuario", user: safeUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userDao.findById(id);

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const { password_hash, ...safeUser } = user;
    res.json({ message: "Usuario encontrado", user: safeUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await userDao.findAll();
    res.json({ message: "Usuarios obtenidos", users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, restaurantId } = req.body;

    const existingUser = await userDao.findById(id);

    if (!existingUser) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (req.user.id !== parseInt(id) && req.user.role !== "admin") {
      return res.status(403).json({ error: "No tienes permiso para modificar este usuario" });
    }

    const fields = {};

    if (name) {
      fields.name = name;
    }

    if (email) {
      const userWithEmail = await userDao.findByEmail(email);

      if (userWithEmail && userWithEmail.id !== parseInt(id)) {
        return res.status(400).json({ error: "El email ya está en uso" });
      }

      fields.email = email;
    }

    if (password) {
      fields.password_hash = await bcrypt.hash(password, 10);
    }

    if (req.user.role === "admin") {
      if (role) {
        fields.role = role;
      }

      if (restaurantId) {
        fields.restaurant_id = restaurantId;
      }
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: "No hay campos para actualizar" });
    }

    const updatedUser = await userDao.update(id, fields);
    const { password_hash, ...safeUser } = updatedUser;

    res.json({ message: "Usuario actualizado", user: safeUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "No tienes permiso para eliminar usuarios" });
    }

    const deleted = await userDao.deleteUser(id);

    if (!deleted) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = {
  getProfile,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser
};
