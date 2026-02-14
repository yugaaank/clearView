
const { createCA, createCert } = require('mkcert');
const fs = require('fs');
const os = require('os');

function getLocalIp() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

const lanIp = getLocalIp();
console.log(`📡 Detected LAN IP: ${lanIp}`);
console.log('🔒 Generating SSL certificates...');

async function generate() {
    try {
        const ca = await createCA({
            organization: 'Local Dev CA',
            countryCode: 'US',
            state: 'Dev',
            locality: 'Local',
            validity: 365
        });

        const cert = await createCert({
            domains: ['localhost', '127.0.0.1', lanIp],
            validity: 365,
            ca: ca,
            organization: 'Local Dev CA',
            locality: 'Local',
            state: 'Dev',
            countryCode: 'US'
        });

        fs.writeFileSync('localhost-key.pem', cert.key);
        fs.writeFileSync('localhost.pem', cert.cert);

        console.log('\n✅ Certificates generated successfully!');
        console.log(`\n📲 To test on mobile:`);
        console.log(`1. Ensure your phone is on the same Wi-Fi.`);
        console.log(`2. Run 'npm run dev:https'`);
        console.log(`3. Open https://${lanIp}:3001 on your phone.`);
        console.log(`   (You MUST accept the "Not Secure" warning to proceed)\n`);

    } catch (err) {
        console.error('❌ Error generating certificates:', err);
        process.exit(1);
    }
}

generate();
