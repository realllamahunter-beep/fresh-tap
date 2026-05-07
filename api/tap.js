import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { verify } = require('node-sdm');

const keyHex = (process.env.NTAG_KEY || '').trim();

export default async function handler(req, res) {
  try {
    const rawParams = new URLSearchParams(req.url.split('?')[1] || '');
    const allPiccData = rawParams.getAll('picc_data');
    const allCmac = rawParams.getAll('cmac');
    const picc_data = allPiccData[allPiccData.length - 1];
    const cmac = allCmac[allCmac.length - 1];

    if (!picc_data || !cmac) {
      return res.redirect('/?valid=false');
    }

    const result = verify(picc_data, cmac, keyHex, { encoding: 'hex' });

    if (result.valid) {
      return res.redirect(`/?uid=${result.uid}&counter=${result.cnt}&valid=true`);
    } else {
      return res.redirect('/?valid=false');
    }
  } catch (error) {
    // If there's a code error, we'll see it here as a JSON response
    return res.status(200).json({ error: error.message });
  }
}