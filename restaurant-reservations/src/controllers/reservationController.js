const reservationModel = require('../models/reservationModel');

const createReservation = async (req, res) => {
  try {
    const { restaurantId, date, time, numPeople } = req.body;
    const userId = req.user.id;

    if (!restaurantId || !date || !time || !numPeople) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const newReservation = await reservationModel.createReservation(userId, restaurantId, date, time, numPeople);
    res.status(201).json({ message: 'Reserva creada', reservation: newReservation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reservation = await reservationModel.getReservationById(id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    // Solo el dueño de la reserva o un admin pueden cancelar
    if (reservation.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const cancelled = await reservationModel.cancelReservation(id);
    res.json({ message: 'Reserva cancelada', reservation: cancelled });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { createReservation, cancelReservation };