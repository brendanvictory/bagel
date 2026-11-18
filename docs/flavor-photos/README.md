# Flavor photos — evened out

The original flavor photos (on each `bagel_flavor` entry in Shopify) frame the bagel differently: the bagel fills
64 % (Plain) to 92 % (Garlic) of its photo, and three photos are on a wider canvas. In the flavor cards that made
some bagels look much smaller than others.

The evened-out versions put every bagel at the same width (88 % of a square frame), centred, on pure white.

- `even-1000/` — 1000 px masters made by `even.py` from the originals.
- Theme images used on the site: `assets/nybe-flavor-<handle>.webp` (600 px) and `-thumb.webp` (160 px).
- Switch: **Theme settings → Bagel flavor photos → Use evened-out flavor photos**. Off = the original photos below.
  `snippets/nybe-flavor-src.liquid` picks the photo; a flavor without an evened-out photo uses its original.

## Original photos (unchanged, still on the flavor entries in Shopify)

| Flavor | Original file |
| --- | --- |
| Plain | https://nybagelexpress.com/cdn/shop/files/download_9c6488a9-4d81-4787-8b9f-42c120b62950.png |
| Everything | https://nybagelexpress.com/cdn/shop/files/download_08c27631-4922-4167-91cf-856614a4e0d5.png |
| Sesame | https://nybagelexpress.com/cdn/shop/files/download_c9a03436-29c0-46c3-b3bb-78887342726a.png |
| Poppy | https://nybagelexpress.com/cdn/shop/files/download_1b9942dc-2b06-40e0-92df-1294945ea507.png |
| Onion | https://nybagelexpress.com/cdn/shop/files/download_8547d151-d0c8-41d9-a837-60c707a43b1d.png |
| Garlic | https://nybagelexpress.com/cdn/shop/files/download_06b6789b-1a89-47ce-a2f6-736739d8c1ff.png |
| Cinnamon Raisin | https://nybagelexpress.com/cdn/shop/files/download_01e79ffc-65c9-4945-b9a5-56ef752658e4.png |
| Egg | https://nybagelexpress.com/cdn/shop/files/download_0fe2ab6b-4c6b-4a0d-b46e-fc42caa2250f.png |
| Whole Wheat | https://nybagelexpress.com/cdn/shop/files/download.png |
| Pumpernickel | https://nybagelexpress.com/cdn/shop/files/download_6004159a-58c9-4132-8ce5-fde6957d805b.png |

To redo them (e.g. a new flavor): download the originals as `<handle>.png` into a folder, then
`python3 even.py <that folder> <out folder>` and make the 600/160 px theme images from the output.
