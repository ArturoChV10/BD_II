const getMenu = async (req, res) => {
  try {
    // Opciones básicas que cualquier usuario autenticado puede ver
    const baseSections = [
      {
        id: "account",
        title: "Cuenta",
        items: [
          {
            id: "my-profile",
            label: "Ver mi perfil",
            method: "GET",
            path: "/users/me",
            description: "Muestra la información del usuario que inició sesión"
          },
          {
            id: "edit-my-profile",
            label: "Editar mi perfil",
            method: "PUT",
            path: `/users/${req.user.id}`,
            description: "Permite actualizar los datos del usuario autenticado"
          }
        ]
      },
      {
        id: "restaurants",
        title: "Restaurantes",
        items: [
          {
            id: "list-restaurants",
            label: "Ver restaurantes",
            method: "GET",
            path: "/restaurants",
            description: "Lista los restaurantes registrados en el sistema"
          }
        ]
      }
    ];

    // Opciones extra solo para administradores
    const adminSections = [
      {
        id: "users-admin",
        title: "Administración de usuarios",
        items: [
          {
            id: "list-users",
            label: "Listar usuarios",
            method: "GET",
            path: "/users",
            description: "Obtiene la lista completa de usuarios"
          },
          {
            id: "get-user-by-id",
            label: "Ver usuario por ID",
            method: "GET",
            path: "/users/:id",
            description: "Consulta un usuario específico usando su ID"
          },
          {
            id: "update-user",
            label: "Actualizar usuario",
            method: "PUT",
            path: "/users/:id",
            description: "Permite modificar los datos de cualquier usuario"
          },
          {
            id: "delete-user",
            label: "Eliminar usuario",
            method: "DELETE",
            path: "/users/:id",
            description: "Elimina un usuario del sistema"
          }
        ]
      },
      {
        id: "restaurants-admin",
        title: "Administración de restaurantes",
        items: [
          {
            id: "create-restaurant",
            label: "Crear restaurante",
            method: "POST",
            path: "/restaurants",
            description: "Permite registrar un nuevo restaurante"
          }
        ]
      }
    ];

    // Si es admin, se agregan más secciones al menú
    const sections =
      req.user.role === "admin"
        ? [...baseSections, ...adminSections]
        : baseSections;

    // Respuesta final del menú según el rol del usuario
    return res.json({
      message: "Menú obtenido correctamente",
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        restaurantId: req.user.restaurantId || null
      },
      sections
    });
  } catch (error) {
    console.error("Error al obtener el menú:", error);
    return res.status(500).json({
      error: "Error interno del servidor"
    });
  }
};

module.exports = { getMenu };
