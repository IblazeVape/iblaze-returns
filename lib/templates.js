// Return request confirmation — mirrors Shopify notification layout (Jun 2026 test email)

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif";

const DISCOUNT_TAG_ICON =
  "https://cdn.shopify.com/shopifycloud/shopify/assets/themes_support/notifications/discounttag-23d3dd52a101179fb1461daaba6b77388b99b6154de85840a5245b8d3930a68e.png";

const SPACER_IMG =
  "https://cdn.shopify.com/shopifycloud/shopify/assets/themes_support/notifications/spacer-1a26dfd5c56b21ac888f9f1610ef81191b571603cb207c6c0f564148473cab3c.png";

function formatMoney(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "Free";
  return `£${n.toFixed(2)}`;
}

function renderLineItem(item, index, total) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const borderTop = isFirst ? "none" : "solid";
  const cellPadding = isFirst
    ? "padding-bottom:15px;"
    : isLast
      ? "padding-top:15px;"
      : "padding-top:15px;padding-bottom:15px;";

  const qty = item.quantity || 1;
  const lineTotal = (parseFloat(item.price) || 0) * qty;
  const originalLineTotal = item.originalPrice != null ? parseFloat(item.originalPrice) * qty : null;
  const showStrikethrough =
    originalLineTotal != null && originalLineTotal > 0 && lineTotal < originalLineTotal;

  const imageCell = item.image
    ? `<img src="${item.image}" align="left" width="60" height="60" style="margin-right:15px;border-radius:8px;border:1px solid #e5e5e5;"/>`
    : "";

  const variantHtml =
    item.variantTitle && item.variantTitle !== "Default Title"
      ? `<span style="font-size:14px;color:#999;font-weight:400;">${item.variantTitle}</span><br/>`
      : "";

  const groupHtml = item.groupLabel
    ? `<span style="font-size:14px;color:#999;font-weight:400;">${item.groupLabel}</span><br/>`
    : "";

  const discountsHtml = (item.discounts || [])
    .map(
      (d) => `
              <p style="color:#777;line-height:150%;font-size:16px;margin:4px 0 0;">
                <span style="font-size:14px;display:block;line-height:1.4;margin:1px 0 0;">
                  <img src="${DISCOUNT_TAG_ICON}" width="18" height="18" style="vertical-align:middle;margin-right:6px;"/>
                  <span style="font-size:14px;margin-left:-4px;">${d.label} (-${formatMoney(d.amount)})</span>
                </span>
              </p>`
    )
    .join("");

  const priceHtml = showStrikethrough
    ? `<del style="font-size:14px;display:block;text-align:right;color:#999;">${formatMoney(originalLineTotal)}</del>
          <p style="color:#555;line-height:150%;font-size:16px;font-weight:600;margin:4px 0 0 15px;" align="right">${formatMoney(lineTotal)}</p>`
    : `<p style="color:#555;line-height:150%;font-size:16px;font-weight:600;margin:4px 0 0 15px;" align="right">${formatMoney(lineTotal)}</p>`;

  return `
  <tr style="width:100%;border-top-width:1px;border-top-color:#e5e5e5;border-top-style:${borderTop};">
    <td style="font-family:${FONT};${cellPadding}">
      <table style="border-spacing:0;border-collapse:collapse;">
        <tbody><tr>
          <td style="font-family:${FONT};">${imageCell}</td>
          <td style="font-family:${FONT};width:100%;">
            <span style="font-size:16px;font-weight:600;line-height:1.4;color:#555;">${item.title}&nbsp;&times;&nbsp;${qty}</span><br/>
            ${variantHtml}${groupHtml}${discountsHtml}
          </td>
          <td style="font-family:${FONT};white-space:nowrap;">${priceHtml}</td>
        </tr></tbody>
      </table>
    </td>
  </tr>`;
}

