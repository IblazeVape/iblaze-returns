// api/_lib/templates.js

function getReturnRequestTemplate(order, shop, returnItems) {
  // Forced exact colour match to #E5403B
  const accentColor = "#E5403B";
  const shopUrl = shop.url || "https://iblazevape.co.uk";
  const supportEmail = shop.email || "info@iblazevape.co.uk";
  
  // Your exact logo URL
  const logoUrl = "https://cdn.shopify.com/s/files/1/0941/5383/4761/files/IblazeLogo.png?v=14858";
  
  // Generating the line items exactly from the raw HTML provided
  const itemsHtml = (returnItems || []).map(item => `
<table style="width:100%;border-spacing:0;border-collapse:collapse">
  <tbody>
    <tr style="width:100%;border-top-width:1px;border-top-color:#e5e5e5;border-top-style:none">
      <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif">
        <table style="border-spacing:0;border-collapse:collapse;width:100%;">
          <tbody>
            <tr>
              <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;width:75px;">
                ${item.image ? `<img src="${item.image}" align="left" width="60" height="60" style="margin-right:15px;border-radius:8px;border:1px solid #e5e5e5;display:block;">` : ''}
              </td>
              <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;width:100%">
                <span style="font-size:16px;font-weight:600;line-height:1.4;color:#555">${item.title} &times; ${item.quantity}</span><br>
                ${item.variantTitle && item.variantTitle !== 'Default Title' ? `<span style="font-size:14px;color:#999;">${item.variantTitle}</span>` : ''}
              </td>
              <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;white-space:nowrap" valign="top">
                <p style="color:#555;line-height:150%;font-size:16px;font-weight:600;margin:4px 0 0 15px" align="right">
                  ${item.price > 0 ? `£${parseFloat(item.price).toFixed(2)}` : 'Free'}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  </tbody>
</table>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Return requested for order ${order.name}</title>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width">
</head>
<body style="margin:0; padding:0; background-color:#ffffff;">
<div style="margin:0">
  <table style="height:100%!important;width:100%!important;border-spacing:0;border-collapse:collapse">
    <tbody><tr>
      <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif">
        <table style="width:100%;border-spacing:0;border-collapse:collapse;margin:40px 0 20px">
  <tbody><tr>
    <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif">
      <center>
        <table style="width:560px;text-align:left;border-spacing:0;border-collapse:collapse;margin:0 auto">
          <tbody><tr>
            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif">
              <table style="width:100%;border-spacing:0;border-collapse:collapse">
                <tbody><tr>
                  <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif">
                      <a href="${shopUrl}" style="text-decoration:none; display:inline-block;">
                        <img src="${logoUrl}" alt="IblazeVape" width="65" style="width: 65px; height: auto; display: block; border: none; outline: none; overflow-clip-margin: content-box; overflow: clip;">
                      </a>
                  </td>
                    <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif">
                      <table style="border-spacing:0;border-collapse:collapse;margin-left:auto;margin-right:0">
                        <tbody><tr>
                          <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;text-transform:uppercase;font-size:14px;color:#999" align="right">
                            <span style="font-size:16px">Order ${order.name}</span>
                          </td>
                        </tr>
                      </tbody></table>
                    </td>
                </tr>
              </tbody></table>
            </td>
          </tr>
        </tbody></table>
      </center>
    </td>
  </tr>
</tbody></table>

        <table style="width:100%;border-spacing:0;border-collapse:collapse">
  <tbody><tr>
    <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;padding-bottom:40px;border-width:0">
      <center>
        <table style="width:560px;text-align:left;border-spacing:0;border-collapse:collapse;margin:0 auto">
          <tbody><tr>
            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif">
              
          <h2 style="font-weight:normal;font-size:24px;margin:0 0 10px">Your return request was sent</h2>
          <p style="color:#202223;line-height:150%;font-size:14px;margin:0">
            Your return request was sent and is being reviewed. We'll email you once it's been completed.
          </p>

          <table style="width:100%;border-spacing:0;border-collapse:collapse;margin-top:20px">
  <tbody><tr>
    <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;line-height:0em">&nbsp;</td>
  </tr>
  <tr>
    <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif">
      <table style="border-spacing:0;border-collapse:collapse">
        <tbody><tr>
          <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;border-radius:4px" align="center" bgcolor="${accentColor}"><a href="${order.order_status_url}" style="font-size:16px;text-decoration:none;display:block;text-align:center;color:#fff;padding:20px 25px" target="_blank">View your order</a></td>
        </tr>
      </tbody></table>
        <table style="border-spacing:0;border-collapse:collapse;margin-top:19px">
          <tbody><tr>
            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;border-radius:4px" align="center">or <a href="${shopUrl}" style="font-size:16px;text-decoration:none;color:${accentColor}" target="_blank">Visit our store</a>
</td>
          </tr>
        </tbody></table>
    </td>
  </tr>
</tbody></table>

            </td>
          </tr>
        </tbody></table>
      </center>
    </td>
  </tr>
</tbody></table>

        <table style="width:100%;border-spacing:0;border-collapse:collapse">
  <tbody><tr>
    <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;padding:40px 0">
      <center>
        <table style="width:560px;text-align:left;border-spacing:0;border-collapse:collapse;margin:0 auto">
          <tbody><tr>
            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif">
              <h3 style="font-weight:normal;font-size:20px;margin:0 0 25px">Return summary</h3>
            </td>
          </tr>
        </tbody></table>
        <table style="width:560px;text-align:left;border-spacing:0;border-collapse:collapse;margin:0 auto">
          <tbody><tr>
            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif">
              
          ${itemsHtml}

            </td>
          </tr>
        </tbody></table>
      </center>
    </td>
  </tr>
</tbody></table>

        <table style="width:100%;border-spacing:0;border-collapse:collapse;border-top-width:1px;border-top-color:#e5e5e5;border-top-style:solid">
  <tbody><tr>
    <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;padding:35px 0">
      <center>
        <table style="width:560px;text-align:left;border-spacing:0;border-collapse:collapse;margin:0 auto">
          <tbody><tr>
            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif">
              
              <p style="color:#999;line-height:150%;font-size:14px;margin:0">If you have any questions, reply to this email or contact us at <a href="mailto:${supportEmail}" style="font-size:14px;text-decoration:none;color:${accentColor}" target="_blank">${supportEmail}</a></p>
            </td>
          </tr>
        </tbody></table>
      </center>
    </td>
  </tr>
</tbody></table>
      </td>
    </tr>
  </tbody></table>
</div>
</body>
</html>`;
}

module.exports = { getReturnRequestTemplate };
