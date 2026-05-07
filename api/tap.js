import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { decryptPicc, calculateCmacBuffer } = require('node-sdm');

const keyHex = (process.env.NTAG_KEY || '').trim();

export default async function handler(req, res) {
  try {
    const rawParams = new URLSearchParams(req.url.split('?')[1] || '');
    const allPiccData = rawParams.getAll('picc_data');
    const allCmac     = rawParams.getAll('cmac');
    const picc_data   = allPiccData[allPiccData.length - 1];
    const cmac        = allCmac[allCmac.length - 1];

    if (!picc_data || !cmac) {
      return res.redirect('/?valid=false');
    }

    const piccBuffer = Buffer.from(picc_data, 'hex');
    const cmacBuffer = Buffer.from(cmac, 'hex');
    const keyBuffer  = Buffer.from(keyHex, 'hex');

    // Decrypt the PICC data – same as the test server
    const decrypted = decryptPicc(piccBuffer, keyBuffer);
    const uidBuffer = Buffer.from(decrypted.uid, 'hex');
    const plainData = Buffer.concat([uidBuffer, decrypted.cnt]);

    // Re‑compute the CMAC over the plain data
    const expectedCmac = calculateCmacBuffer(plainData, keyBuffer);

    if (expectedCmac.equals(cmacBuffer)) {
      const counter = decrypted.cnt.readUIntLE(0, 3);
      return res.redirect(`/?uid=${decrypted.uid}&counter=${counter}&valid=true`);
    } else {
      return res.redirect('/?valid=false');
    }
  } catch (error) {
    // Any error → show it as JSON so we can debug if needed
    return res.status(200).json({ error: error.message });
  }
}