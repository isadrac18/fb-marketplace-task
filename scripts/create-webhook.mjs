import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const appUrl =
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://YOUR-APP.vercel.app";

const webhookUrl = `${appUrl.replace(/\/+$/, "")}/api/stripe/webhook`;

console.log(`Registering Stripe Connect webhook endpoint: ${webhookUrl}`);

const endpoint = await stripe.webhookEndpoints.create({
  url: webhookUrl,
  connect: true,
  enabled_events: ["checkout.session.completed", "account.updated"],
});

console.log("Webhook endpoint created:", endpoint.id);
console.log("Signing secret:", endpoint.secret);
console.log(
  "\nSave this whsec_... value as STRIPE_WEBHOOK_SECRET in .env.local and in Vercel, then redeploy."
);
