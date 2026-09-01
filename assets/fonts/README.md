# Bundled fonts

**PatrickHand-Regular.ttf** — Patrick Hand by Patrick Wagesreiter, licensed under
the [SIL Open Font License 1.1](https://scripts.sil.org/OFL). Redistributed here
under that license. Used by the handwriting-style caption renderers.

The card and caption renderers otherwise pull their typeface from Google Fonts at
render time, named by `BRAND_FONT` in `config.env`. Swap in your own brand face by
setting `BRAND_FONT` (any Google Fonts family) or by editing the `@import` in
`templates/make-cards.js` and `templates/make-social-captions.js` to point at a
locally-hosted file.
