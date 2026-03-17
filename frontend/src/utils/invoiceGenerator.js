// utils/invoiceGenerator.js
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

// Helper to format date
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

// --- PASSENGER INVOICE (Bill for what they paid) ---
export const generatePassengerInvoice = (payment) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(44, 62, 80);
  doc.text("RideConnect", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  const invoiceTitle = payment.status === 'REFUNDED' ? 'Refund Receipt' : 'Passenger Invoice';
  doc.text(invoiceTitle, 14, 26);
  doc.text("support@rideconnect.com", 14, 31);

  // Meta Data
  doc.setFontSize(10);
  doc.setTextColor(100);
  const invoiceNo = payment.orderId || `INV-${payment.id}`;
  doc.text(`Invoice No: ${invoiceNo}`, 140, 20);
  doc.text('Transaction ID: ' + (payment.transactionId || 'N/A'), 140, 25);
  doc.text(`Date: ${formatDate(payment.paymentTime)}`, 140, 30);


  // Line
  doc.setDrawColor(200);
  doc.line(14, 35, 196, 35);

  // Bill To
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Bill To:", 14, 45);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Name: ${payment.booking?.passenger?.name || "N/A"}`, 14, 50);
  doc.text(`Email: ${payment.booking?.passenger?.email || "N/A"}`, 14, 55);
  doc.text(`Phone: ${payment.booking?.passenger?.phone || "N/A"}`, 14, 60);
  

  // Ride Details
  const ride = payment.booking?.ride || {};
  const driver = ride.driver || {};

  const rideRows = [
    ["Source", ride.source],
    ["Destination", ride.destination],
    ["Driver", driver.name],
    ["Vehicle", driver.vehicleModel],
    ["Travel Date", ride.travelDate],
    ["Seats", payment.booking?.seatsBooked?.toString()],
  ];

  autoTable(doc, {
    startY: 65,
    head: [["Description", "Details"]],
    body: rideRows,
    theme: "striped",
    headStyles: { fillColor: [44, 62, 80] },
  });

  // Payment Breakdown
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.text("Payment Breakdown", 14, finalY);

  const totalAmount = payment.amount || 0;
  const baseFare = totalAmount / 1.07;
  const gst = baseFare * 0.05;
  const platformFee = baseFare * 0.02;

  const paymentRows = [
    ["Base Ride Fare", `Rs. ${baseFare.toFixed(2)}`],
    ["GST (5%)", `Rs. ${gst.toFixed(2)}`],
    ["Platform Fee (2%)", `Rs. ${platformFee.toFixed(2)}`],
    ["Total Paid", `Rs. ${totalAmount.toFixed(2)}`],
  ];

  // Add refund information if payment status is REFUNDED
  if (payment.status === 'REFUNDED') {
    paymentRows.push(
      ["", ""],
      ["Refund Amount (Base Fare Only)", `Rs. ${baseFare.toFixed(2)}`],
      ["GST & Platform Fee (Non-refundable)", `Rs. ${(gst + platformFee).toFixed(2)}`],
      ["Net Amount", `- Rs. ${(gst + platformFee).toFixed(2)}`]
    );
  }

  autoTable(doc, {
    startY: finalY + 5,
    body: paymentRows,
    theme: "plain",
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 50, halign: "right" },
    },
    didParseCell: function (data) {
      const lastIndex = payment.status === 'REFUNDED' ? 7 : 3;
      if (data.row.index === 3 || data.row.index === lastIndex) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = [0, 0, 0];
      }
      // Style refund rows
      if (payment.status === 'REFUNDED' && data.row.index >= 5) {
        data.cell.styles.fontStyle = "bold";
        if (data.row.index === 5) {
          data.cell.styles.textColor = [39, 174, 96]; // Green for refund amount
        } else {
          data.cell.styles.textColor = [220, 53, 69]; // Red for non-refundable/net loss
        }
      }
    },
  });

  // Footer
  doc.setFontSize(10);
  doc.setTextColor(150);
  const footerMessage = payment.status === 'REFUNDED' 
    ? 'Your refund has been processed. Sorry for the inconvenience.' 
    : 'Thank you for riding with RideConnect!';
  doc.text(
    footerMessage,
    105,
    280,
    null,
    null,
    "center"
  );
  const fileName = payment.status === 'REFUNDED' 
    ? `Refund_Receipt_${payment.id}.pdf` 
    : `Invoice_Passenger_${payment.id}.pdf`;
  doc.save(fileName);
};

