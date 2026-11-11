export default async function handler(req, res) {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send('URL target wajib diisi.');
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': new URL(targetUrl).origin,
      },
    });

    const contentType = response.headers.get('content-type') || 'text/html';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Jika konten berupa HTML, kita rewrite link-nya agar tetap lewat proxy
    if (contentType.includes('text/html')) {
      let html = await response.text();
      const targetOrigin = new URL(targetUrl).origin;

      // Otomatis arahkan semua link dan aset internal agar masuk ke proxy gateway kita
      html = html.replace(/href="\/([^"]*)"/g, `href="/api/proxy?url=${targetOrigin}/$1"`);
      html = html.replace(/src="\/([^"]*)"/g, `src="/api/proxy?url=${targetOrigin}/$1"`);
      
      html = html.replace(new RegExp(`href="${targetOrigin}([^"]*)"`, 'g'), `href="/api/proxy?url=${targetOrigin}$1"`);
      html = html.replace(new RegExp(`src="${targetOrigin}([^"]*)"`, 'g'), `src="/api/proxy?url=${targetOrigin}$1"`);

      return res.status(response.status).send(html);
    }

    // Untuk file gambar, CSS, atau JS, teruskan mentah-mentah
    const buffer = await response.arrayBuffer();
    return res.status(response.status).send(Buffer.from(buffer));

  } catch (error) {
    return res.status(500).send('Gagal melewati proxy gateway: ' + error.message);
  }
}
