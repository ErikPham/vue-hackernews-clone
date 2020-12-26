const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const resolve = file => path.resolve(__dirname, file);
const {createBundleRenderer} = require('./vue-server-renderer');

const app = express();
const jsonParser = bodyParser.json()
const isProd = process.env.NODE_ENV === 'production'

function createRenderer(bundle, options) {
  return createBundleRenderer(bundle, Object.assign(options, {
    basedir: resolve('./dist'),
    runInNewContext: false,
  }));
}

let renderer;
let readyPromise;
const templatePath = resolve('./src/index.template.html');

if (isProd) {
  const template = fs.readFileSync(templatePath, 'utf-8');
  const bundle = require('./dist/vue-ssr-server-bundle.json');
  const clientManifest = require('./dist/vue-ssr-client-manifest.json');
  renderer = createRenderer(bundle, {
    template,
    clientManifest,
  });
} else {
  readyPromise = require('./build/setup-dev-server')(
      app,
      templatePath,
      (bundle, options) => {
        renderer = createRenderer(bundle, options);
      },
  );
}

function render(req, res) {
  const s = !isProd && Date.now()
  renderer.renderToString(req.body, (err, html) => {
    !isProd && console.log(`Render time: ${Date.now() - s}ms`)
    res.send(html);
  });
}

app.post('*', jsonParser, isProd ? render : (req, res) => {
  readyPromise.then(() => render(req, res));
});

const port = 8888;
app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});