// --- DRIVER INVOICE (Earnings Receipt) ---
export const generateDriverInvoice = (payment) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(39, 174, 96); // Green for Earnings
  doc.text("RideConnect Partner", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  const receiptTitle = payment.status === 'REFUNDED' ? 'Refund Notice' : 'Earnings Receipt';
  doc.text(receiptTitle, 14, 26);

  // Meta Data
  const receiptNo = `ERN-${payment.id}`;
  doc.text(`Receipt No: ${receiptNo}`, 140, 20);
  doc.text(`Date: ${formatDate(payment.paymentTime)}`, 140, 25);

  doc.setDrawColor(200);
  doc.line(14, 35, 196, 35);

  // Driver Details
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Partner Details:", 14, 45);
  doc.setFontSize(10);
  doc.setTextColor(100);
  const driver = payment.booking?.ride?.driver || {};
  doc.text(`Name: ${driver.name || "N/A"}`, 14, 50);
  doc.text(`Vehicle: ${driver.licensePlate || "N/A"}`, 14, 55);

  // Trip Summary
  const ride = payment.booking?.ride || {};
  const seatsBooked = payment.booking?.seatsBooked || 1;
  const totalCollected = payment.amount || 0;
  const pricePerSeat = totalCollected / seatsBooked;
  const baseFarePerSeat = pricePerSeat / 1.07; // Base fare without GST and platform fee
  const totalBaseFare = baseFarePerSeat * seatsBooked;

  autoTable(doc, {
    startY: 65,
    head: [["Trip Details", "Value"]],
    body: [
      ["Route", `${ride.source} -> ${ride.destination}`],
      ["Date", ride.travelDate],
      ["Passenger", payment.booking?.passenger?.name],
      ["Seats Booked", seatsBooked.toString()],
      ["Price per Seat", `Rs. ${pricePerSeat.toFixed(2)}`],
      ["Base Fare per Seat", `Rs. ${baseFarePerSeat.toFixed(2)}`],
    ],
    theme: "grid",
    headStyles: { fillColor: [39, 174, 96] }, // Green header
  });

  // Earnings Calculation (Reverse Calc)
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Earnings Breakdown", 14, finalY);

  const baseEarnings = totalBaseFare; // Driver earns only the base fare
  const deductions = totalCollected - baseEarnings; // GST + Platform Fee

  const earningsRows = [
    ["Total Fare Collected", `Rs. ${totalCollected.toFixed(2)}`],
    ["Less: Platform Fee & Tax (7%)", `- Rs. ${deductions.toFixed(2)}`],
    ["NET EARNINGS", `Rs. ${baseEarnings.toFixed(2)}`],
  ];

  // Add refund information if status is REFUNDED
  if (payment.status === 'REFUNDED') {
    earningsRows.push(
      ["", ""],
      ["Refund to Passenger", `- Rs. ${totalBaseFare.toFixed(2)}`],
      ["FINAL EARNINGS", `Rs. 0.00`]
    );
  }

  autoTable(doc, {
    startY: finalY + 5,
    body: earningsRows,
    theme: "plain",
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 60, halign: "right" },
    },
    didParseCell: function (data) {
      const lastIndex = payment.status === 'REFUNDED' ? 5 : 2;
      if (data.row.index === 2 || data.row.index === lastIndex) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 12;
        data.cell.styles.textColor = payment.status === 'REFUNDED' && data.row.index === lastIndex 
          ? [220, 53, 69] // Red for final zero earnings
          : [39, 174, 96]; // Green for normal earnings
      }
      // Style refund row in red
      if (payment.status === 'REFUNDED' && data.row.index === 4) {
        data.cell.styles.textColor = [220, 53, 69];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  doc.setFontSize(10);
  doc.setTextColor(150);
  const footerMsg = payment.status === 'REFUNDED' 
    ? 'This ride was cancelled and refunded. No earnings for this trip.' 
    : 'Keep driving, keep earning!';
  doc.text(footerMsg, 105, 280, null, null, "center");
  const fileName = payment.status === 'REFUNDED'
    ? `Refund_Notice_${payment.id}.pdf`
    : `Receipt_Driver_${payment.id}.pdf`;
  doc.save(fileName);
};
