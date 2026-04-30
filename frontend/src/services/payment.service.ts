import api from '@/shared/utils/api'
import posthog from 'posthog-js'

const paymentService = {
  async createPayment(amount: number, checksToAdd: number, daysToAdd: number) {
    posthog.capture('payment_started', { amount, checksToAdd, daysToAdd })
    const res = await api.post<{ data: { paymentId: string; confirmationUrl: string } }>(
      '/payments/create',
      { amount, checksToAdd, daysToAdd },
    )
    return res.data.data
  },

  async activatePromo(code: string) {
    const res = await api.post('/subscriptions/promo', { code })
    return res.data
  },

  async getSubscription() {
    const res = await api.get<{
      data: { subscription: { isActive: boolean; expiresAt: string | null } | null }
    }>('/subscriptions/me')
    return res.data.data.subscription
  },
}

export default paymentService
