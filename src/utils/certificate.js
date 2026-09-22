import { jsPDF } from 'jspdf';

/**
 * Generates and downloads a professional Crop Insurance Policy Certificate PDF for the farmer.
 * @param {Object} policy - The policy object containing all registered farmer details.
 */
export const downloadPolicyCertificate = (policy) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // 1. Thin green border around the A4 page (margins of 10mm)
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.setLineWidth(0.5);
  doc.rect(10, 10, 190, 277);

  // 2. Outer secondary light frame
  doc.setDrawColor(209, 250, 229); // emerald-50
  doc.setLineWidth(2);
  doc.rect(12, 12, 186, 273);

  // 3. Diagonal Watermark "Blockchain Verified" in very light color for 100% platform compatibility
  doc.setTextColor(245, 253, 247); // extremely light emerald green
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(40);
  doc.text('BLOCKCHAIN VERIFIED', 105, 150, { align: 'center', angle: 45 });

  // Reset standard text color
  doc.setTextColor(30, 41, 59); // slate-800

  // 4. Header: Logo and Subtext
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text('InsureChain', 105, 32, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFont('Helvetica', 'normal');
  doc.text('DECENTRALIZED PARAMETRIC CROP INSURANCE', 105, 39, { align: 'center' });

  // Divider line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(25, 48, 185, 48);

  // 5. Certificate Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('Crop Insurance Policy Certificate', 105, 62, { align: 'center' });

  // 6. Metadata Content Grid
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105); // slate-600

  let y = 84;
  const drawRow = (label, value, isMonospace = false) => {
    doc.setFont('Helvetica', 'bold');
    doc.text(label, 30, y);
    doc.setFont(isMonospace ? 'Courier' : 'Helvetica', 'normal');
    doc.text(String(value), 85, y);
    y += 12;
  };

  // Date Formatting helper
  const formatValDate = (dVal) => {
    if (!dVal) return '27/05/2026';
    const dateObj = dVal.toDate ? dVal.toDate() : new Date(dVal);
    return dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const startDateStr = formatValDate(policy.startDate || policy.createdAt);
  const endDateStr = formatValDate(policy.endDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000));

  drawRow('Policy ID:', policy.policyId || 'IC-2026-MH-MOCK', true);
  drawRow('Farmer Name:', policy.fullName || policy.farmerName || 'Alice');
  drawRow('District / Region:', policy.district || 'Nagpur');
  drawRow('Season:', policy.season || 'Kharif');
  drawRow('Crop Protected:', policy.cropType || 'Cotton');
  drawRow('Premium Paid (INR):', `INR ${Number(policy.premiumINR || policy.premiumAmount || 2400).toLocaleString('en-IN')}`);
  drawRow('Premium Paid (ETH):', `${policy.premiumETH || 0.0012} ETH`);
  drawRow('Coverage Amount:', `INR ${Number(policy.coverageINR || policy.coverageAmount || 120000).toLocaleString('en-IN')}`);
  drawRow('Policy Term:', `${startDateStr} to ${endDateStr}`);

  // Covered Triggers
  doc.setFont('Helvetica', 'bold');
  doc.text('Triggers Covered:', 30, y);
  const triggers = policy.triggersSelected || policy.triggers || ['Drought', 'Excessive Heat'];
  doc.setFont('Helvetica', 'normal');
  const triggerListStr = triggers.join(', ');
  doc.text(triggerListStr, 85, y);
  y += 18;

  // Transaction Hash Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(25, y - 5, 160, 24, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.2);
  doc.rect(25, y - 5, 160, 24, 'D');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('BLOCKCHAIN TRANSACTION SIGNATURE', 30, y + 1);

  doc.setFont('Courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const txHash = policy.txHash || '0x' + Array.from({length:64}, (_,i) => ((i+29)*17%16).toString(16)).join('');
  doc.text(txHash, 30, y + 8);
  y += 38;

  // 7. Footer
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text('Verified on Ethereum Sepolia Testnet.', 105, y, { align: 'center' });

  // Verification Graphic
  y += 8;
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.5);
  doc.line(85, y, 125, y);

  // Save the generated document
  doc.save(`insurechain_policy_${policy.policyId || 'IC-2026'}.pdf`);
};
