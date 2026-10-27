let loading;
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () =>
      window.Razorpay
        ? resolve(window.Razorpay)
        : reject(new Error("Razorpay Checkout did not load."));
    script.onerror = () => {
      loading = null;
      reject(
        new Error(
          "Could not load Razorpay Checkout. Check your connection and retry.",
        ),
      );
    };
    document.head.appendChild(script);
  });
  return loading;
}
