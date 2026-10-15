'use strict';
// Contrato determinista del banco simulado. Nunca realiza cobros ni almacena tarjetas.
exports.authorize = (card) => {
  if (card === '4111111111111111') return { approved: true, reference: 'STUB-APPROVED' };
  return { approved: false, code: 'PAYMENT_DECLINED', message: 'Tarjeta rechazada por el banco simulado' };
};
