/**
 * Editable storefront content: help topics, about text and policy pages.
 * Policies are DRAFTS written as a starting point — review them (ideally with a lawyer) before launch,
 * then set `draft: false` to hide the draft notice.
 */
export const SUPPORT = {
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '',
  phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || '',
}

export const HELP_TOPICS: { q: string; a: string }[] = [
  { q: 'Track my order', a: 'Once you place an order, you can follow its status from your account, and we’ll notify you as it moves along. Items from different stores arrive as separate deliveries, and each one is tracked on its own.' },
  { q: 'Cancel or return an item', a: 'You can cancel an order until the store dispatches it. Most items can be returned within 7 days of delivery if they’re unused and in their original packaging — some items, like fresh food, can’t be returned.' },
  { q: 'Payment & refunds', a: 'You pay once at checkout, even when your order comes from more than one store. Refunds go back to your original payment method within 5–7 working days after a return or cancellation is approved.' },
  { q: 'Delivery charges', a: 'Delivery is free on orders above ₹499. Below that, a ₹40 delivery fee is added at checkout. Prices include GST.' },
  { q: 'Account & profile', a: 'Update your name, phone, addresses and notification settings from My account. To change your password, go to Login & security.' },
  { q: 'Reviews & ratings', a: 'Open any product and choose “Write a review”. You can edit or delete your review at any time from the same place.' },
]

export const ABOUT = {
  title: 'About Marketplace',
  text: 'Grocery, fashion & electronics, delivered to your door. One account, many local stores — shop them all in one place, with one cart and one checkout even when your order comes from more than one seller.',
}

export interface Policy { slug: string; title: string; draft: boolean; sections: { heading: string; body: string }[] }

export const POLICIES: Policy[] = [
  {
    slug: 'terms', title: 'Terms of service', draft: true,
    sections: [
      { heading: 'Who we are', body: 'Marketplace is an online platform where independent stores (“sellers”) list and sell products to you. Each product is sold by the seller named on its page.' },
      { heading: 'Your account', body: 'Keep your login details private and make sure the information in your account is accurate. You’re responsible for activity on your account.' },
      { heading: 'Orders and prices', body: 'An order is confirmed when you receive an order confirmation. Prices include GST and may change before you place an order. Sellers may cancel an order if an item becomes unavailable, in which case you’re refunded in full.' },
      { heading: 'Reviews', body: 'Reviews must be honest and about the product. We may remove reviews that are abusive, misleading or unrelated.' },
    ],
  },
  {
    slug: 'privacy', title: 'Privacy policy', draft: true,
    sections: [
      { heading: 'What we collect', body: 'Your name, email, phone number, delivery addresses, orders and the choices you make in your account (such as notification settings).' },
      { heading: 'How we use it', body: 'To deliver your orders, provide support, keep your account secure and — only if you allow it — send offers and alerts.' },
      { heading: 'What sellers see', body: 'Sellers see the details they need to fulfil your order: your name, phone number and delivery address. They can’t change your details.' },
      { heading: 'Your choices', body: 'You can update your details and notification settings at any time from My account, and ask us to delete your account.' },
    ],
  },
  {
    slug: 'refund', title: 'Refund policy', draft: true,
    sections: [
      { heading: 'Returns', body: 'Most items can be returned within 7 days of delivery if unused and in original packaging. Perishable items (like fresh food) can’t be returned unless they arrive damaged.' },
      { heading: 'Refunds', body: 'Once a return or cancellation is approved, the refund goes to your original payment method within 5–7 working days.' },
    ],
  },
  {
    slug: 'shipping', title: 'Shipping policy', draft: true,
    sections: [
      { heading: 'Delivery charges', body: 'Free on orders above ₹499; otherwise ₹40 per order.' },
      { heading: 'Delivery areas', body: 'Each store delivers to its own areas. Check a product page to see if it delivers to your pincode.' },
      { heading: 'Multiple stores', body: 'Items from different stores arrive as separate deliveries, but you pay once at checkout.' },
    ],
  },
  {
    slug: 'community-guidelines', title: 'Community guidelines', draft: true,
    sections: [
      { heading: 'Be respectful', body: 'Keep reviews and messages respectful. No hate speech, harassment or personal information about others.' },
      { heading: 'Be genuine', body: 'Only review products you’ve used. Don’t post paid, fake or copied reviews.' },
    ],
  },
]
