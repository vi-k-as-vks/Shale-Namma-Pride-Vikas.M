const https = require('https');
https.get("https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/South_Indian_Thali.jpg/800px-South_Indian_Thali.jpg", res => console.log('1:', res.statusCode));
https.get("https://upload.wikimedia.org/wikipedia/commons/8/8b/Lemon_rice_2.jpg", res => console.log('2:', res.statusCode));
https.get("https://upload.wikimedia.org/wikipedia/commons/7/77/Ragi_Mudde_and_Soppu_Saaru.jpg", res => console.log('3:', res.statusCode));
https.get("https://upload.wikimedia.org/wikipedia/commons/3/30/Bisi_Bele_Bath.jpg", res => console.log('4:', res.statusCode));
