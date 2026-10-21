const { calcular } = require('../../src/services/calculoService');

describe('calculoService.calcular', () => {
  test('solo materiales', () => {
    const r = calcular({ materiales: [{ cantidad: 2, precio_unitario: 1500.5 }, { cantidad: 1, precio_unitario: 999 }], horas: 0, tarifaHora: 25000 });
    expect(r).toEqual({ costo_materiales: 4000, costo_mano_obra: 0, total: 4000 });
  });

  test('solo mano de obra', () => {
    const r = calcular({ materiales: [], horas: 3.5, tarifaHora: 25000 });
    expect(r).toEqual({ costo_materiales: 0, costo_mano_obra: 87500, total: 87500 });
  });

  test('materiales + mano de obra, con redondeo a 2 decimales', () => {
    const r = calcular({ materiales: [{ cantidad: '3', precio_unitario: '0.335' }], horas: 1, tarifaHora: 100 });
    expect(r.costo_materiales).toBe(1.01);
    expect(r.total).toBe(101.01);
  });

  test('sin datos devuelve cero', () => {
    expect(calcular({ tarifaHora: 100 }).total).toBe(0);
  });
});
