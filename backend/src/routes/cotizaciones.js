const router = require('express').Router();
const { HttpError, asyncHandler } = require('../config/httpError');
const { authenticate, authorize } = require('../middlewares/auth');
const { crearCotizacion, decidirCotizacion } = require('../services/cotizacionService');

router.use(authenticate);

router.post(
  '/',
  authorize('Vendedor', 'Encargado'),
  asyncHandler(async (req, res) => {
    if (!req.body.solicitud_id) throw new HttpError(400, 'solicitud_id es obligatorio');
    res.status(201).json(await crearCotizacion(req.body.solicitud_id));
  })
);

router.patch(
  '/:id/decision',
  authorize('Vendedor'),
  asyncHandler(async (req, res) => {
    res.json(await decidirCotizacion(req.params.id, req.body.decision));
  })
);

module.exports = router;
