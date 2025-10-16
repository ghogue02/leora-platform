export const metadata = {
  title: 'Checkout',
  description: 'Review your order and confirm purchase.',
};

export default function CheckoutPage() {
  return (
    <div className="container mx-auto max-w-3xl p-6 space-y-6">
      <div>
        <h1 className="text-heading-xl font-semibold">Checkout</h1>
        <p className="text-muted">
          Confirm shipping, payment, and submit your order.
        </p>
      </div>

      <div className="rounded-card border border-border bg-card p-6">
        <p className="text-body-md text-muted">
          Checkout is not yet fully implemented. Please review your cart items and
          contact support if you need assistance completing this order.
        </p>
      </div>
    </div>
  );
}
