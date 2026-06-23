import { PDFDocument, degrees } from 'pdf-lib';

const SIZE_DIMENSIONS = {
  small: 120,
  medium: 180,
  large: 240,
};

const fetchImageBytes = async (url) => {
  if (!url) throw new Error('Watermark logo URL is required');
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) {
    throw new Error(`Unable to load watermark image: ${response.statusText}`);
  }
  return await response.arrayBuffer();
};

const embedLogoImage = async (pdfDoc, logoUrl, imageBytes) => {
  const urlLower = logoUrl.split('?')[0].toLowerCase();
  if (urlLower.endsWith('.png')) {
    return await pdfDoc.embedPng(imageBytes);
  }
  if (urlLower.endsWith('.jpg') || urlLower.endsWith('.jpeg')) {
    return await pdfDoc.embedJpg(imageBytes);
  }
  // Fall back to PNG/JPG embedding attempts for non-standard extensions
  try {
    return await pdfDoc.embedPng(imageBytes);
  } catch {
    return await pdfDoc.embedJpg(imageBytes);
  }
};

const createWatermarkPosition = (pageWidth, pageHeight, imageWidth, imageHeight, position) => {
  const centeredX = (pageWidth - imageWidth) / 2;
  const centeredY = (pageHeight - imageHeight) / 2;

  switch (position) {
    case 'top-center':
      return { x: centeredX, y: pageHeight - imageHeight - 80 };
    case 'bottom-center':
      return { x: centeredX, y: 80 };
    case 'center':
    default:
      return { x: centeredX, y: centeredY };
  }
};

export const applyWatermarkToPdfBytes = async (pdfBytes, wmConfig = {}) => {
  if (!wmConfig?.enabled || !wmConfig?.logoUrl) {
    return pdfBytes;
  }

  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const logoBytes = await fetchImageBytes(wmConfig.logoUrl);
    const embeddedImage = await embedLogoImage(pdfDoc, wmConfig.logoUrl, logoBytes);

    const imageDims = embeddedImage.scale(1);
    const pages = pdfDoc.getPages();
    const maxDim = SIZE_DIMENSIONS[wmConfig.size] || SIZE_DIMENSIONS.medium;

    pages.forEach((page) => {
      const { width, height } = page.getSize();
      const scale = Math.min(maxDim / imageDims.width, maxDim / imageDims.height, 1);
      const drawWidth = imageDims.width * scale;
      const drawHeight = imageDims.height * scale;
      const { x, y } = createWatermarkPosition(width, height, drawWidth, drawHeight, wmConfig.position);

      page.drawImage(embeddedImage, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
        opacity: typeof wmConfig.opacity === 'number' ? wmConfig.opacity : 0.07,
        rotate: wmConfig.position === 'diagonal' ? degrees(-35) : undefined,
      });
    });

    return await pdfDoc.save();
  } catch (error) {
    console.warn('[PDF Watermark] Failed to apply page-level watermark:', error.message);
    return pdfBytes;
  }
};

export const createPdfBlob = (pdfBytes) => {
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

export const savePdfBytes = (pdfBytes, fileName) => {
  const blob = createPdfBlob(pdfBytes);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

export const createPdfUrl = (pdfBytes) => {
  const blob = createPdfBlob(pdfBytes);
  return URL.createObjectURL(blob);
};
