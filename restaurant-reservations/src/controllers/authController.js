const { userDao, restaurantDao } = require('../daos/factory');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
  try {
    let { name, email, password, role, restaurantName, restaurantCode } = req.body;

    // Normalizar datos
    name = name?.trim();
    email = email?.trim().toLowerCase();
    role = role?.trim().toLowerCase();
    
    // Validaciones básicas
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y password son obligatorios' });
    }

    if (password.length < 8) {
      return res.status(400).json({error: 'La contraseña debe tener al menos 8 caracteres'});
    }

    if (role && !['client', 'admin'].includes(role)) {
      return res.status(400).json({error: 'El rol enviado no es válido'});
    }
    
    // Verificar si el usuario ya existe
    const existingUser = await userDao.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Por defecto, cualquier registro nuevo será cliente
    let finalRole = 'client';
    let restaurantId = null;

    // Si intenta registrarse como admin, validar local + código del local
    if (role === 'admin') {
      if (!restaurantName || !restaurantCode) {
        return res.status(400).json({
          error: 'Para registrarse como administrador debe indicar el local y su código de seguridad'});
      }

      const restaurant = await restaurantDao.findRestaurantByName(restaurantName.trim());

      if (!restaurant) {
        return res.status(404).json({
          error: 'El local indicado no existe'});
      }

      // Comparar el código ingresado con el hash guardado del local
      const codeMatches = await bcrypt.compare(
        restaurantCode,
        restaurant.admin_code_hash);

      if (!codeMatches) {
        return res.status(401).json({
          error: 'El código de seguridad del local es incorrecto'});
      }

      // Evitar que el mismo local tenga varios admins si así lo quieren manejar
      const restaurantAlreadyHasAdmin = await userDao.findAdminByRestaurantId(restaurant.id);

      if (restaurantAlreadyHasAdmin) {
        return res.status(409).json({
          error: 'Ese local ya tiene un administrador registrado'});
      }

      finalRole = 'admin';
      restaurantId = restaurant.id;
    }

    const newUser = await userDao.create(
      name,
      email,
      password,
      finalRole,
      restaurantId
    );

    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        restaurantId: newUser.restaurant_id || restaurantId || null
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        restaurantId: newUser.restaurant_id || restaurantId || null
      },
      token
    });
  } 
  catch (error) {
    console.error(error);
    res.status(500).json({error: 'Error interno del servidor'});
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password son obligatorios' });
    }

    const user = await userDao.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurant_id || null
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login exitoso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurant_id || null
      },
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { register, login };