function getReturnRequestTemplate(order, shop, returnItems) {
  const accentColor = shop.email_accent_color || "#E5403B";
  const shopUrl = shop.url || "https://iblazevape.co.uk";
  const supportEmail = shop.email || "info@iblazevape.co.uk";
  const logoUrl =
    shop.email_logo_url ||
    "https://cdn.shopify.com/s/files/1/0941/5383/4761/files/IblazeLogo.png?v=14919";

  const items = returnItems || [];
  const itemsHtml =
    items.length > 0
      ? `<table style="width:100%;border-spacing:0;border-collapse:collapse;"><tbody>${items
          .map((item, i) => renderLineItem(item, i, items.length))
          .join("")}</tbody></table>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Return requested for order ${order.name}</title>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table { border-spacing: 0; border-collapse: collapse; }
    table.body { height: 100% !important; width: 100% !important; }
    table.container { width: 560px; text-align: left; margin: 0 auto; }
    table.header.row { width: 100%; margin: 40px 0 20px; }
    table.row { width: 100%; }
    table.row.content { width: 100%; }
    table.row.section { width: 100%; }
    table.row.actions { width: 100%; margin-top: 20px; }
    table.row.footer { width: 100%; border-top: 1px solid #e5e5e5; }
    table.button.main-action-cell { display: block; width: 100%; }
    table.link.secondary-action-cell { display: block; width: 100%; margin-top: 19px; text-align: center; }
    td.content__cell { padding-bottom: 40px; border-width: 0; }
    td.section__cell { padding: 40px 0; }
    td.footer__cell { padding: 35px 0; }
    td.order-number__cell { text-transform: uppercase; font-size: 14px; color: #999; }
    td.empty-line { line-height: 0; }
    h2 { font-weight: normal; font-size: 24px; margin: 0 0 10px; }
    h3 { font-weight: normal; font-size: 20px; margin: 0 0 25px; }
    p { color: #777; line-height: 150%; font-size: 16px; margin: 0; }
    p.return-requested__body { color: #202223; line-height: 150%; font-size: 14px; margin: 0; }
    p.disclaimer__subtext { color: #999; font-size: 14px; }
    a { font-size: 16px; text-decoration: none; color: ${accentColor}; }
    a.button__text { display: block; color: #fff; padding: 20px 25px; }
    .button__cell { background: ${accentColor}; border-radius: 4px; }
    a:hover, a:active, a:visited { color: ${accentColor}; text-decoration: none; }
    img.spacer { min-width: 600px; height: 0; }
    @media (max-width: 600px) {
      .container { width: 94% !important; }
      .button { width: 100%; }
      .header { margin-top: 20px !important; margin-bottom: 2px !important; }
      .shop-name__cell { display: block; }
      .order-number__cell { display: block; text-align: left !important; margin-top: 20px; }
      .spacer { display: none !important; }
    }
  </style>
</head>
<body style="margin:0;width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table class="body" style="height:100%!important;width:100%!important;border-spacing:0;border-collapse:collapse;">
    <tbody><tr>
      <td style="font-family:${FONT};">
        <table class="header row" style="width:100%;border-spacing:0;border-collapse:collapse;margin:40px 0 20px;">
          <tbody><tr>
            <td class="header__cell" style="font-family:${FONT};">
              <center>
                <table class="container" style="width:560px;text-align:left;border-spacing:0;border-collapse:collapse;margin:0 auto;">
                  <tbody><tr>
                    <td style="font-family:${FONT};">
                      <table class="row" style="width:100%;border-spacing:0;border-collapse:collapse;">
                        <tbody><tr>
                          <td class="shop-name__cell" style="font-family:${FONT};">
                            <img src="${logoUrl}" alt="IblazeVape" width="65"/>
                          </td>
                          <td style="font-family:${FONT};">
                            <table class="order-po-number__container" style="border-spacing:0;border-collapse:collapse;margin-left:auto;margin-right:0;">
                              <tbody><tr>
                                <td class="order-number__cell" style="font-family:${FONT};text-transform:uppercase;font-size:14px;color:#999;" align="right">
                                  <span class="order-number__text" style="font-size:16px;">Order ${order.name}</span>
                                </td>
                              </tr></tbody>
                            </table>
                          </td>
                        </tr></tbody>
                      </table>
                    </td>
                  </tr></tbody>
                </table>
              </center>
            </td>
          </tr></tbody>
        </table>

        <table class="row content" style="width:100%;border-spacing:0;border-collapse:collapse;">
          <tbody><tr>
            <td class="content__cell" style="font-family:${FONT};padding-bottom:40px;border-width:0;">
              <center>
                <table class="container" style="width:560px;text-align:left;border-spacing:0;border-collapse:collapse;margin:0 auto;">
                  <tbody><tr>
                    <td style="font-family:${FONT};">
                      <h2 style="font-weight:normal;font-size:24px;margin:0 0 10px;">Your return request was sent</h2>
                      <p class="return-requested__body" style="color:#202223;line-height:150%;font-size:14px;margin:0;">Your return request was sent and is being reviewed. We'll email you once it's been completed.</p>
                      <table class="row actions" style="width:100%;border-spacing:0;border-collapse:collapse;margin-top:20px;">
                        <tbody>
                          <tr><td class="empty-line" style="font-family:${FONT};line-height:0;">&nbsp;</td></tr>
                          <tr>
                            <td class="actions__cell" style="font-family:${FONT};">
                              <table class="button main-action-cell" style="display:block;width:100%;border-spacing:0;border-collapse:collapse;">
                                <tbody><tr>
                                  <td class="button__cell" style="font-family:${FONT};border-radius:4px;" align="center" bgcolor="${accentColor}">
                                    <a class="button__text" href="${order.order_status_url}" style="font-size:16px;text-decoration:none;display:block;text-align:center;color:#fff;padding:20px 25px;">View your order</a>
                                  </td>
                                </tr></tbody>
                              </table>
                              <table class="link secondary-action-cell" style="display:block;width:100%;border-spacing:0;border-collapse:collapse;margin-top:19px;text-align:center;">
                                <tbody><tr>
                                  <td class="link__cell" style="font-family:${FONT};border-radius:4px;" align="center">or <a href="${shopUrl}" style="font-size:16px;text-decoration:none;color:${accentColor};">Visit our store</a></td>
                                </tr></tbody>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr></tbody>
                </table>
              </center>
            </td>
          </tr></tbody>
        </table>

        <table class="row section" style="width:100%;border-spacing:0;border-collapse:collapse;">
          <tbody><tr>
            <td class="section__cell" style="font-family:${FONT};padding:40px 0;">
              <center>
                <table class="container" style="width:560px;text-align:left;border-spacing:0;border-collapse:collapse;margin:0 auto;">
                  <tbody><tr>
                    <td style="font-family:${FONT};">
                      <h3 style="font-weight:normal;font-size:20px;margin:0 0 25px;">Return summary</h3>
                    </td>
                  </tr></tbody>
                </table>
                <table class="container" style="width:560px;text-align:left;border-spacing:0;border-collapse:collapse;margin:0 auto;">
                  <tbody><tr>
                    <td style="font-family:${FONT};">${itemsHtml}</td>
                  </tr></tbody>
                </table>
              </center>
            </td>
          </tr></tbody>
        </table>

        <table class="row footer" style="width:100%;border-spacing:0;border-collapse:collapse;border-top:1px solid #e5e5e5;">
          <tbody><tr>
            <td class="footer__cell" style="font-family:${FONT};padding:35px 0;">
              <center>
                <table class="container" style="width:560px;text-align:left;border-spacing:0;border-collapse:collapse;margin:0 auto;">
                  <tbody><tr>
                    <td style="font-family:${FONT};">
                      <p class="disclaimer__subtext" style="color:#999;line-height:150%;font-size:14px;margin:0;">If you have any questions, reply to this email or contact us at <a href="mailto:${supportEmail}" style="font-size:14px;text-decoration:none;color:${accentColor};">${supportEmail}</a></p>
                    </td>
                  </tr></tbody>
                </table>
              </center>
            </td>
          </tr></tbody>
        </table>

        <img src="${SPACER_IMG}" class="spacer" height="1" alt=""/>
      </td>
    </tr></tbody>
  </table>
</body>
</html>`;
}

module.exports = { getReturnRequestTemplate };
