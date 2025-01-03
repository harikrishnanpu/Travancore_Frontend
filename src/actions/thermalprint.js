// src/utils/thermalPrinter.js

export async function thermalPrint(billingData) {
    try {
      // Replace these with your printer's specific details
      const YOUR_PRINTER_VENDOR_ID = 0x04B8; // Example Vendor ID (replace with actual)
      const YOUR_PRINTER_PRODUCT_ID = 0x0E15; // Example Product ID (replace with actual)
      const YOUR_PRINTER_INTERFACE_NUMBER = 0; // Example Interface Number (replace with actual)
      const YOUR_PRINTER_ENDPOINT_OUT = 1; // Example Endpoint Number (replace with actual)
  
      // Request the thermal printer
      const device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: YOUR_PRINTER_VENDOR_ID, productId: YOUR_PRINTER_PRODUCT_ID },
        ],
      });
  
      await device.open(); // Begin a session.
  
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
  
      await device.claimInterface(YOUR_PRINTER_INTERFACE_NUMBER);
  
      // ESC/POS Commands
      const initialize = new Uint8Array([0x1b, 0x40]); // Initialize printer
      const text = new TextEncoder().encode(formatBillingDataForThermal(billingData));
      const cut = new Uint8Array([0x1d, 0x56, 0x42, 0x00]); // Cut paper
  
      // Send commands to the printer
      await device.transferOut(YOUR_PRINTER_ENDPOINT_OUT, initialize);
      await device.transferOut(YOUR_PRINTER_ENDPOINT_OUT, text);
      await device.transferOut(YOUR_PRINTER_ENDPOINT_OUT, cut);
  
      await device.releaseInterface(YOUR_PRINTER_INTERFACE_NUMBER);
      await device.close();
    } catch (error) {
      console.error('Thermal Print Error:', error);
      alert('Failed to print via Thermal Printer. Please check the printer connection and try again.');
    }
  }
  
  function formatBillingDataForThermal(data) {
    // Format your billing data into a string suitable for thermal printing
    // Adjust the formatting as per your printer's capabilities
    let formatted = `\nTravancore Backers\nBilling Invoice\n\n`;
    formatted += `Invoice No: ${data.invoiceNo}\n`;
    formatted += `Date: ${data.invoiceDate}\n\n`;
    formatted += `Customer: ${data.customerName}\n`;
    formatted += `Address: ${data.customerAddress}\n\n`;
    formatted += `Salesman: ${data.salesmanName}\n\n`;
    formatted += `Items:\n`;
  
    data.products.forEach((product) => {
      formatted += `${product.name} x${product.quantity} @ ₹${product.sellingPriceinQty} = ₹${(
        product.quantity * product.sellingPriceinQty
      ).toFixed(2)}\n`;
    });
  
    formatted += `\nSubtotal: ₹${data.subtotal}\n`;
    formatted += `GST: ₹${data.totalGST}\n`;
    formatted += `Discount: ₹${data.discount}\n`;
    formatted += `Grand Total: ₹${data.grandTotal}\n\n`;
    formatted += `Thank you for your business!\n\n\n`;
  
    return formatted;
  }
  