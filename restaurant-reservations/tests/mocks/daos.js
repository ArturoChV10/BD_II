const userDao = {
  create: jest.fn(),
  findByEmail: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  deleteUser: jest.fn(),
  findAll: jest.fn(),
  findRestaurantByName: jest.fn(),
  findAdminByRestaurantId: jest.fn()
};

const restaurantDao = {
  findRestaurantByName: jest.fn(),
  getAllRestaurants: jest.fn(),
  createRestaurant: jest.fn(),
  findRestaurantById: jest.fn()
};

const menuDao = {
  getAllMenus: jest.fn(),
  getMenuById: jest.fn(),
  createMenu: jest.fn(),
  updateMenu: jest.fn(),
  deleteMenu: jest.fn()
};

const dishDao = {
  getDishesByMenuId: jest.fn(),
  getDishById: jest.fn(),
  createDish: jest.fn(),
  updateDish: jest.fn(),
  deleteDish: jest.fn()
};

const reservationDao = {
  createReservation: jest.fn(),
  getReservationById: jest.fn(),
  cancelReservation: jest.fn()
};

const orderDao = {
  createOrder: jest.fn(),
  addOrderItem: jest.fn(),
  updateOrderTotal: jest.fn(),
  getOrderById: jest.fn(),
  getOrderItems: jest.fn(),
  updateOrderStatus: jest.fn()
};

module.exports = {
  userDao,
  restaurantDao,
  menuDao,
  dishDao,
  reservationDao,
  orderDao
};
