import test from 'node:test'
import assert from 'node:assert/strict'
import { paymentFeedback, pixCheckoutSucceeded } from '../src/features/reservations/paymentState.ts'

const payment = {
  id: 'checkout', method: 'Pix', amount: 25.5, status: 'Received',
  paidAt: '2026-11-10T12:00:00Z', expiresAt: '2026-11-10T12:15:00Z',
  payload: null, refunds: [],
  reservations: [{ id: 'meal', amount: 25.5, status: 'Confirmed', paymentStatus: 'Paid' }],
}

test('only a received PIX with confirmed, paid meals completes the checkout', () => {
  assert.equal(pixCheckoutSucceeded(payment), true)
  assert.equal(paymentFeedback(payment, false).tone, 'success')
  for (const status of ['Creating', 'Pending', 'Expired', 'Failed', 'ReviewRequired']) {
    assert.equal(pixCheckoutSucceeded({ ...payment, status }), false)
  }
  assert.equal(pixCheckoutSucceeded({ ...payment, method: 'PayAtRestaurant' }), false)
  assert.equal(pixCheckoutSucceeded({ ...payment, reservations: [] }), false)
})

test('a late PIX for an expired or cancelled meal never shows reservation success', () => {
  for (const status of ['Cancelled', 'PaymentExpired', 'PaymentFailed']) {
    const late = { ...payment, reservations: [{ ...payment.reservations[0], status, paymentStatus: 'RefundPending' }] }
    assert.equal(pixCheckoutSucceeded(late), false)
    assert.notEqual(paymentFeedback(late, true).tone, 'success')
  }
})

test('refund processing and failed payments have distinct feedback', () => {
  const refunding = { ...payment, refunds: [{ reservationId: 'meal', status: 'Submitted', amount: 25.5 }] }
  assert.equal(pixCheckoutSucceeded(refunding), false)
  assert.match(paymentFeedback(refunding, false).title, /Reembolso/)
  assert.equal(paymentFeedback({ ...payment, status: 'Failed', paidAt: null }, false).tone, 'error')
  assert.equal(paymentFeedback({ ...payment, status: 'Expired', paidAt: null }, true).tone, 'error')
  assert.equal(paymentFeedback({ ...payment, status: 'ReviewRequired', paidAt: null }, false).tone, 'warning')
})

test('local expiry hides the payment flow even while remote reconciliation continues', () => {
  const pending = { ...payment, status: 'Pending', paidAt: null, payload: 'test-code' }
  assert.equal(paymentFeedback(pending, false).title, 'Pague com PIX')
  assert.equal(paymentFeedback(pending, true).tone, 'error')
})
