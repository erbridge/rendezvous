# Midnight Rendezvous

This is a game originally made for Ludum Dare 34 in collaboration with [Maike Vierkant](http://www.maike-vierkant.com/). The themes were **Growing** and **Two Button Controls**. This game focuses on **Growing**, but also covers **Two Button Controls** by some definitions.


## Install

Either play [online](http://erbridge.co.uk/rendezvous/) or download the appropriate [distribution for your system](https://github.com/erbridge/rendezvous/releases).


## Develop

This game can be run directly in the browser, or run as a standalone executable using [Electron](http://electron.atom.io).


### Web

Since the site is hosted on GitHub Pages (hence `gh-pages` being the main branch), I use Jekyll when developing it. Any webserver would do, however.


#### Install

```
$ bundle install --path="./bundle"
```


#### Run

```
$ bundle exec jekyll serve --watch
```


### Electron

#### Install

```
$ npm install
```


#### Run

```
$ npm start
```


#### Build

```
$ npm run build
```


#### Distribute

```
$ npm run dist
```


## Assets

Sounds were retrieved from freesound.org and are licenced under CC0.
