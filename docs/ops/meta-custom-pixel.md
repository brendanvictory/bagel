# Meta (Facebook/Instagram) events — setup

## Who sends what

| Action on the site | Meta event | Sent by |
|---|---|---|
| Any page load | PageView | Facebook & Instagram app (Shopify) |
| Product page / box builder page | ViewContent | Facebook & Instagram app |
| Collection page | ViewCategory | Facebook & Instagram app |
| Search | Search | Facebook & Instagram app |
| Box added to cart | AddToCart | Facebook & Instagram app (Shopify `product_added_to_cart`, also for AJAX adds) |
| Checkout started | InitiateCheckout | Facebook & Instagram app |
| Payment info entered | AddPaymentInfo | Facebook & Instagram app |
| Order placed | Purchase | Facebook & Instagram app (browser + Conversions API, deduplicated) |
| Box builder finished (all sleeves picked) | **CustomizeProduct** | Custom pixel below |
| Newsletter signup, wholesale inquiry, builder ZIP/email step | **Lead** | Custom pixel below |
| Contact form sent | **Contact** | Custom pixel below |
| Order containing a subscription | **Subscribe** | Custom pixel below |

Rules this setup follows:
- **No Meta pixel code in the theme.** The app already sends the standard events (with server-side
  Conversions API). Adding `fbq` to the theme would double-count them.
- The custom pixel never sends PageView or any event the app already sends.
- The theme publishes the extra actions as Shopify custom events (`snippets/nybe-tracking.liquid`);
  the box builder no longer rewrites the URL on every tap, so PageView fires once per real page
  (plus once per builder step change).

## Facebook & Instagram app settings (Shopify admin → Sales channels → Facebook & Instagram → Settings)
- **Data sharing:** *Maximum* (enables Conversions API, best match quality).
- Pixel: `2045693459391653` (the one shown in Meta Events Manager).

## Add the custom pixel (one time)
Shopify admin → **Settings → Customer events → Add custom pixel** → name it `Meta extra events`.
- Permission: **Required** → *Marketing* (so it respects the customer's cookie consent).
- Data sale: *Data collected qualifies as data sale* (same as the Facebook app).
- Paste the code below, **Save**, then **Connect**.

```js
// Meta extra events (CustomizeProduct, Lead, Contact, Subscribe).
// Standard events are sent by the Facebook & Instagram app — do NOT add them here.
const PIXEL_ID = '2045693459391653';

!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');

fbq.disablePushState = true;            // never auto-fire PageView
fbq('set', 'autoConfig', false, PIXEL_ID); // no automatic button-click events
fbq('init', PIXEL_ID);                 // note: no fbq('track', 'PageView') — the app sends it

const opts = (event) => ({ eventID: event.id });

analytics.subscribe('nybe_customize_product', (event) => {
  const d = event.customData || {};
  fbq('track', 'CustomizeProduct', { content_name: d.content_name || 'Build Your Box', contents: (d.sleeves || []).map((s) => ({ id: s, quantity: 1 })) }, opts(event));
});

analytics.subscribe('nybe_lead', (event) => {
  const d = event.customData || {};
  fbq('track', 'Lead', { content_name: d.source || 'lead', content_category: d.source || 'lead' }, opts(event));
});

analytics.subscribe('nybe_contact', (event) => {
  fbq('track', 'Contact', {}, opts(event));
});

analytics.subscribe('checkout_completed', (event) => {
  const c = (event.data && event.data.checkout) || {};
  const hasSubscription = (c.lineItems || []).some((li) => li.sellingPlanAllocation && li.sellingPlanAllocation.sellingPlan);
  if (!hasSubscription) return;
  const value = c.totalPrice ? Number(c.totalPrice.amount) : undefined;
  const currency = c.currencyCode || (c.totalPrice && c.totalPrice.currencyCode);
  const orderId = c.order && c.order.id;
  fbq('track', 'Subscribe', { value, currency, predicted_ltv: value }, { eventID: 'subscribe-' + (orderId || event.id) });
});
```

## Test
1. Meta Events Manager → your pixel → **Test events** → open the site with the test code (or use Meta Pixel Helper).
2. Box builder: picking sleeves should **not** add PageViews; going to step 2 → *CustomizeProduct*;
   Checkout → *AddToCart* + *InitiateCheckout*.
3. Footer newsletter / wholesale form → *Lead*; contact form → *Contact*.
4. A test subscription order → *Purchase* + *Subscribe*.
