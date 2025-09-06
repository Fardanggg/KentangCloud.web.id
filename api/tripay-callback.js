const crypto = require('crypto');

module.exports = async (req, res) => {
    // Pastikan request method adalah POST
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const PRIVATE_KEY = process.env.TRIPAY_PRIVATE_KEY;
    const json = JSON.stringify(req.body);
    const signature = crypto.createHmac('sha256', PRIVATE_KEY).update(json).digest('hex');

    if (signature !== req.headers['x-callback-signature']) {
        res.status(400).send('Invalid Signature');
        return;
    }

    if (req.body.event === 'payment_status') {
        const { merchant_ref, status } = req.body.data;
        
        if (status === 'PAID') {
            // Logika untuk mengaktifkan hosting
            // 1. Dapatkan nama subdomain dari merchant_ref.
            // 2. Akses penyimpanan file yang terhubung (misal: Netlify Large Media, Vercel Blob, atau S3).
            // 3. Ekstrak file zip ke lokasi yang bisa diakses publik.

            const subdomain = merchant_ref.split('-')[1]; // Ambil subdomain dari merchant_ref
            console.log(`Pembayaran berhasil untuk subdomain: ${subdomain}`);

            // Ini adalah tempat Anda akan memicu proses deployment/ekstraksi
            // ke direktori hosting, yang mana memerlukan layanan pihak ketiga.

            res.status(200).send('OK');
        } else {
            console.log(`Status pembayaran: ${status} untuk ${merchant_ref}`);
            res.status(200).send('OK');
        }
    }
};