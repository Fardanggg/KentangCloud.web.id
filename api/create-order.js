const fetch = require('node-fetch');
const { IncomingForm } = require('formidable');
const crypto = require('crypto');

// Konfigurasi Vercel: Matikan body parser bawaan
export const config = {
  api: {
    bodyParser: false,
  },
};

// URL endpoint API Tripay Sandbox yang benar
const TRIPAY_API_URL = 'https://tripay-sandbox.co.id/api/transaction/create';

export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    // Pastikan request body adalah multipart/form-data
    if (!req.headers['content-type']?.includes('multipart/form-data')) {
        return res.status(400).json({ success: false, message: 'Invalid Content-Type. Must be multipart/form-data.' });
    }

    try {
        const formData = await new Promise((resolve, reject) => {
            const form = new IncomingForm();
            form.parse(req, (err, fields, files) => {
                if (err) {
                    return reject(new Error('Failed to parse form data.'));
                }
                resolve({ fields, files });
            });
        });

        // Menggunakan 'fields' dan 'files' yang sudah terurai
        const subdomain = formData.fields.subdomain ? formData.fields.subdomain[0] : null;
        const fileZip = formData.files.fileZip ? formData.files.fileZip[0] : null;

        if (!subdomain) {
            return res.status(400).json({ success: false, message: 'Subdomain is required.' });
        }
        
        // Mengambil kredensial dari Environment Variables
        const API_KEY = process.env.TRIPAY_API_KEY;
        const PRIVATE_KEY = process.env.TRIPAY_PRIVATE_KEY;
        const MERCHANT_CODE = process.env.TRIPAY_MERCHANT_CODE;

        if (!API_KEY || !PRIVATE_KEY || !MERCHANT_CODE) {
            return res.status(500).json({ success: false, message: 'Tripay credentials are not set.' });
        }

        const amount = 50000;
        const merchantRef = `kentangcloud-${subdomain}-${Date.now()}`;
        const signature = crypto.createHmac('sha256', PRIVATE_KEY).update(`${MERCHANT_CODE}${amount}${merchantRef}`).digest('hex');

        const payload = {
            'method'         : 'BCAVA',
            'merchant_ref'   : merchantRef,
            'amount'         : amount,
            'customer_name'  : subdomain,
            'customer_email' : `${subdomain}@kentangcloud.site`,
            'order_items'    : [
                {
                    'sku'      : 'host-static',
                    'name'     : `Hosting Statis ${subdomain}`,
                    'price'    : amount,
                    'quantity' : 1
                }
            ],
            'return_url'   : `http://${subdomain}.kentangcloud.site`,
            'expired_time' : (Date.now() / 1000) + (24 * 60 * 60),
            'signature'    : signature
        };

        const tripayResponse = await fetch(TRIPAY_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const tripayResult = await tripayResponse.json();

        if (tripayResult.success) {
            res.status(200).json({ success: true, payment_url: tripayResult.data.payment_url });
        } else {
            res.status(400).json({ success: false, message: tripayResult.message });
        }

    } catch (e) {
        console.error('API Error:', e);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};
