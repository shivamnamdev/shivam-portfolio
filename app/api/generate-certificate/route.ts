// app/api/generate-certificate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function POST(req: NextRequest) {
  try {
    const { studentName, courseTitle } = await req.json();

    if (!studentName || !courseTitle) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // Generate a unique Certificate ID (e.g., SN-PY-2026-A1B2)
    const uniqueId = `SN-PY-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // 1. Create a new PDF Document
    const pdfDoc = await PDFDocument.create();
    
    // A4 Landscape dimensions
    const page = pdfDoc.addPage([842, 595]);

    // Embed standard fonts
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

    // 2. Draw Background (Warm Ivory)
    page.drawRectangle({
      x: 0, y: 0, width: 842, height: 595,
      color: rgb(253/255, 252/255, 248/255), // #fdfcf8
    });

    // 3. Draw Outer Border (Dark Espresso)
    page.drawRectangle({
      x: 20, y: 20, width: 802, height: 555,
      borderColor: rgb(28/255, 25/255, 23/255), // #1c1917
      borderWidth: 4,
    });

    // 4. Draw Inner Thin Border (Amber)
    page.drawRectangle({
      x: 30, y: 30, width: 782, height: 535,
      borderColor: rgb(217/255, 119/255, 6/255), // #d97706
      borderWidth: 1,
    });

    // --- TEXT ELEMENTS ---

    // Academy Name
    page.drawText('SHIVAM ACADEMY', {
      x: 310, y: 480, size: 24, font: helveticaBold, color: rgb(28/255, 25/255, 23/255),
    });

    // Main Title
    page.drawText('CERTIFICATE OF COMPLETION', {
      x: 170, y: 420, size: 36, font: helveticaBold, color: rgb(217/255, 119/255, 6/255),
    });

    // Subtext
    page.drawText('This is proudly presented to', {
      x: 320, y: 360, size: 16, font: timesItalic, color: rgb(100/255, 100/255, 100/255),
    });

    // Student Name (Centered dynamically)
    const nameWidth = helveticaBold.widthOfTextAtSize(studentName, 42);
    page.drawText(studentName, {
      x: (842 - nameWidth) / 2, y: 300, size: 42, font: helveticaBold, color: rgb(28/255, 25/255, 23/255),
    });

    // Course Text
    const courseText = `For successfully completing the comprehensive program:`;
    page.drawText(courseText, {
      x: 250, y: 240, size: 14, font: helvetica, color: rgb(100/255, 100/255, 100/255),
    });

    const courseWidth = helveticaBold.widthOfTextAtSize(courseTitle, 20);
    page.drawText(courseTitle, {
      x: (842 - courseWidth) / 2, y: 200, size: 20, font: helveticaBold, color: rgb(217/255, 119/255, 6/255),
    });

    // Signatures and Date lines
    page.drawLine({
      start: { x: 150, y: 120 }, end: { x: 350, y: 120 },
      thickness: 1, color: rgb(28/255, 25/255, 23/255)
    });
    page.drawText('Shivam Namdev', { x: 200, y: 125, size: 14, font: helveticaBold, color: rgb(28/255, 25/255, 23/255) });
    page.drawText('Lead Instructor', { x: 215, y: 100, size: 12, font: helvetica, color: rgb(100/255, 100/255, 100/255) });

    page.drawLine({
      start: { x: 492, y: 120 }, end: { x: 692, y: 120 },
      thickness: 1, color: rgb(28/255, 25/255, 23/255)
    });
    page.drawText(dateStr, { x: 550, y: 125, size: 14, font: helvetica, color: rgb(28/255, 25/255, 23/255) });
    page.drawText('Date of Issue', { x: 555, y: 100, size: 12, font: helvetica, color: rgb(100/255, 100/255, 100/255) });

    // Certificate ID at the bottom
    page.drawText(`Certificate ID: ${uniqueId} | shivamnamdev.com`, {
      x: 300, y: 50, size: 10, font: helvetica, color: rgb(150/255, 150/255, 150/255),
    });

    // 5. Serialize and Send the PDF
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        // This tells the browser to download it automatically!
        "Content-Disposition": `attachment; filename="ShivamAcademy_Certificate_${studentName.replace(/\s+/g, '_')}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Certificate Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate certificate" }, { status: 500 });
  }
}