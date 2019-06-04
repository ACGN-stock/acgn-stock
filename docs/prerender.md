# Prerender

`acgn-stock` can use [prerender](https://github.com/prerender/prerender-node) to help its SEO process.

Since the setup process is a little bit complicated, we wrote down this how-to document to help those in need.

**This is not necessary**, you can just skip this if you won't develop anything about SEO.

## Setting Up a Prerender Server

To enable this functionality, you will need a **prerender server** to handle the request.

### Hosted Service

If you don't want to run your own prerender server, check out [PrerenderIO](https://prerender.io/) for their hosted service.

### Run Your Own Prerender Server

If you choose to run your own prerender server, you can use our [prerender-server](https://github.com/ACGN-stock/acgn-stock-prerender-server) project, or follow these steps to develop your server:

1. install [Chrome](https://www.google.com/chrome/)

   [(Guide for installing Chrome on a Ubuntu server)](https://askubuntu.com/a/79284)

2. create a new node project and install [prerender](https://github.com/prerender/prerender)

   ```sh
   npm install prerender --save
   ```

   **IMPORTANT NOTE: Don't try to install prerender server in your `acgn-stock` project!**

   We tried to integrate prerender into this project (see [#589](https://github.com/ACGN-stock/acgn-stock/pull/589), [#591](https://github.com/ACGN-stock/acgn-stock/pull/591)). Since then we encountered some serious issues which prevent `acgn-stock` from working, so we decided to remove it (see [#597](https://github.com/ACGN-stock/acgn-stock/pull/597)).

3. write `index.js`
   ```js
   const prerender = require('prerender');
   const prerenderServer = prerender({
     port: 3900,
     waitAfterLastRequest: 3000
   });
   prerenderServer.start();
   ```

   For the port, we use `3900` here. Feel free to switch to the other port if you want. Just make sure it's not being used.

   For the `waitAfterLastRequest`, we recommend `3000`ms here. [(Check the document about `waitAfterLastRequest`)](https://github.com/prerender/prerender#waitafterlastrequest)

4. start the server

   ```sh
   node index.js
   ```

After the server is started, you can connect to, for example, `http://localhost:3900/https://github.com/`, to see if it works.


## Setting Your `acgn-stock`

Update your prerender setting in [config.json](../config.json)

```json
"prerender": {
  "use": true,
  "url": "http://127.0.0.1:3900/"
}
```

`"use"` must be `true` if you want to use prerender.

`"url"` is the URL of the prerender server.

Now you can run your `acgn-stock`, and visit the following URL to see if it's working or not.

```
http://localhost:3000/company/1?_escaped_fragment_=
```
