import api from '@/shared/utils/api'

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

const paymentService = {
  async createPayment(amount: number, daysToAdd: number, checksToAdd: number) {
    const res = await api.post<{ data: { paymentId: string; confirmationUrl: string } }>(
      '/payments/create',
      { amount, daysToAdd, checksToAdd },
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
