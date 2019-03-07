# Prerender

We use [prerender](https://github.com/prerender/prerender-node) to do SEO.

But it's complicated to set, that's why we need this document.

## Get a prerender server

To use prerender, you need a prerender server to handle prerender request.

You can easily use https://prerender.io/ to be prerender server.

Or, you can run your own server as follow these step.

1. install [Chrome](https://www.google.com/chrome/)

   [(How to install Chrome on Ubuntu server)](https://askubuntu.com/a/79284)

2. create a new project, and install [prerender](https://github.com/prerender/prerender)
   ```sh
   npm install prerender --save
   ```
   **NOTE**: **Prerender server should run independently**, we don't recommend installing it in your `acgn-stock` project.

   we already try it and got much error, so we remove it from this project. [(see pull request)](https://github.com/mrbigmouth/acgn-stock/pull/597)

3. write `index.js`
   ```js
   const prerender = require('prerender');
   const prerenderServer = prerender({
     port: 3900,
     waitAfterLastRequest: 3000
   });
   prerenderServer.start();
   ```
   You can use other port, just make sure it's not be used.

   [(about waitAfterLastRequest)](https://github.com/prerender/prerender#waitafterlastrequest)

4. run it
   ```sh
   node index.js
   ```

Try to see your prerender server is working or not.
```
http://localhost:3900/https://github.com/
```


## Setting your acgn-stock

Write your prerender setting in [config.json](../config.json)

```json
"prerender": {
  "use": true,
  "url": "http://127.0.0.1:3900/"
}
```

`"use"` is prerender switch, it should be `true` if you want to use prerender.

`"url"` is prerender server's URL.

Now you can run your acgn-stcok, and try to see prerender is working or not.
```
http://localhost:3900/company/1?_escaped_fragment_=
```
